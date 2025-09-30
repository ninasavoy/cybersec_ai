console.log("Content script iniciado (detector de hijacking ativo)!");

// Detecta armazenamento local
let storageInfo = {
  local: Object.keys(localStorage).length,
  session: Object.keys(sessionStorage).length
};
console.log("Storage detectado:", storageInfo);

// Hook em setAttribute
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
  if (name && name.toLowerCase().startsWith("on")) {
    console.warn("Possível hijacking via setAttribute:", name, value);
  }
  return originalSetAttribute.apply(this, arguments);
};

// Hook em addEventListener
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (type && type.toLowerCase().startsWith("on")) {
    console.warn("Possível hijacking via addEventListener:", type);
  }
  return originalAddEventListener.apply(this, arguments);
};

// Detecta Canvas Fingerprint
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function() {
  console.warn("Canvas fingerprint detectado!");
  return origToDataURL.apply(this, arguments);
};