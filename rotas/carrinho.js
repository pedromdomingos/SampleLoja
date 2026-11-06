// CARRINHO (RF7 a RF10). Fica guardado na sessão: { idDoProduto: quantidade }.
// Regras: quantidade mínima 1 e máxima = estoque disponível (RN28 e RN29); produto sem estoque não entra (RN20).
const { FRETE_GRATIS_A_PARTIR } = require('../util/frete');
const express = require('express');
const router = express.Router();
const db = require('../banco/database');

function lerCarrinho(req) {
    if (!req.session.carrinho) req.session.carrinho = {};
    return req.session.carrinho;
}

// Só aceita voltar para caminhos do próprio site (evita redirecionar para outro endereço)
function caminhoSeguro(valor, padrao) {
    const v = String(valor || '');
    return v.startsWith('/') && !v.startsWith('//') ? v : padrao;
}

function aviso(req, tipo, texto) {
    req.session.mensagem = { tipo, texto };
}

// ---------- VER O CARRINHO ----------
router.get('/', (req, res) => {
    const carrinho = lerCarrinho(req);
    const ids = Object.keys(carrinho);
    if (!ids.length) return res.render('loja/carrinho', { itens: [], subtotal: 0, pesoTotal: 0, freteGratis: FRETE_GRATIS_A_PARTIR, footerGrande: true });

    db.all(`SELECT * FROM produtos WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id`, ids, (erro, produtos) => {
        if (erro) return res.send('Erro ao carregar o carrinho.');

        const itens = [];
        let ajustou = false;
        produtos.forEach(p => {
            let quantidade = carrinho[p.id];
            if (p.estoque <= 0) { delete carrinho[p.id]; ajustou = true; return; }      // acabou o estoque: sai do carrinho
            if (quantidade > p.estoque) { quantidade = p.estoque; carrinho[p.id] = quantidade; ajustou = true; }
            itens.push({ produto: p, quantidade, preco: p.valor_promocional || p.valor });
        });
        // produtos que não existem mais saem do carrinho
        ids.forEach(id => { if (!produtos.find(p => String(p.id) === String(id))) { delete carrinho[id]; ajustou = true; } });

        if (ajustou) res.locals.mensagem = res.locals.mensagem || { tipo: 'warning', texto: 'Ajustamos o carrinho de acordo com o estoque disponível.' };

        const subtotal = Math.round(itens.reduce((t, i) => t + i.preco * i.quantidade, 0) * 100) / 100;
        const pesoTotal = itens.reduce((t, i) => t + (i.produto.peso || 0) * i.quantidade, 0);
        res.render('loja/carrinho', { itens, subtotal, pesoTotal, freteGratis: FRETE_GRATIS_A_PARTIR, footerGrande: true });
    });
});

// ---------- ADICIONAR ----------
router.post('/adicionar', (req, res) => {
    const voltar = caminhoSeguro(req.body.voltar, '/carrinho');

    // administrador e funcionário só visualizam a loja
    if (req.session.usuario && req.session.usuario.perfil !== 'cliente') {
        aviso(req, 'warning', 'Administrador e funcionário não fazem compras. Entre com uma conta de cliente.');
        return res.redirect(voltar);
    }

    const quantidade = Math.max(1, parseInt(req.body.quantidade, 10) || 1);

    db.get('SELECT id, nome, estoque FROM produtos WHERE id = ?', [req.body.produto_id], (erro, produto) => {
        if (erro || !produto) { aviso(req, 'danger', 'Produto não encontrado.'); return res.redirect(voltar); }
        if (produto.estoque <= 0) { aviso(req, 'warning', 'Este produto está indisponível no momento.'); return res.redirect(voltar); }

        const carrinho = lerCarrinho(req);
        const atual = carrinho[produto.id] || 0;
        const novo = Math.min(atual + quantidade, produto.estoque);

        carrinho[produto.id] = novo;
        if (atual + quantidade > produto.estoque) aviso(req, 'warning', `Só há ${produto.estoque} unidade(s) em estoque. Ajustamos a quantidade.`);
        else aviso(req, 'success', 'Produto adicionado ao carrinho.');

        res.redirect(req.body.comprar_agora ? '/carrinho' : voltar);
    });
});

// ---------- ALTERAR A QUANTIDADE ----------
router.post('/atualizar', (req, res) => {
    const carrinho = lerCarrinho(req);
    const id = String(req.body.produto_id);
    if (!carrinho[id]) return res.redirect('/carrinho');

    db.get('SELECT estoque FROM produtos WHERE id = ?', [id], (erro, produto) => {
        if (erro || !produto) { delete carrinho[id]; return res.redirect('/carrinho'); }
        let quantidade = parseInt(req.body.quantidade, 10);
        if (isNaN(quantidade) || quantidade < 1) quantidade = 1;
        if (quantidade > produto.estoque) {
            quantidade = produto.estoque;
            aviso(req, 'warning', `Só há ${produto.estoque} unidade(s) em estoque.`);
        }
        carrinho[id] = quantidade;
        res.redirect('/carrinho');
    });
});

// ---------- REMOVER ----------
router.post('/remover', (req, res) => {
    delete lerCarrinho(req)[String(req.body.produto_id)];
    aviso(req, 'success', 'Produto removido do carrinho.');
    res.redirect('/carrinho');
});

module.exports = router;
