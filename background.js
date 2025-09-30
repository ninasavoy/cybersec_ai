// background.js (versão ajustada)
console.log("Extensão Guarda de Privacidade carregada!");

// Estado global
let stats = {
  score: 0,
  cookiesBlocked: 0,
  connectionsBlocked: 0,
  fingerprintsBlocked: 0,
  hijacksDetected: 0,
  domains: {},
  logs: []
};

let settings = {
  blockThirdParty: true,
  blockFingerprint: true,
  blockHijack: true,
  enableNotifications: true,
  whitelist: []
};

// Lista de rastreadores conhecidos
const trackerDomains = [
  'google-analytics.com',
  'doubleclick.net',
  'facebook.com',
  'google.com/analytics',
  'scorecardresearch.com',
  'adservice.google',
  'googlesyndication.com',
  'amazon-adsystem.com',
  'adnxs.com',
  'rubiconproject.com',
  'facebook.net'
];

// --- Persistência e debounce de gravação ---
// Evita chamadas excessivas
let saveTimeout = null;
function saveStats(debounce = true) {
  if (saveTimeout) clearTimeout(saveTimeout);
  if (debounce) {
    saveTimeout = setTimeout(() => {
      browser.storage.local.set({ stats }).catch(console.error);
      saveTimeout = null;
    }, 1000);
  } else {
    browser.storage.local.set({ stats }).catch(console.error);
  }
}

// Carregar configurações ao iniciar
browser.storage.local.get(['settings', 'stats']).then((result) => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
  }
  if (result.stats) {
    stats = { ...stats, ...result.stats };
  }
}).catch(console.error);

// --- Utilitários ---
// Normaliza domínio
function normalizeDomain(d) {
  if (!d) return '';
  return d.replace(/^\./, '').split(':')[0].toLowerCase();
}

// Verifica whitelist com comparação exata ou subdomínio
function isWhitelisted(domain) {
  const dom = normalizeDomain(domain);
  return settings.whitelist.some(whitelisted => {
    const w = normalizeDomain(whitelisted);
    return dom === w || dom.endsWith('.' + w);
  });
}

function isTracker(hostname) {
  const host = hostname.toLowerCase();
  return trackerDomains.some(tracker => host === tracker || host.endsWith('.' + tracker) || host.includes(tracker));
}

function updateDomainCount(domain) {
  const d = normalizeDomain(domain);
  if (!stats.domains[d]) stats.domains[d] = 0;
  stats.domains[d]++;
}

function addLog(message, type = 'info') {
  const time = new Date().toLocaleString('pt-BR');
  stats.logs = stats.logs || [];
  stats.logs.push({ time, message, type });
  if (stats.logs.length > 200) stats.logs = stats.logs.slice(-200);
  saveStats();
}

function notifyPopup() {
  // tenta notificar popup (caso esteja aberto)
  browser.runtime.sendMessage({ action: 'statsUpdated' }).catch(() => {});
}

function showNotification(title, message) {
  if (!settings.enableNotifications) return;
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('icon.png'),
    title,
    message
  }).catch(() => {
    // fallback console
    console.log(`${title}: ${message}`);
  });
}

// --- Bloqueio de rastreadores (webRequest) ---
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const url = new URL(details.url);
      const hostname = url.hostname;

      if (isWhitelisted(hostname)) return {};

      if (isTracker(hostname)) {
        console.log("Bloqueando rastreador:", hostname);

        updateDomainCount(hostname);
        stats.connectionsBlocked++;
        stats.score += 2;

        addLog(`Rastreador bloqueado: ${hostname}`, 'danger');

        if (settings.enableNotifications) {
          showNotification("Rastreador Bloqueado", `${hostname} foi bloqueado`);
        }

        saveStats();
        notifyPopup();

        // O listener foi registrado com "blocking", então cancelamos a requisição
        return { cancel: true };
      }

      // Log de conexões suspeitas para scripts/XHR
      if (details.type === 'script' || details.type === 'xmlhttprequest') {
        updateDomainCount(hostname);
        addLog(`Conexão detectada: ${hostname}`, 'info');
      }
    } catch (err) {
      console.error("Erro no onBeforeRequest:", err);
    }

    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// --- Detecção e bloqueio de cookies / sincronismo ---
// Usamos um único listener para cookies para evitar duplicação
let cookieMap = {}; // nome -> Set(domínios)

