// CARRINHO: fica guardado na sessão (express-session) como um objeto { idDoProduto: quantidade }.
// Exemplo: { '3': 2, '7': 1 } = 2 unidades do produto 3 e 1 do produto 7.
const express = require('express');
const router = express.Router();
const db = require('../banco/database');
const { FRETE_GRATIS_A_PARTIR } = require('../util/frete');

// devolve o carrinho da sessão (cria vazio se ainda não existir)
function lerCarrinho(req) {
    if (!req.session.carrinho) req.session.carrinho = {};
    return req.session.carrinho;
}

function aviso(req, tipo, texto) {
    req.session.mensagem = { tipo, texto };
}

// ---------- VER O CARRINHO ----------
router.get('/', (req, res) => {
    const carrinho = lerCarrinho(req);
    const ids = Object.keys(carrinho);

    if (ids.length === 0) {
        return res.render('loja/carrinho', { itens: [], subtotal: 0, pesoTotal: 0, freteGratis: FRETE_GRATIS_A_PARTIR, footerGrande: true });
    }

    db.all(`SELECT * FROM produtos WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id`, ids, (erro, produtos) => {
        if (erro) return res.send('Erro ao carregar o carrinho.');

        // junta cada produto com a quantidade guardada na sessão
        const itens = produtos.map(p => ({
            produto: p,
            quantidade: carrinho[p.id],
            preco: p.valor_promocional || p.valor
        }));

        const subtotal = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
        const pesoTotal = itens.reduce((soma, i) => soma + (i.produto.peso || 0) * i.quantidade, 0);

        res.render('loja/carrinho', { itens, subtotal, pesoTotal, freteGratis: FRETE_GRATIS_A_PARTIR, footerGrande: true });
    });
});

// ---------- ADICIONAR ----------
router.post('/adicionar', (req, res) => {
    const voltar = req.body.voltar || '/carrinho';

    // administrador e funcionário só visualizam a loja
    if (req.session.usuario && req.session.usuario.perfil !== 'cliente') {
        aviso(req, 'warning', 'Administrador e funcionário não fazem compras. Entre com uma conta de cliente.');
        return res.redirect(voltar);
    }

    const quantidade = Math.max(1, parseInt(req.body.quantidade) || 1);

    db.get('SELECT id, estoque FROM produtos WHERE id = ?', [req.body.produto_id], (erro, produto) => {
        if (erro || !produto) {
            aviso(req, 'danger', 'Produto não encontrado.');
            return res.redirect(voltar);
        }
        if (produto.estoque <= 0) {
            aviso(req, 'warning', 'Este produto está indisponível no momento.');
            return res.redirect(voltar);
        }

        const carrinho = lerCarrinho(req);
        const total = (carrinho[produto.id] || 0) + quantidade;

        // a quantidade não pode passar do estoque
        carrinho[produto.id] = Math.min(total, produto.estoque);
        aviso(req, 'success', 'Produto adicionado ao carrinho.');

        res.redirect(req.body.comprar_agora ? '/carrinho' : voltar);
    });
});

// ---------- ALTERAR A QUANTIDADE ----------
router.post('/atualizar', (req, res) => {
    const carrinho = lerCarrinho(req);
    const id = req.body.produto_id;

    db.get('SELECT estoque FROM produtos WHERE id = ?', [id], (erro, produto) => {
        if (!erro && produto && carrinho[id]) {
            const quantidade = Math.max(1, parseInt(req.body.quantidade) || 1);
            carrinho[id] = Math.min(quantidade, produto.estoque);
        }
        res.redirect('/carrinho');
    });
});

// ---------- REMOVER ----------
router.post('/remover', (req, res) => {
    delete lerCarrinho(req)[req.body.produto_id];
    res.redirect('/carrinho');
});

module.exports = router;
