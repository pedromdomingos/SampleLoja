// PEDIDOS DO CLIENTE: lista, acompanhar entrega (RF18 e RF19), simular pagamento e cancelar.
const express = require('express');
const router = express.Router();
const db = require('../banco/database');
const { precisaPerfil } = require('../util/auth');
const { ETAPAS, PODE_CANCELAR, FORMAS_DE_PAGAMENTO, mudarStatus, cancelarPedido } = require('../util/pedidos');

router.use(precisaPerfil('cliente'));

// Carrega um pedido que pertence ao cliente logado
function carregarPedido(req, callback) {
    db.get('SELECT * FROM pedidos WHERE id = ? AND usuario_id = ?', [req.params.id, req.session.usuario.id], callback);
}

router.get('/', (req, res) => {
    db.all('SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC', [req.session.usuario.id], (erro, pedidos) => {
        if (erro) return res.send('Erro ao consultar os pedidos.');
        res.render('pedidos/lista', { pedidos, formas: FORMAS_DE_PAGAMENTO, footerGrande: true });
    });
});

router.get('/:id', (req, res, next) => {
    carregarPedido(req, (erro, pedido) => {
        if (erro) return res.send('Erro ao consultar o pedido.');
        if (!pedido) return next();

        db.all('SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY id', [pedido.id], (erro2, itens) => {
            db.all('SELECT * FROM historico_pedido WHERE pedido_id = ? ORDER BY id', [pedido.id], (erro3, historico) => {
                res.render('pedidos/detalhe', {
                    novo: req.query.novo === '1', pedido, itens: itens || [], historico: historico || [], ETAPAS,
                    podeCancelar: PODE_CANCELAR.includes(pedido.status), formas: FORMAS_DE_PAGAMENTO, footerGrande: true
                });
            });
        });
    });
});

// Simula o pagamento (RN31: só depois de pago o pedido pode ser separado)
router.post('/:id/pagar', (req, res, next) => {
    carregarPedido(req, (erro, pedido) => {
        if (erro || !pedido) return next();
        if (pedido.status !== 'Aguardando pagamento') {
            req.session.mensagem = { tipo: 'warning', texto: 'Este pedido não está aguardando pagamento.' };
            return res.redirect('/pedidos/' + pedido.id);
        }
        mudarStatus(db, pedido.id, 'Pago', `Pagamento aprovado (simulado) - ${FORMAS_DE_PAGAMENTO[pedido.forma_pagamento]}.`, () => {
            req.session.mensagem = { tipo: 'success', texto: 'Pagamento aprovado! Seu pedido vai para a separação.' };
            res.redirect('/pedidos/' + pedido.id);
        });
    });
});

// RN33: o cliente só cancela antes do pedido ser enviado
router.post('/:id/cancelar', (req, res, next) => {
    carregarPedido(req, (erro, pedido) => {
        if (erro || !pedido) return next();
        cancelarPedido(db, pedido, (erroCancelar) => {
            req.session.mensagem = erroCancelar
                ? { tipo: 'warning', texto: 'Este pedido não pode mais ser cancelado.' }
                : { tipo: 'success', texto: 'Pedido cancelado.' };
            res.redirect('/pedidos/' + pedido.id);
        });
    });
});

module.exports = router;
