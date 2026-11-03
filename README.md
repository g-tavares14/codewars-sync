# Codewars Sync

Extensão do Chrome que, ao clicar em **Submit** numa kata do [Codewars](https://www.codewars.com), envia a solução e o enunciado da kata para um repositório seu no GitHub, num único commit.

Exemplo de repositório alimentado por ela: [g-tavares14/codewars-solutions](https://github.com/g-tavares14/codewars-solutions).

## Instalação (modo desenvolvedor)

1. Clone este repositório.
2. Abra `chrome://extensions`, ative o **Modo do desenvolvedor**, clique em **Carregar sem compactação** e escolha a pasta clonada. É preciso o Chrome 111 ou mais recente.
3. Crie no GitHub o repositório que vai guardar as soluções. Ele pode estar vazio: na primeira sincronização, a extensão cria um `README.md` na raiz.
4. Crie um token fine-grained em <https://github.com/settings/personal-access-tokens/new>:
   - **Repository access:** Only select repositories → o repositório de soluções
   - **Permissions:** Contents → **Read and write** (o Metadata: Read-only entra junto, automaticamente)
5. Clique no ícone da extensão, cole o token, informe o repositório no formato `dono/nome` e clique em **Salvar e testar conexão**.

Depois disso, toda kata enviada com **Submit** vai para o GitHub. O ícone mostra ✓ quando o commit dá certo e ! quando dá erro. O popup guarda o histórico das últimas sincronizações.

## Estrutura no repositório de soluções

```
README.md
8-kyu/
  opposite-number/
    README.md              ← enunciado da kata
    opposite-number.go
    opposite-number.py     ← mesma kata em outra linguagem
7-kyu/
  ...
beta/                      ← katas ainda sem rank
  ...
```

O rank segue a escala do Codewars: **8 kyu** é o mais fácil e **1 kyu** o mais difícil. Se quiser tudo dentro de uma subpasta, preencha **Pasta base** no popup.

## Como funciona

| Arquivo | Papel |
|---|---|
| `src/page-reader.js` | Roda no contexto da página (mundo `MAIN`) e, no clique em Submit, lê o código direto da instância do CodeMirror. |
| `src/bridge.js` | Content script isolado; repassa a submissão para o service worker. |
| `src/background.js` | Busca nome, rank e enunciado na API pública do Codewars, monta os arquivos e enfileira as sincronizações. |
| `src/paths.js` | Decide os caminhos no repositório (rank → kata → arquivo). |
| `src/languages.js` | Mapeia o slug de linguagem do Codewars para a extensão do arquivo. |
| `src/github.js` | Cria um único commit com todos os arquivos pela Git Data API. |
| `popup/` | Configuração do token e do repositório, mais o histórico. |

Detalhes que valem saber:

- **Só soluções aceitas:** o botão Submit só aparece depois que todos os testes passam.
- **Um commit por kata:** solução e README entram juntos. Se nada mudou, a extensão não cria commit, porque a árvore nova tem o mesmo SHA da anterior.
- **Submits em sequência:** as sincronizações rodam uma por vez. As requisições ao GitHub não usam cache, e, se a branch andar no meio do caminho (outro commit, um bot de CI), a extensão refaz o commit em cima da versão mais nova.

## Formatação automática (opcional)

O editor do Codewars não formata o código. No repositório de soluções, um workflow do GitHub Actions pode rodar o formatador da linguagem a cada push e commitar o resultado. Para Go, veja o [`gofmt.yml`](https://github.com/g-tavares14/codewars-solutions/blob/main/.github/workflows/gofmt.yml) do repositório de exemplo.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Nada no ícone depois do Submit | A aba do Codewars foi aberta antes de a extensão ser carregada ou recarregada. Dê F5 na aba. |
| `Resource not accessible by personal access token` | Falta a permissão **Contents: Read and write** no token. |
| `repo não encontrado` | O nome do repositório está errado, ou o token não tem acesso a ele. |
| `token inválido ou expirado` | Gere um token novo e salve no popup. |

Logs detalhados: `chrome://extensions` → Codewars Sync → **service worker**. Depois de editar o código, clique em recarregar (↻) na extensão e dê F5 na aba do Codewars.
