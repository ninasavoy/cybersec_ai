console.log("Extensão AntiRastreamento (C) carregada!");

let scorePrivacidade = 0;

// Detecta conexões de terceiros
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log("Conexão detectada:", details.url);
    atualizarScore("Conexão de terceiro", 1);
  },
  { urls: ["<all_urls>"] }
);

// Classifica cookies (1ª e 3ª parte)
async function classificarCookies(tab) {
  let cookies = await browser.cookies.getAll({ url: tab.url });
  let dominioPrincipal = new URL(tab.url).hostname;

  cookies.forEach(c => {
    if (c.domain.includes(dominioPrincipal)) {
      console.log("Cookie de primeira parte:", c.name);
    } else {
      console.log("Cookie de terceira parte:", c.name);
      atualizarScore("Cookie de 3ª parte", 1);
    }
  });
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    classificarCookies(tab);
  }
});

// Detecta sincronismo de cookies
let mapaCookies = {};
browser.cookies.onChanged.addListener((changeInfo) => {
  let cookie = changeInfo.cookie;
  if (!mapaCookies[cookie.name]) {
    mapaCookies[cookie.name] = new Set();
  }
  mapaCookies[cookie.name].add(cookie.domain);

  if (mapaCookies[cookie.name].size > 1) {
    console.warn("Sincronismo de cookie detectado:", cookie.name);
    atualizarScore("Sincronismo de cookie", 2);
  }
});

// Função para atualizar score
function atualizarScore(evento, peso) {
  scorePrivacidade += peso;
  console.log("Evento:", evento, "| Score atual:", scorePrivacidade);
}