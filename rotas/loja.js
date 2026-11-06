// Páginas públicas da LOJA: home, categorias (roupas, instrumentos, discos), busca e detalhes do produto.
const express = require('express');
const router = express.Router();
const db = require('../banco/database');
const { PAGINAS, ORDENS, listarPagina, buscar, sugestoes, vitrineDaHome, paginaDoTipo } = require('../util/loja');
const { TIPOS } = require('../util/tipos');

// ---------- HOME ----------
router.get('/', (req, res) => {
    vitrineDaHome(db, (erro, vitrine) => {
        if (erro) return res.send('Erro ao carregar a loja.');
        res.render('index', Object.assign({ footerGrande: true }, vitrine));
    });
});

// ---------- PÁGINAS DE CATEGORIA: /loja/roupas, /loja/instrumentos, /loja/discos ----------
router.get('/loja/:pagina', (req, res, next) => {
    const pagina = req.params.pagina;
    if (!PAGINAS[pagina]) return next();

    listarPagina(db, pagina, req.query, (erro, dados) => {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao carregar os produtos.');
        }
        res.render('loja/categoria', Object.assign({ pagina, PAGINAS, ORDENS, footerGrande: true }, dados));
    });
});

// ---------- BUSCA (RF4) ----------
// Sugestões enquanto digita (usadas pela barra de busca): devolve JSON
router.get('/busca/sugestoes', (req, res) => {
    const termo = String(req.query.q || '').trim().slice(0, 60);
    if (termo.length < 2) return res.json([]);
    sugestoes(db, termo, (erro, lista) => res.json(erro ? [] : lista));
});

router.get('/busca', (req, res) => {
    const termo = String(req.query.q || '').trim().slice(0, 60);
    if (!termo) return res.redirect('/');

    buscar(db, termo, req.query, (erro, produtos, ordem, selecionados) => {
        if (erro) return res.send('Erro na busca.');
        res.render('loja/busca', { termo, produtos, ordem, selecionados, PAGINAS, ORDENS, footerGrande: true });
    });
});

// ---------- DETALHES DO PRODUTO ----------
// UMA rota e UMA página (views/loja/produto.ejs) servem para QUALQUER produto (camisa, disco, instrumento).
// O que muda é só o id na URL: /produto/19 busca o produto 19 no banco e manda para a página como a variável "produto".
router.get('/produto/:id', (req, res, next) => {
    db.get('SELECT * FROM produtos WHERE id = ?', [req.params.id], (erro, produto) => {
        if (erro) return res.send('Erro ao carregar o produto.');
        if (!produto) return next();

        // "especificacoes" é um VETOR (lista) com os detalhes que existem para esse tipo de produto.
        // Camisa tem tamanho e cor, disco tem formato e gravadora, guitarra tem cordas e captadores...
        // A página percorre esse vetor com forEach, então não precisa de uma página diferente para cada tipo.
        const tipo = TIPOS[produto.tipo_produto] || TIPOS.outros;
        const especificacoes = tipo.campos
            .filter(c => produto[c.nome] !== null && produto[c.nome] !== undefined && String(produto[c.nome]) !== '')
            .map(c => ({ rotulo: c.rotulo, valor: produto[c.nome] }));

        // "Você também pode gostar": primeiro os do mesmo tipo, depois outros produtos da loja
        db.all(`SELECT * FROM produtos WHERE id <> ? ORDER BY (tipo_produto = ?) DESC, id LIMIT 4`, [produto.id, produto.tipo_produto], (erro2, relacionados) => {
            res.render('loja/produto', { PAGINAS, paginaDoTipo, produto, tipo, especificacoes, relacionados: relacionados || [], footerGrande: true });
        });
    });
});

module.exports = router;
