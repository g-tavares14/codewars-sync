import { commitFiles } from "./github.js";
import { extensionFor } from "./languages.js";
import { buildPaths } from "./paths.js";

const HISTORY_LIMIT = 15;

const fetchKata = async (kataId) => {
  const response = await fetch(`https://www.codewars.com/api/v1/code-challenges/${kataId}`);
  if (!response.ok) throw new Error(`Codewars respondeu ${response.status}`);
  const json = await response.json();
  return {
    id: json.id,
    slug: json.slug,
    name: json.name,
    url: json.url ?? `https://www.codewars.com/kata/${json.id}`,
    rank: json.rank?.name ?? null, // ex.: "6 kyu"; null em katas beta/sem rank
    description: json.description ?? "",
  };
};

const buildReadme = (kata, language) =>
  [
    `# [${kata.name}](${kata.url})`,
    "",
    `**${kata.rank ?? "beta"}** · ${language}`,
    "",
    kata.description,
    "",
  ].join("\n");

const recordResult = async (entry) => {
  const { history = [] } = await chrome.storage.local.get("history");
  await chrome.storage.local.set({
    history: [{ ...entry, at: Date.now() }, ...history].slice(0, HISTORY_LIMIT),
  });
  await chrome.action.setBadgeBackgroundColor({ color: entry.ok ? "#1a7f37" : "#cf222e" });
  await chrome.action.setBadgeText({ text: entry.ok ? "✓" : "!" });
};

const syncSolution = async ({ kataId, language, code }) => {
  let title = kataId;
  try {
    const { token, repo, baseDir = "" } = await chrome.storage.local.get(["token", "repo", "baseDir"]);
    if (!token || !repo) throw new Error("configure o token e o repo no popup da extensão");

    const kata = await fetchKata(kataId);
    title = kata.name;

    const paths = buildPaths({ kata, language, extension: extensionFor(language), baseDir });
    const files = [
      { path: paths.solution, content: code.endsWith("\n") ? code : `${code}\n` },
      { path: paths.readme, content: buildReadme(kata, language) },
    ];

    const message = `Codewars: ${kata.name} (${kata.rank ?? "beta"}, ${language})`;
    const { skipped, url } = await commitFiles(token, repo, files, message);
    await recordResult({ ok: true, skipped, title, url });
  } catch (error) {
    console.error("[codewars-sync]", error);
    await recordResult({ ok: false, title, error: error.message });
  }
};

// Executa uma sincronização por vez para dois submits seguidos não disputarem a mesma branch.
let queue = Promise.resolve();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === "syncSolution") {
    queue = queue.then(() => syncSolution(message));
  }
});
