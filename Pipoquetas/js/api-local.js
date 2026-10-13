// api-local.js — "servidor de mentirinha" que roda dentro do navegador (sem Python).
// Mantém os mesmos endereços /api/... que as telas já usam, mas grava tudo no localStorage:
//   pipo_clientes -> cadastros | pipo_sessao -> quem está logado | pipo_filmes -> filmes adicionados/editados/removidos
// Os filmes base vêm de js/dados-filmes.js (gerado por gerar_dados_filmes.py).
(function () {
  var CODIGO_ADMIN = "PIPOQUETAS-ADMIN";   // código exigido para cadastrar um administrador
  var EMPRESA_PRECISA_APROVACAO = true;    // empresa só entra depois que o administrador aprovar
  var PLACEHOLDER = "assets/img-filmes/placeholder.svg";
  var DESTINOS = { usuario: "index.html", empresa: "empresa.html", administrador: "admin.html" };
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/, USUARIO = /^[a-z0-9_.-]{3,30}$/;
  var resets = {};

  // ---------- localStorage ----------
  function ler(chave, padrao) {
    try { var v = JSON.parse(localStorage.getItem(chave)); return v == null ? padrao : v; } catch (e) { return padrao; }
  }
  function salvar(chave, v) { localStorage.setItem(chave, JSON.stringify(v)); }

  // Hash simples com "sal" (cyrb53): basta para o trabalho, não é segurança de verdade.
  function hash(t) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, ch; t = "pipoquetas::" + t;
    for (var i = 0; i < t.length; i++) { ch = t.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  function ok(dados) { return $.Deferred().resolve(dados, "success", {}).promise(); }
  function falha(msg, cod) { return $.Deferred().reject({ status: cod || 400, responseJSON: { erro: msg } }, "error", msg).promise(); }

  // ---------- Clientes ----------
  function clientes() {
    var c = ler("pipo_clientes", null);
    if (!c) { // primeira vez: contas de demonstração (senha 123456)
      var agora = new Date().toISOString();
      c = $.map([["usuario", "Usuário Demo", {}], ["empresa", "Empresa Demo", { cnpj: "12.345.678/0001-90" }], ["administrador", "Administrador Demo", {}]], function (d, i) {
        return $.extend({ id: i + 1, tipo: d[0], nome: d[1], usuario: d[0], email: d[0] + "@pipoquetas.demo", senha_hash: hash("123456"), status: "ativo", criado_em: agora }, d[2]);
      });
      salvar("pipo_clientes", c);
    }
    return c;
  }
  function atual() {
    var id = ler("pipo_sessao", null), achado = null;
    if (id) $.each(clientes(), function (_, c) { if (c.id === id) achado = c; });
    return achado;
  }
  function exige() { var u = atual(), tipos = Array.prototype.slice.call(arguments); return u && tipos.indexOf(u.tipo) !== -1 ? u : null; }
  function achar(ident) {
    ident = String(ident || "").trim().toLowerCase();
    var achado = null;
    $.each(clientes(), function (_, c) { if (c.usuario === ident || c.email === ident) achado = c; });
    return achado;
  }
  function publico(u) { return { id: u.id, tipo: u.tipo, nome: u.nome, usuario: u.usuario, email: u.email, nascimento: u.nascimento, criado_em: u.criado_em }; }

  // ---------- Filmes: base (dados-filmes.js) + o que foi adicionado/editado/removido ----------
  var base = (typeof filmesData !== "undefined") ? filmesData.slice() : [];
  function estado() { return ler("pipo_filmes", { adicionados: [], removidos: [], editados: {} }); }
  function todos() {
    var e = estado();
    var lista = $.map(base, function (f) { return e.removidos.indexOf(f.id) === -1 ? $.extend({}, f, e.editados[f.id] || {}) : null; });
    return lista.concat(e.adicionados);
  }
  function publicar() { // refaz o filmesData que index, explore e filme leem (só os aprovados)
    if (typeof filmesData === "undefined") return;
    var pub = $.grep(todos(), function (f) { return !f.status || f.status === "aprovado"; });
    filmesData.splice.apply(filmesData, [0, filmesData.length].concat(pub));
  }
  function pode(u, f) { return u.tipo === "administrador" || f.empresaId === u.id; }
  function slug(t) { return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "filme"; }
  function limpar(d) {
    return {
      titulo: String(d.titulo || "").trim().slice(0, 120), ano: String(d.ano || "").replace(/\D/g, "").slice(0, 4),
      classificacao: $.inArray(d.classificacao, ["L", "10", "12", "14", "16", "18"]) !== -1 ? d.classificacao : "L",
      generos: $.grep($.map(d.generos || [], function (g) { return String(g).trim().slice(0, 30); }), Boolean).slice(0, 6),
      plataforma: String(d.plataforma || "").trim().slice(0, 60), preco: String(d.preco || "").trim().slice(0, 20),
      sinopse: String(d.sinopse || "").trim().slice(0, 1500), imagem: String(d.imagem || "").trim().slice(0, 500) || PLACEHOLDER
    };
  }
  // Aplica uma mudança: filme adicionado muda direto; filme base vira "edição" por cima do original.
  function mexer(id, fn) {
    var e = estado(), i = -1;
    $.each(e.adicionados, function (k, f) { if (f.id === id) i = k; });
    if (i >= 0) fn(e.adicionados[i]);
    else { e.editados[id] = e.editados[id] || {}; fn(e.editados[id]); }
    salvar("pipo_filmes", e);
  }
  function achaFilme(id) { var r = null; $.each(todos(), function (_, f) { if (f.id === id) r = f; }); return r; }

  // ---------- Rotas (mesmos endereços do servidor.py antigo) ----------
  var rotas = [];
  function rota(metodo, regex, fn) { rotas.push({ m: metodo, r: regex, f: fn }); }

  rota("GET", /^\/api\/eu$/, function () { var u = atual(); return ok({ logado: !!u, usuario: u ? publico(u) : null }); });

  rota("POST", /^\/api\/cadastro$/, function (d) {
    var tipo = d.tipo, nome = String(d.nome || "").trim().slice(0, 80);
    var usuario = String(d.usuario || "").trim().toLowerCase(), email = String(d.email || "").trim().toLowerCase();
    if (!DESTINOS[tipo]) return falha("Perfil inválido.");
    if (nome.length < 2) return falha("Informe seu nome.");
    if (!USUARIO.test(usuario)) return falha("Usuário: 3 a 30 letras minúsculas, números, ponto, hífen ou _.");
    if (!EMAIL.test(email)) return falha("E-mail inválido.");
    if (String(d.senha || "").length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
    var novo = { tipo: tipo, nome: nome, usuario: usuario, email: email, senha_hash: hash(String(d.senha)), criado_em: new Date().toISOString() };
    if (tipo === "empresa") {
      var c = String(d.cnpj || "").replace(/\D/g, "");
      if (c.length !== 14) return falha("CNPJ inválido (são 14 números).");
      novo.cnpj = c.slice(0, 2) + "." + c.slice(2, 5) + "." + c.slice(5, 8) + "/" + c.slice(8, 12) + "-" + c.slice(12);
    }
    if (tipo === "administrador" && d.codigo !== CODIGO_ADMIN) return falha("Código de administrador incorreto.", 403);
    if (tipo === "usuario" && d.nascimento) novo.nascimento = String(d.nascimento).slice(0, 10);
    var cl = clientes(), repetido = false, maior = 0;
    $.each(cl, function (_, x) { if (x.usuario === usuario || x.email === email) repetido = true; maior = Math.max(maior, x.id); });
    if (repetido) return falha("Usuário ou e-mail já cadastrado.", 409);
    novo.id = maior + 1;
    novo.status = (tipo === "empresa" && EMPRESA_PRECISA_APROVACAO) ? "pendente" : "ativo";
    cl.push(novo); salvar("pipo_clientes", cl);
    if (novo.status === "pendente") return ok({ ok: true, mensagem: "Cadastro enviado! Aguarde a aprovação do administrador para entrar." });
    salvar("pipo_sessao", novo.id);
    return ok({ ok: true, destino: DESTINOS[tipo] });
  });

  rota("POST", /^\/api\/login$/, function (d) {
    var u = achar(d.identificador);
    if (!u || u.senha_hash !== hash(String(d.senha || ""))) return falha("Usuário ou senha não conferem.", 401);
    if (d.tipo && d.tipo !== u.tipo) return falha("Esta conta é de outro perfil. Escolha a aba correta.", 403);
    if (u.status === "pendente") return falha("Seu cadastro ainda aguarda a aprovação do administrador.", 403);
    if (u.status === "recusado") return falha("Cadastro recusado pelo administrador.", 403);
    salvar("pipo_sessao", u.id);
    return ok({ ok: true, destino: DESTINOS[u.tipo] });
  });

  rota("POST", /^\/api\/logout$/, function () { localStorage.removeItem("pipo_sessao"); return ok({ ok: true }); });

  rota("POST", /^\/api\/esqueci-senha$/, function (d) {
    var u = achar(d.identificador), r = { ok: true, mensagem: "Se a conta existir, um código de 6 dígitos foi gerado (vale por 15 minutos)." };
    if (u) {
      var codigo = ("000000" + Math.floor(Math.random() * 1000000)).slice(-6);
      resets[u.id] = { codigo: codigo, expira: Date.now() + 15 * 60000, tentativas: 0 };
      r.codigo = codigo; // modo demonstração: sem e-mail, o código aparece na tela
    }
    return ok(r);
  });

  rota("POST", /^\/api\/redefinir-senha$/, function (d) {
    var u = achar(d.identificador), r = u ? resets[u.id] : null;
    if (!r || r.expira < Date.now() || r.tentativas >= 5) return falha("Código inválido ou expirado. Peça um novo.");
    if (r.codigo !== String(d.codigo || "").trim()) { r.tentativas++; return falha("Código incorreto."); }
    if (String(d.senha || "").length < 6) return falha("A nova senha precisa ter pelo menos 6 caracteres.");
    var cl = clientes();
    $.each(cl, function (_, c) { if (c.id === u.id) c.senha_hash = hash(String(d.senha)); });
    salvar("pipo_clientes", cl); delete resets[u.id];
    return ok({ ok: true, mensagem: "Senha alterada! Já pode entrar." });
  });

  rota("GET", /^\/api\/admin\/empresas$/, function () {
    if (!exige("administrador")) return falha("Acesso negado.", 403);
    return ok($.map(clientes(), function (c) {
      if (c.tipo !== "empresa" || c.status !== "pendente") return null;
      return { id: c.id, nome: c.nome, cnpj: c.cnpj || "", email: c.email, data: c.criado_em.slice(0, 10).split("-").reverse().join("/"), status: c.status };
    }));
  });

  rota("POST", /^\/api\/admin\/empresas\/(\d+)\/(aprovar|recusar)$/, function (d, p) {
    if (!exige("administrador")) return falha("Acesso negado.", 403);
    var cl = clientes();
    $.each(cl, function (_, c) { if (c.id === Number(p[0]) && c.tipo === "empresa") c.status = p[1] === "aprovar" ? "ativo" : "recusado"; });
    salvar("pipo_clientes", cl);
    return ok({ ok: true });
  });

  rota("GET", /^\/api\/filmes$/, function () {
    var u = exige("administrador", "empresa");
    if (!u) return falha("Acesso negado.", 403);
    return ok($.grep(todos(), function (f) { return pode(u, f); }));
  });

  rota("POST", /^\/api\/filmes$/, function (d) {
    var u = exige("administrador", "empresa");
    if (!u) return falha("Acesso negado.", 403);
    var dados = limpar(d);
    if (!dados.titulo) return falha("Informe o título do filme.");
    var e = estado(), ids = $.map(todos(), function (f) { return f.id; });
    var b = slug(dados.titulo), fid = b, n = 2;
    while (ids.indexOf(fid) !== -1) fid = b + "-" + (n++);
    var f = $.extend({ id: fid }, dados, { avaliacao: 0, nota: 0, numAvaliacoes: 0, secao: "recomendados" });
    if (u.tipo === "empresa") $.extend(f, { empresaId: u.id, empresaNome: u.nome, status: "pendente", visualizacoes: 0, avaliacoes: 0, notaMedia: 0 });
    e.adicionados.push(f); salvar("pipo_filmes", e); publicar();
    return ok(f);
  });

  rota("PUT", /^\/api\/filmes\/([^\/]+)$/, function (d, p) {
    var u = exige("administrador", "empresa"), f = u ? achaFilme(p[0]) : null;
    if (!u) return falha("Acesso negado.", 403);
    var dados = limpar(d);
    if (!dados.titulo) return falha("Informe o título do filme.");
    if (!f || !pode(u, f)) return falha("Filme não encontrado.", 404);
    mexer(p[0], function (alvo) { $.extend(alvo, dados); if (u.tipo === "empresa") alvo.status = "pendente"; }); // empresa editou: o administrador revisa de novo
    publicar();
    return ok(achaFilme(p[0]));
  });

  rota("DELETE", /^\/api\/filmes\/([^\/]+)$/, function (d, p) {
    var u = exige("administrador", "empresa"), f = u ? achaFilme(p[0]) : null;
    if (!u) return falha("Acesso negado.", 403);
    if (!f || !pode(u, f)) return falha("Filme não encontrado.", 404);
    var e = estado(), antes = e.adicionados.length;
    e.adicionados = $.grep(e.adicionados, function (x) { return x.id !== p[0]; });
    if (e.adicionados.length === antes) e.removidos.push(p[0]); // era filme base: só marca como removido
    salvar("pipo_filmes", e); publicar();
    return ok({ ok: true });
  });

  rota("POST", /^\/api\/admin\/filmes\/([^\/]+)\/(aprovar|recusar)$/, function (d, p) {
    if (!exige("administrador")) return falha("Acesso negado.", 403);
    mexer(p[0], function (alvo) { alvo.status = p[1] === "aprovar" ? "aprovado" : "recusado"; });
    publicar();
    return ok({ ok: true });
  });

  window.apiLocal = function (metodo, url, dados) {
    for (var i = 0; i < rotas.length; i++) {
      var m = rotas[i].m === metodo ? url.match(rotas[i].r) : null;
      if (m) return rotas[i].f(dados || {}, $.map(m.slice(1), decodeURIComponent));
    }
    return falha("Rota não encontrada.", 404);
  };

  // Botão do login: baixa os cadastros como arquivo JSON
  window.baixarClientesJson = function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(clientes(), null, 2)], { type: "application/json" }));
    a.download = "clientes.json";
    a.click();
  };

  publicar();

  // Sem servidor, a proteção das páginas de empresa e administrador é feita aqui
  var pagina = location.pathname.split("/").pop();
  var exigido = { "admin.html": "administrador", "empresa.html": "empresa" }[pagina];
  if (exigido && !exige(exigido)) location.replace("login.html");
})();
