// Junta segmentos de caminho, ignorando os vazios e barras sobrando.
export const joinPath = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) => String(part).replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

/**
 * Decide onde a solução fica no repositório:
 * {baseDir}/{6-kyu|beta}/{slug-da-kata}/{slug-da-kata}.{ext} + README.md
 * Resolver a mesma kata em outra linguagem adiciona um arquivo na mesma pasta.
 *
 * @param {object} args
 * @param {{id: string, slug: string, name: string, rank: string|null}} args.kata
 *   rank vem como "6 kyu" e é null em katas beta/sem rank.
 * @param {string} args.language  Slug do Codewars, ex.: "python", "csharp".
 * @param {string} args.extension Ex.: ".py", ".cs".
 * @param {string} args.baseDir   Pasta opcional definida no popup ("" se vazia).
 * @returns {{solution: string, readme: string}} caminhos relativos ao repo.
 */
export const buildPaths = ({ kata, language, extension, baseDir }) => {
  const rankDir = kata.rank ? kata.rank.toLowerCase().replace(/\s+/g, "-") : "beta";
  const slug = kata.slug || kata.id;
  const kataDir = joinPath(baseDir, rankDir, slug);
  return {
    solution: joinPath(kataDir, `${slug}${extension}`),
    readme: joinPath(kataDir, "README.md"),
  };
};
