// Páginas públicas da LOJA: home, categorias (roupas, instrumentos, discos), busca e detalhes do produto.
const express = require('express');
const router = express.Router();
const db = require('../banco/database');
const { PAGINAS, ORDENS, listarPagina, buscar, vitrineDaHome, paginaDoTipo } = require('../util/loja');
const { listarAvaliacoes, podeAvaliar, salvarAvaliacao } = require('../util/avaliacoes');
const { estadoPorCep } = require('../util/cep');
const { calcularFrete } = require('../util/frete');
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
            listarAvaliacoes(produto.id, (erro3, avaliacoes, media) => {
                const usuario = req.session.usuario;
                podeAvaliar(usuario && usuario.id, produto.id, (liberado) => {

                    // roupa: busca o id de cada tamanho (mesmo nome) para os botões P/M/G/GG virarem links de verdade
                    const mandar = (tamanhos) => res.render('loja/produto', {
                        PAGINAS, paginaDoTipo, produto, tipo, especificacoes, relacionados: relacionados || [],
                        avaliacoes: avaliacoes || [], media, podeAvaliarProduto: liberado, tamanhos: tamanhos || {}, footerGrande: true
                    });

                    if (produto.tipo_produto !== 'roupa') return mandar();
                    db.all('SELECT id, tamanho FROM produtos WHERE nome = ? AND tipo_produto = ?', [produto.nome, 'roupa'], (erro4, linhas) => {
                        const tamanhos = {};
                        (linhas || []).forEach(l => { tamanhos[l.tamanho] = l.id; });
                        mandar(tamanhos);
                    });
                });
            });
        });
    });
});

// Envia uma avaliação (só quem comprou e ainda não avaliou)
router.post('/produto/:id/avaliar', (req, res) => {
    const voltar = '/produto/' + req.params.id;
    const usuario = req.session.usuario;
    if (!usuario || usuario.perfil !== 'cliente') {
        req.session.mensagem = { tipo: 'warning', texto: 'Entre com uma conta de cliente para avaliar.' };
        return res.redirect(voltar);
    }
    const nota = Math.min(5, Math.max(1, parseInt(req.body.nota) || 0));
    if (!nota) { req.session.mensagem = { tipo: 'danger', texto: 'Escolha de 1 a 5 estrelas.' }; return res.redirect(voltar); }

    podeAvaliar(usuario.id, req.params.id, (liberado) => {
        if (!liberado) {
            req.session.mensagem = { tipo: 'warning', texto: 'Você só pode avaliar produtos já comprados e entregues, uma vez cada.' };
            return res.redirect(voltar);
        }
        salvarAvaliacao(usuario.id, usuario.nome, req.params.id, nota, String(req.body.comentario || '').trim().slice(0, 500), (erro) => {
            req.session.mensagem = erro ? { tipo: 'danger', texto: 'Erro ao enviar a avaliação.' } : { tipo: 'success', texto: 'Avaliação enviada. Obrigado!' };
            res.redirect(voltar);
        });
    });
});

// Calcular frete e prazo na própria página do produto (usa o CEP digitado; frete grátis a partir de R$ 300)
router.post('/produto/:id/frete', (req, res) => {
    const estado = estadoPorCep(req.body.cep);
    if (!estado) return res.json({ erro: 'CEP inválido.' });

    db.get('SELECT valor, valor_promocional, peso FROM produtos WHERE id = ?', [req.params.id], (erro, produto) => {
        if (erro || !produto) return res.json({ erro: 'Produto não encontrado.' });
        const preco = produto.valor_promocional || produto.valor;

        calcularFrete(db, estado, produto.peso || 0, preco, (erro2, frete) => {
            if (erro2 || !frete) return res.json({ erro: 'Não entregamos nesse estado ainda.' });
            res.json({
                padrao: { valor: frete.valor, gratis: frete.gratis, prazo: '5 a 8 dias úteis' },
                expressa: { valor: 39.9, prazo: '2 a 3 dias úteis' }
            });
        });
    });
});

module.exports = router;
