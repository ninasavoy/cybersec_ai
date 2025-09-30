// popup.js (versão ajustada)

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

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadStats();
  setupEventListeners();
  updateUI();
  startAutoRefresh();
});

// === CONFIGURAÇÕES ===
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(["settings"]);
    if (result.settings) {
      settings = { ...settings, ...result.settings };
    }
    applySettings();
  } catch (err) {
    console.error("Erro ao carregar configurações:", err);
  }
}

async function saveSettings() {
  try {
    await browser.storage.local.set({ settings });
    await browser.runtime.sendMessage({
      action: "updateSettings",
      settings
    }).catch(() => {});
  } catch (err) {
    console.error("Erro ao salvar configurações:", err);
  }
}

function applySettings() {
  document.getElementById("blockThirdParty").checked = settings.blockThirdParty;
  document.getElementById("blockFingerprint").checked = settings.blockFingerprint;
  document.getElementById("blockHijack").checked = settings.blockHijack;
  document.getElementById("enableNotifications").checked = settings.enableNotifications;
  updateWhitelistUI();
}

// === ESTATÍSTICAS ===
async function loadStats() {
  try {
    const response = await browser.runtime.sendMessage({ action: "getStats" }).catch(() => null);
    if (response && response.stats) stats = response.stats;
  } catch (err) {
    console.error("Erro ao carregar stats:", err);
  }
}

// === EVENTOS ===
function setupEventListeners() {
  document.getElementById("blockThirdParty").addEventListener("change", (e) => {
    settings.blockThirdParty = e.target.checked;
    saveSettings();
    addLog("Bloqueio de cookies de terceiros " + (e.target.checked ? "ativado" : "desativado"), "success");
  });

  document.getElementById("blockFingerprint").addEventListener("change", (e) => {
    settings.blockFingerprint = e.target.checked;
    saveSettings();
    addLog("Proteção anti-fingerprint " + (e.target.checked ? "ativada" : "desativada"), "success");
  });

  document.getElementById("blockHijack").addEventListener("change", (e) => {
    settings.blockHijack = e.target.checked;
    saveSettings();
    addLog("Proteção anti-hijacking " + (e.target.checked ? "ativada" : "desativada"), "success");
  });

  document.getElementById("enableNotifications").addEventListener("change", (e) => {
    settings.enableNotifications = e.target.checked;
    saveSettings();
  });

  // Whitelist
  document.getElementById("addWhitelist").addEventListener("click", addToWhitelist);
  document.getElementById("whitelistInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addToWhitelist();
  });

  // Botões de ação
  document.getElementById("exportData").addEventListener("click", exportReport);
  document.getElementById("clearData").addEventListener("click", clearAllData);
  document.getElementById("resetScore").addEventListener("click", resetScore);
}

// === WHITELIST ===
function addToWhitelist() {
  const input = document.getElementById("whitelistInput");
  const domain = input.value.trim().toLowerCase();

  if (domain && !settings.whitelist.includes(domain)) {
    settings.whitelist.push(domain);
    saveSettings();
    updateWhitelistUI();
    addLog(`Domínio ${domain} adicionado à whitelist`, "success");
    input.value = "";
  }
}

function removeFromWhitelist(domain) {
  settings.whitelist = settings.whitelist.filter((d) => d !== domain);
  saveSettings();
  updateWhitelistUI();
  addLog(`Domínio ${domain} removido da whitelist`, "warning");
}

function updateWhitelistUI() {
  const container = document.getElementById("whitelistItems");

  if (!settings.whitelist.length) {
    container.innerHTML = '<p class="no-data">Nenhum domínio na whitelist</p>';
    return;
  }

  container.innerHTML = settings.whitelist.map((d) => `
    <span class="whitelist-tag">
      ${d}
      <span class="remove" data-domain="${d}">×</span>
    </span>
  `).join("");

  container.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", (e) => removeFromWhitelist(e.target.dataset.domain));
  });
}