browser.cookies.onChanged.addListener(async (changeInfo) => {
  try {
    const cookie = changeInfo.cookie;
    if (!cookie) return;

    const cookieDomain = normalizeDomain(cookie.domain);

    // Atualiza map de sincronismo
    if (!cookieMap[cookie.name]) cookieMap[cookie.name] = new Set();
    cookieMap[cookie.name].add(cookieDomain);
    if (cookieMap[cookie.name].size > 1) {
      console.warn("Sincronismo de cookie detectado:", cookie.name);
      stats.score += 2;
      addLog(`Sincronismo detectado: ${cookie.name}`, 'warning');
      notifyPopup();
    }

    // Se o cookie foi removido, não precisamos mais processar bloqueio
    if (changeInfo.removed) return;

    // Se domínio está na whitelist, ignora
    if (isWhitelisted(cookieDomain)) return;

    // Tenta identificar domain da aba ativa para checar 3rd-party
    let tabDomains = [];
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length) {
        const tUrl = tabs[0].url || '';
        if (tUrl) tabDomains.push(normalizeDomain(new URL(tUrl).hostname));
      }
    } catch (e) {
      // não crítico
    }

    const isThirdParty = tabDomains.length === 0
      ? false // sem aba ativa, não tomamos ação agressiva
      : !tabDomains.some(td => td === cookieDomain || td.endsWith('.' + cookieDomain) || cookieDomain.endsWith('.' + td));

    if (isThirdParty) {
      console.log("Cookie de terceira parte detectado:", cookie.name, "de", cookie.domain);

      if (settings.blockThirdParty) {
        // Construir URL para remoção - usar domínio sem ponto inicial
        const proto = cookie.secure ? 'https' : 'http';
        const cookieHost = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
        const cookieUrl = `${proto}://${cookieHost}${cookie.path || '/'}`;

        try {
          await browser.cookies.remove({
            url: cookieUrl,
            name: cookie.name
          });
          stats.cookiesBlocked++;
          stats.score += 1;
          updateDomainCount(cookie.domain);
          addLog(`Cookie de terceiro bloqueado: ${cookie.name} (${cookie.domain})`, 'warning');

          saveStats();
          notifyPopup();

          if (settings.enableNotifications) {
            showNotification("Cookie Bloqueado", `${cookie.name} removido de ${cookie.domain}`);
          }
        } catch (err) {
          console.error("Erro ao remover cookie (tentativa segura):", err);
          // Não falha a extensão - apenas registra
          addLog(`Falha ao remover cookie: ${cookie.name} (${cookie.domain})`, 'error');
        }
      } else {
        // não bloqueando, mas contabiliza score leve
        stats.score += 0.5;
        saveStats();
      }
    }
  } catch (err) {
    console.error("Erro no cookies.onChanged:", err);
  }
});

// --- Mensagens vindas do content script / popup ---
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'fingerprintDetected':
          if (settings.blockFingerprint) {
            stats.fingerprintsBlocked++;
            stats.score += 3;
            addLog('Tentativa de fingerprinting bloqueada', 'danger');

            if (settings.enableNotifications) {
              showNotification("Fingerprinting Bloqueado", "Uma tentativa de impressão digital foi bloqueada");
            }

            saveStats();
            notifyPopup();
            sendResponse({ blocked: true });
          } else {
            sendResponse({ blocked: false });
          }
          break;

        case 'hijackDetected':
          if (settings.blockHijack) {
            stats.hijacksDetected++;
            stats.score += 5;
            addLog(`Tentativa de hijacking bloqueada: ${message.type}`, 'danger');

            if (settings.enableNotifications) {
              showNotification("Hijacking Bloqueado!", `Tentativa de ${message.type} detectada`);
            }

            saveStats();
            notifyPopup();
            sendResponse({ blocked: true });
          } else {
            sendResponse({ blocked: false });
          }
          break;

        case 'getStats':
          sendResponse({ stats });
          break;

        case 'clearStats':
          stats = {
            score: 0,
            cookiesBlocked: 0,
            connectionsBlocked: 0,
            fingerprintsBlocked: 0,
            hijacksDetected: 0,
            domains: {},
            logs: []
          };
          saveStats(false);
          sendResponse({ success: true });
          break;

        case 'resetScore':
          stats.score = 0;
          saveStats(false);
          sendResponse({ success: true });
          break;

        case 'updateSettings':
          settings = message.settings || settings;
          browser.storage.local.set({ settings }).catch(console.error);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (err) {
      console.error("Erro no onMessage handler:", err);
      sendResponse({ error: String(err) });
    }
  })();

  // Indica que vamos responder de forma assíncrona
  return true;
});

// --- Atualizar score por aba ao completar carregamento ---
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url && !tab.url.startsWith('about:')) {
    try {
      const cookies = await browser.cookies.getAll({ url: tab.url }).catch(() => []);
      const domainPrincipal = new URL(tab.url).hostname;
      let thirdPartyCookies = 0;
      cookies.forEach(c => {
        const cookieDomain = normalizeDomain(c.domain);
        const dp = normalizeDomain(domainPrincipal);
        if (!(cookieDomain === dp || cookieDomain.endsWith('.' + dp) || dp.endsWith('.' + cookieDomain))) {
          thirdPartyCookies++;
        }
      });

      if (thirdPartyCookies > 0) {
        addLog(`${thirdPartyCookies} cookies de terceiros detectados em ${domainPrincipal}`, 'info');
      }
      // ajustar score por página com base no número de third party cookies
    } catch (err) {
      console.error("Erro ao atualizar abas:", err);
    }
  }
});
