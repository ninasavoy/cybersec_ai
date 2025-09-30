// content.js (versão ajustada)
console.log("Content script Guarda de Privacidade iniciado!");

// ========== DETECÇÃO DE STORAGE ==========
let storageInfo = {
  local: Object.keys(localStorage).length,
  session: Object.keys(sessionStorage).length
};
console.log("📦 Storage detectado:", storageInfo);

// ========== PROTEÇÃO ANTI-HIJACKING ==========

// Hook em setAttribute - detecta injeção de event handlers maliciosos
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name, value) {
  if (name && name.toLowerCase().startsWith("on")) {
    console.warn("⚠️ Possível hijacking via setAttribute:", name, value);

    browser.runtime.sendMessage({
      action: "hijackDetected",
      type: "setAttribute",
      detail: { name, value }
    }).catch(() => {});

    return; // bloqueia atribuição maliciosa
  }
  return originalSetAttribute.apply(this, arguments);
};

// Hook em addEventListener - detecta event listeners suspeitos
const originalAddEventListener = EventTarget.prototype.addEventListener;
const suspiciousEvents = new Set();
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (type && typeof listener === "function") {
    const listenerStr = listener.toString();

    const suspiciousPatterns = [
      /eval\s*\(/,
      /document\.write\s*\(/,
      /innerHTML\s*=/,
      /location\.href\s*=/,
      /window\.location/,
      /setTimeout\s*\(\s*["']/,
      /setInterval\s*\(\s*["']/
    ];

    const isSuspicious = suspiciousPatterns.some((p) => p.test(listenerStr));

    if (isSuspicious && !suspiciousEvents.has(listenerStr)) {
      console.warn("Event listener suspeito detectado:", type);

      suspiciousEvents.add(listenerStr);

      browser.runtime.sendMessage({
        action: "hijackDetected",
        type: "addEventListener",
        detail: { type, suspicious: true }
      }).catch(() => {});
    }
  }
  return originalAddEventListener.apply(this, arguments);
};

// Proteção contra redirecionamento malicioso
const origLocationSetter = Object.getOwnPropertyDescriptor(window, "location").set;
Object.defineProperty(window, "location", {
  set: function (value) {
    console.warn("Tentativa de redirecionamento detectada:", value);

    browser.runtime.sendMessage({
      action: "hijackDetected",
      type: "locationRedirect",
      detail: { target: value }
    }).catch(() => {});

    const currentDomain = window.location.hostname;
    try {
      const newUrl = new URL(value, window.location.href);
      if (newUrl.hostname !== currentDomain) {
        console.warn("Redirecionamento bloqueado:", value);
        return;
      }
    } catch {
      return; // URL inválida, bloqueia
    }

    return origLocationSetter.call(window, value);
  },
  get: function () {
    return window.location;
  }
});

// ========== PROTEÇÃO ANTI-FINGERPRINTING ==========

// 1. Canvas Fingerprinting
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function () {
  console.warn("Canvas fingerprint detectado via toDataURL!");

  browser.runtime.sendMessage({
    action: "fingerprintDetected",
    type: "canvas-toDataURL"
  }).catch(() => {});

  const result = origToDataURL.apply(this, arguments);
  return addCanvasNoise(result);
};

const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
CanvasRenderingContext2D.prototype.getImageData = function () {
  console.warn("Canvas fingerprint detectado via getImageData!");

  browser.runtime.sendMessage({
    action: "fingerprintDetected",
    type: "canvas-getImageData"
  }).catch(() => {});

  const imageData = origGetImageData.apply(this, arguments);

  // Adicionar ruído mínimo
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (Math.random() < 0.1) {
      imageData.data[i] += Math.random() < 0.5 ? -1 : 1;
    }
  }
  return imageData;
};

function addCanvasNoise(dataURL) {
  return dataURL + "/*" + Math.random().toString(36).substring(7) + "*/";
}

// 2. WebGL Fingerprinting
const origGetParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function (parameter) {
  console.warn("WebGL fingerprint detectado:", parameter);

  browser.runtime.sendMessage({
    action: "fingerprintDetected",
    type: "webgl"
  }).catch(() => {});

  const fpParams = [this.VENDOR, this.RENDERER, this.VERSION];
  if (fpParams.includes(parameter)) {
    return "Generic WebGL Renderer";
  }
  return origGetParameter.apply(this, arguments);
};

// 3. AudioContext Fingerprinting
if (window.AudioContext || window.webkitAudioContext) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const origOscillator = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function () {
    console.warn("Audio fingerprint detectado!");

    browser.runtime.sendMessage({
      action: "fingerprintDetected",
      type: "audio"
    }).catch(() => {});

    const osc = origOscillator.apply(this, arguments);
    osc.frequency.value += (Math.random() - 0.5) * 0.0001;
    return osc;
  };
}

// 4. Font Fingerprinting
const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth").get;
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  get: function () {
    const val = origOffsetWidth.call(this);

    if (this.style?.fontFamily && this.textContent) {
      const hidden = this.style.position === "absolute" && this.style.visibility === "hidden";
      if (hidden) {
        console.warn("Font fingerprint detectado!");
        browser.runtime.sendMessage({
          action: "fingerprintDetected",
          type: "font"
        }).catch(() => {});
        return val + (Math.random() < 0.5 ? -0.1 : 0.1);
      }
    }
    return val;
  }
});

// 5. Hardware e memória
Object.defineProperty(navigator, "hardwareConcurrency", {
  get: function () {
    browser.runtime.sendMessage({
      action: "fingerprintDetected",
      type: "hardware"
    }).catch(() => {});
    return 4;
  }
});

Object.defineProperty(navigator, "deviceMemory", {
  get: function () {
    browser.runtime.sendMessage({
      action: "fingerprintDetected",
      type: "memory"
    }).catch(() => {});
    return 8;
  }
});

// 6. Battery API
if (navigator.getBattery) {
  const origGetBattery = navigator.getBattery;
  navigator.getBattery = function () {
    console.warn("Battery fingerprint detectado!");
    browser.runtime.sendMessage({
      action: "fingerprintDetected",
      type: "battery"
    }).catch(() => {});

    return origGetBattery.apply(this, arguments).then((b) => {
      return new Proxy(b, {
        get(target, prop) {
          if (prop === "level") {
            return Math.min(1, target.level + (Math.random() - 0.5) * 0.05);
          }
          return target[prop];
        }
      });
    });
  };
}

// ========== PROTEÇÕES ADICIONAIS ==========

// Bloqueio de plugins
Object.defineProperty(navigator, "plugins", {
  get: function () {
    browser.runtime.sendMessage({
      action: "fingerprintDetected",
      type: "plugins"
    }).catch(() => {});
    return [];
  }
});

// Reduz precisão do timer (anti-timing attacks)
const origPerformanceNow = Performance.prototype.now;
Performance.prototype.now = function () {
  return Math.round(origPerformanceNow.apply(this, arguments) / 100) * 100;
};

// Monitor de mutações suspeitas
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return; // apenas elementos

      if (node.tagName === "IFRAME" && node.src) {
        const iframeDomain = new URL(node.src).hostname;
        if (iframeDomain !== window.location.hostname) {
          console.warn("Iframe de terceiro detectado:", iframeDomain);
        }
      }

      if (node.tagName === "SCRIPT" && !node.src && node.textContent) {
        const badWords = ["eval", "atob", "fromCharCode", "unescape"];
        if (badWords.some((w) => node.textContent.includes(w))) {
          console.warn("Script inline suspeito detectado!");
          browser.runtime.sendMessage({
            action: "hijackDetected",
            type: "suspiciousScript",
            detail: { keywords: badWords }
          }).catch(() => {});
        }
      }
    });
  });
});

observer.observe(document.documentElement, { childList: true, subtree: true });

console.log("Proteções anti-rastreamento ativadas!");