// === UI ===
function updateUI() {
  document.getElementById("scoreValue").textContent = stats.score || 0;
  updatePrivacyLevel();

  document.getElementById("cookiesCount").textContent = stats.cookiesBlocked || 0;
  document.getElementById("connectionsCount").textContent = stats.connectionsBlocked || 0;
  document.getElementById("fingerprintCount").textContent = stats.fingerprintsBlocked || 0;
  document.getElementById("hijackCount").textContent = stats.hijacksDetected || 0;

  updateDomainsUI();
  updateLogsUI();
}

function updatePrivacyLevel() {
  const levelElement = document.getElementById("privacyLevel");
  const score = stats.score || 0;

  let level, color;
  if (score < 10) {
    level = "Excelente";
    color = "#4caf50";
  } else if (score < 30) {
    level = "Bom";
    color = "#4facfe";
  } else if (score < 60) {
    level = "Moderado";
    color = "#ffa726";
  } else {
    level = "Alto Risco";
    color = "#f5576c";
  }

  levelElement.innerHTML = `<span class="level-text">Nível: ${level}</span>`;
  levelElement.style.background = color;
}

function updateDomainsUI() {
  const container = document.getElementById("domainsList");
  const domains = Object.entries(stats.domains || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (!domains.length) {
    container.innerHTML = '<p class="no-data">Nenhum rastreador detectado ainda...</p>';
    return;
  }

  container.innerHTML = domains.map(([domain, count]) => `
    <div class="domain-item">
      <span class="domain-name">${domain}</span>
      <span class="domain-count">${count}</span>
    </div>
  `).join("");
}

function updateLogsUI() {
  const container = document.getElementById("logsContainer");
  const logs = (stats.logs || []).slice(-10).reverse();

  if (!logs.length) {
    container.innerHTML = '<p class="no-data">Nenhuma atividade registrada</p>';
    return;
  }

  container.innerHTML = logs.map((log) => `
    <div class="log-entry log-${log.type || "info"}">
      <span class="log-time">${log.time}</span>
      <span class="log-message">${log.message}</span>
    </div>
  `).join("");
}

function addLog(message, type = "info") {
  const time = new Date().toLocaleTimeString("pt-BR");
  stats.logs = stats.logs || [];
  stats.logs.push({ time, message, type });
  if (stats.logs.length > 100) stats.logs = stats.logs.slice(-100);
  updateLogsUI();
}

// === AÇÕES ===
async function exportReport() {
  const report = {
    timestamp: new Date().toISOString(),
    score: stats.score,
    statistics: {
      cookiesBlocked: stats.cookiesBlocked,
      connectionsBlocked: stats.connectionsBlocked,
      fingerprintsBlocked: stats.fingerprintsBlocked,
      hijacksDetected: stats.hijacksDetected
    },
    domains: stats.domains,
    settings,
    logs: stats.logs
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `guardadeprivacidade-report-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  addLog("Relatório exportado com sucesso", "success");
}

async function clearAllData() {
  if (confirm("Tem certeza que deseja limpar todos os dados?")) {
    await browser.runtime.sendMessage({ action: "clearStats" }).catch(() => {});
    stats = {
      score: 0,
      cookiesBlocked: 0,
      connectionsBlocked: 0,
      fingerprintsBlocked: 0,
      hijacksDetected: 0,
      domains: {},
      logs: []
    };
    updateUI();
    addLog("Todos os dados foram limpos", "warning");
  }
}

async function resetScore() {
  if (confirm("Resetar apenas o score de privacidade?")) {
    await browser.runtime.sendMessage({ action: "resetScore" }).catch(() => {});
    stats.score = 0;
    updateUI();
    addLog("Score resetado", "info");
  }
}

// === ATUALIZAÇÃO AUTOMÁTICA ===
function startAutoRefresh() {
  setInterval(async () => {
    await loadStats();
    updateUI();
  }, 3000);
}

// Listener para mensagens vindas do background
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "statsUpdated") {
    loadStats().then(() => updateUI());
  }
});
