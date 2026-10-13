# Continuar o projeto Pipoquetas em outra IA (ChatGPT, Gemini, DeepSeek...)

Repositório: https://github.com/RafaelRossiMoraes/Pipoquetas

## Prompt para colar na outra IA

> Você vai continuar um projeto escolar chamado **Pipoquetas** (site de streaming, tema vermelho/preto, cor de destaque #a8252a).
> É 100% front-end: HTML + CSS + jQuery, SEM Python e SEM servidor (precisa abrir com dois cliques no index.html).
> Leia o `CONTINUAR_EM_OUTRA_IA.md` (abaixo) e faça a lista "O que falta". Mantenha o estilo do código (comentários em português, jQuery,
> sem frameworks), responda em português do Brasil e entregue os arquivos completos alterados.
> **Cole aqui os arquivos** `js/api-local.js`, `js/app.js`, `js/login.js`, `js/admin.js`, `js/empresa.js`, `js/index.js`, `js/explore.js`, `js/filme.js`.

## Como rodar

Dois cliques em `index.html` (Chrome ou Edge; no Firefox o localStorage não é compartilhado entre páginas abertas por arquivo).
Contas de demonstração (senha `123456`): `usuario`, `empresa`, `administrador`. Cadastro de administrador exige o código `PIPOQUETAS-ADMIN` (`js/api-local.js`).
Para gerar os 50 filmes (só na máquina de quem desenvolve): `pip install requests`, criar `tmdb_chave.txt` com a chave da TMDB e rodar `python gerar_dados_filmes.py`.
Ele grava `js/dados-filmes.js`, que é o que o site lê. **Nunca suba a chave para o GitHub.**

## Como funciona

- `js/api-local.js`: "servidor de mentirinha" no navegador. Responde aos mesmos endereços `/api/...` que as telas usam (login, cadastro, esqueci a senha,
  filmes, aprovações) e grava no localStorage (`pipo_clientes`, `pipo_sessao`, `pipo_filmes`). Também protege `admin.html` e `empresa.html`
  e refaz o `filmesData` (só filmes aprovados) a cada mudança. Senha com hash simples (não é segurança de verdade).
- `js/dados-filmes.js`: filmes base. Filmes cadastrados por empresas/administrador ficam só no localStorage.
- `js/app.js`: `api()`, `esc()`, `erroMsg()`; troca o cabeçalho entre convidado (Entrar / Cadastrar-se) e logado.
- `login.html` + `js/login.js`: abas Cliente / Empresa / Administrador; entrar, cadastrar e "esqueci a senha" (o código de 6 dígitos aparece na tela).
- `filme.html?id=<id>` já é a tela-padrão de todos os filmes.
- jQuery está em `js/jquery.min.js` (não depende de internet; só os ícones e os trailers dependem).

## Feito (escrito, ainda não testado de ponta a ponta)

- [x] Esqueceu a senha, cadastro dos 3 perfis, login, convidado, Sair
- [x] Adicionar, editar e remover filme em Empresa e Administrador; aprovação de empresas e filmes
- [x] Botão "Baixar clientes.json" na tela de login
- [x] `gerar_dados_filmes.py` completa até 50 filmes com a TMDB e baixa os pôsteres

## O que falta

- [ ] Abrir no navegador e corrigir o que aparecer (só a sintaxe foi verificada)
- [ ] Rodar `gerar_dados_filmes.py` com a chave e conferir o site com 50 filmes
- [ ] Usar `esc()` (proteção contra HTML digitado) em `js/index.js`, `js/explore.js` e `js/filme.js`
- [ ] Convidado: exigir login para favoritar, avaliar e usar "Minha lista"
- [ ] Comentários do painel do administrador ainda são de exemplo; avaliações ficam no navegador
- [ ] Upload de imagem do pôster no formulário (hoje é URL ou caminho de arquivo)
- [ ] Categoria "Sci-Fi" da home não bate com o gênero "Ficção científica"
- [ ] Reescrever o `readme.txt` (seções 1, 3 e 4 estão desatualizadas)
