import { getRepo } from "../src/github.js";

const form = document.getElementById("config");
const tokenInput = document.getElementById("token");
const repoInput = document.getElementById("repo");
const baseDirInput = document.getElementById("baseDir");
const statusEl = document.getElementById("status");
const historyEl = document.getElementById("history");

const setStatus = (text, kind = "") => {
  statusEl.textContent = text;
  statusEl.className = kind;
};

const renderHistory = (history = []) => {
  if (history.length === 0) return;
  historyEl.replaceChildren(
    ...history.map((item) => {
      const li = document.createElement("li");
      const when = new Date(item.at).toLocaleString("pt-BR");
      if (item.ok) {
        const a = document.createElement("a");
        a.href = item.url;
        a.target = "_blank";
        a.textContent = item.title;
        li.append(item.skipped ? "= " : "✓ ", a, ` · ${when}`);
      } else {
        li.className = "err";
        li.textContent = `✗ ${item.title}: ${item.error} · ${when}`;
      }
      return li;
    })
  );
};

const init = async () => {
  const { token = "", repo = "", baseDir = "", history } = await chrome.storage.local.get([
    "token",
    "repo",
    "baseDir",
    "history",
  ]);
  tokenInput.value = token;
  repoInput.value = repo;
  baseDirInput.value = baseDir;
  renderHistory(history);
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = tokenInput.value.trim();
  const repo = repoInput.value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");
  const baseDir = baseDirInput.value.trim().replace(/^\/+|\/+$/g, "");

  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    setStatus("Use o formato dono/nome.", "err");
    return;
  }

  setStatus("Testando…");
  try {
    const info = await getRepo(token, repo);
    if (!info.permissions?.push) {
      throw new Error("o token não tem permissão de escrita nesse repo");
    }
    await chrome.storage.local.set({ token, repo, baseDir });
    setStatus(`Conectado a ${info.full_name} (branch ${info.default_branch}).`, "ok");
  } catch (error) {
    setStatus(`Erro: ${error.message}`, "err");
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.history) renderHistory(changes.history.newValue);
});

init();
