const API = "https://api.github.com";

const request = async (token, path, { method = "GET", body } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    // O GitHub responde com max-age=60; uma ref em cache apontaria para um commit antigo.
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.message ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return json;
};

export const getRepo = async (token, repo) => {
  try {
    return await request(token, `/repos/${repo}`);
  } catch (error) {
    if (error.status === 401) throw new Error("token inválido ou expirado");
    if (error.status === 404) throw new Error("repo não encontrado (ou o token não tem acesso a ele)");
    throw error;
  }
};

const ROOT_README = "# Codewars Solutions\n\nMinhas soluções do [Codewars](https://www.codewars.com), sincronizadas automaticamente.\n";

// A Git Data API não funciona em repo sem commits, mas a Contents API consegue
// criar o primeiro. Depois disso, devolve a ref da branch.
const getOrCreateBranchRef = async (token, repo, branch) => {
  try {
    return await request(token, `/repos/${repo}/git/ref/heads/${branch}`);
  } catch (error) {
    if (error.status !== 409 && error.status !== 404) throw error;
  }
  await request(token, `/repos/${repo}/contents/README.md`, {
    method: "PUT",
    body: { message: "Initial commit", content: btoa(unescape(encodeURIComponent(ROOT_README))) },
  });
  return request(token, `/repos/${repo}/git/ref/heads/${branch}`);
};

// A branch pode andar entre a leitura e a atualização (outra sincronização, o bot
// do gofmt). Refazer o commit em cima da ponta nova é seguro porque só adicionamos arquivos.
export const commitFiles = async (token, repo, files, message, attempts = 3) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await commitOnce(token, repo, files, message);
    } catch (error) {
      const raced = error.status === 422 && /fast forward/i.test(error.message);
      if (!raced || attempt >= attempts) throw error;
    }
  }
};

// Grava todos os arquivos num único commit pela Git Data API:
// ref -> commit -> árvore nova sobre a antiga -> commit novo -> move a ref.
const commitOnce = async (token, repo, files, message) => {
  const { default_branch: branch } = await getRepo(token, repo);
  const ref = await getOrCreateBranchRef(token, repo, branch);

  const parentSha = ref.object.sha;
  const parent = await request(token, `/repos/${repo}/git/commits/${parentSha}`);

  const tree = await request(token, `/repos/${repo}/git/trees`, {
    method: "POST",
    body: {
      base_tree: parent.tree.sha,
      tree: files.map(({ path, content }) => ({ path, mode: "100644", type: "blob", content })),
    },
  });

  // Árvores do Git são endereçadas por conteúdo: mesmos arquivos => mesmo SHA => nada mudou.
  if (tree.sha === parent.tree.sha) {
    return { skipped: true, url: `https://github.com/${repo}/tree/${branch}` };
  }

  const commit = await request(token, `/repos/${repo}/git/commits`, {
    method: "POST",
    body: { message, tree: tree.sha, parents: [parentSha] },
  });

  await request(token, `/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: { sha: commit.sha },
  });

  return { skipped: false, url: commit.html_url };
};
