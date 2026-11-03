// Content script no mundo isolado: repassa as submissões do page-reader.js para o
// service worker, já que só scripts isolados têm acesso ao chrome.runtime.
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const { source, kataId, language, code } = event.data ?? {};
  if (source !== "codewars-sync") return;

  chrome.runtime.sendMessage({ action: "syncSolution", kataId, language, code });
});
