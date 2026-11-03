// Roda no mundo MAIN da página para alcançar a instância do CodeMirror que o
// Codewars pendura no elemento do editor (invisível para content scripts isolados).
(() => {
  const TRAIN_PATH = /^\/kata\/([^/]+)\/train\/([^/?#]+)/;

  const readFromCodeMirror = () => {
    // O primeiro editor da página é a solução; o segundo tem os testes de exemplo.
    const editor = document.querySelector("#code .CodeMirror") ?? document.querySelector(".CodeMirror");
    return editor?.CodeMirror?.getValue() ?? null;
  };

  // Plano B: as linhas renderizadas, descartando os números da margem.
  const readFromDom = () => {
    const lines = document.querySelector(".CodeMirror-lines");
    if (!lines) return null;
    return lines.innerText
      .split("\n")
      .filter((line) => !/^\d+$/.test(line.trim()))
      .join("\n")
      .replace(/​/g, "");
  };

  document.addEventListener(
    "click",
    (event) => {
      if (!event.target.closest?.("#submit_btn")) return;

      const match = location.pathname.match(TRAIN_PATH);
      if (!match) return;

      // Lê de forma síncrona: o Codewars troca de página logo após um submit bem-sucedido.
      const code = readFromCodeMirror() ?? readFromDom();
      if (!code?.trim()) return;

      window.postMessage(
        {
          source: "codewars-sync",
          kataId: match[1],
          language: decodeURIComponent(match[2]),
          code,
        },
        location.origin
      );
    },
    true
  );
})();
