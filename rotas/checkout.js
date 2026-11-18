const express = require('express');
const router = express.Router();
const db = require('../banco/database');
const { precisaPerfil } = require('../util/auth');
const { lerEndereco, salvarEndereco } = require('../util/enderecos');
const { calcularFrete } = require('../util/frete');
const { criarPedido, mudarStatus, FORMAS_DE_PAGAMENTO, CUPOM, DESCONTO_PIX, FRETE_EXPRESSO, PARCELAS_MAXIMAS, calcularValores } = require('../util/pedidos');

// FINALIZAR COMPRA: uma página só, com 3 caixas (endereço, forma de entrega e pagamento) e o resumo do pedido ao lado.
router.use(precisaPerfil('cliente'));

// Monta os itens do carrinho a partir do banco (não confia em preço vindo do navegador)
function itensDoCarrinho(req, callback) {
    const carrinho = req.session.carrinho || {};
    const ids = Object.keys(carrinho);
    if (!ids.length) return callback(null, []);

    db.all(`SELECT * FROM produtos WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id`, ids, (erro, produtos) => {
        if (erro) return callback(erro);
        callback(null, produtos.map(p => ({ produto: p, quantidade: carrinho[p.id], preco: p.valor_promocional || p.valor })));
    });
}

function somar(itens) {
    return {
        subtotal: Math.round(itens.reduce((t, i) => t + i.preco * i.quantidade, 0) * 100) / 100,
        pesoTotal: itens.reduce((t, i) => t + (i.produto.peso || 0) * i.quantidade, 0)
    };
}

// Sem itens no carrinho não há o que finalizar
router.use((req, res, next) => {
    if (!req.session.carrinho || !Object.keys(req.session.carrinho).length) {
        req.session.mensagem = { tipo: 'warning', texto: 'Seu carrinho está vazio.' };
        return res.redirect('/carrinho');
    }
    next();
});

// ---------- PÁGINA DO CHECKOUT ----------
router.get('/', (req, res) => {
    itensDoCarrinho(req, (erro, itens) => {
        if (erro) return res.send('Erro ao carregar o carrinho.');
        const { subtotal, pesoTotal } = somar(itens);

        db.all('SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY id', [req.session.usuario.id], (erro2, enderecos) => {
            if (erro2) return res.send('Erro ao consultar os endereços.');

            // o frete padrão muda conforme o estado do endereço: calcula um por endereço
            let i = 0;
            const proximo = () => {
                if (i < enderecos.length) {
                    const endereco = enderecos[i++];
                    return calcularFrete(db, endereco.estado, pesoTotal, subtotal, (erroFrete, frete) => {
                        endereco.fretePadrao = frete ? frete.valor : 0;
                        proximo();
                    });
                }
                const escolhido = enderecos.find(e => e.id === req.session.enderecoEntrega) || enderecos[0];
                res.render('checkout/checkout', {
                    itens, subtotal, enderecos, selecionado: escolhido ? escolhido.id : null,
                    CUPOM, DESCONTO_PIX, FRETE_EXPRESSO, PARCELAS_MAXIMAS, esconderAviso: true, footerGrande: true
                });
            };
            proximo();
        });
    });
});

// Endereços antigos do checkout em dois passos agora levam para a página única
router.get('/endereco', (req, res) => res.redirect('/checkout'));
router.get('/resumo', (req, res) => res.redirect('/checkout'));

// ---------- NOVO ENDEREÇO ----------
router.get('/endereco/novo', (req, res) => {
    res.render('checkout/endereco-novo', { erro: null, dados: {}, esconderAviso: true, footerGrande: true });
});

router.post('/endereco/novo', (req, res) => {
    const { dados, erro } = lerEndereco(req.body);
    if (erro) return res.render('checkout/endereco-novo', { erro, dados, esconderAviso: true, footerGrande: true });

    salvarEndereco(db, req.session.usuario.id, dados, (erroDb, novoId) => {
        if (erroDb) {
            console.log(erroDb.message);
            return res.render('checkout/endereco-novo', { erro: 'Erro ao salvar o endereço.', dados, esconderAviso: true, footerGrande: true });
        }
        req.session.enderecoEntrega = novoId;   // volta ao checkout já com o endereço novo escolhido
        res.redirect('/checkout');
    });
});

// ---------- FINALIZAR O PEDIDO ----------
router.post('/confirmar', (req, res) => {
    const voltar = (texto) => { req.session.mensagem = { tipo: 'danger', texto }; return res.redirect('/checkout'); };

    const forma = String(req.body.forma || '');
    const entrega = req.body.entrega === 'expressa' ? 'expressa' : 'padrao';
    const parcelas = Math.min(PARCELAS_MAXIMAS, Math.max(1, parseInt(req.body.parcelas) || 1));
    const cupom = String(req.body.cupom || '').trim();

    if (!FORMAS_DE_PAGAMENTO[forma]) return voltar('Escolha a forma de pagamento.');
    if (cupom && cupom.toUpperCase() !== CUPOM.codigo) return voltar('Cupom inválido.');

    // o cartão é só uma simulação: os dados são conferidos, mas NÃO ficam guardados
    if (forma === 'cartao') {
        const numero = String(req.body.cartao_numero || '').replace(/\D/g, '');
        const validade = String(req.body.cartao_validade || '').trim();
        const cvv = String(req.body.cartao_cvv || '').replace(/\D/g, '');
        if (numero.length < 13 || numero.length > 19) return voltar('Número do cartão inválido.');
        if (!String(req.body.cartao_nome || '').trim()) return voltar('Informe o nome impresso no cartão.');
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(validade)) return voltar('Validade do cartão inválida (use MM/AA).');
        if (cvv.length < 3 || cvv.length > 4) return voltar('CVV inválido.');
    }

    db.get('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ?', [req.body.endereco_id, req.session.usuario.id], (erro, endereco) => {
        if (erro || !endereco) return voltar('Adicione um endereço de entrega.');

        itensDoCarrinho(req, (erro2, itens) => {
            if (erro2 || !itens.length) return res.redirect('/carrinho');
            const { subtotal, pesoTotal } = somar(itens);

            calcularFrete(db, endereco.estado, pesoTotal, subtotal, (erro3, frete) => {
                if (erro3) return voltar('Não foi possível calcular o frete.');
                const valores = calcularValores(subtotal, frete.valor, entrega, forma, cupom);

                db.get('SELECT cpf FROM usuarios WHERE id = ?', [req.session.usuario.id], (erro4, usuario) => {
                    criarPedido(db, {
                        usuarioId: req.session.usuario.id,
                        endereco,
                        itens,
                        forma,
                        cpf: usuario ? usuario.cpf : '',
                        frete: valores.frete,
                        desconto: valores.desconto,
                        entrega,
                        cupom: valores.cupomValido ? CUPOM.codigo : null,
                        parcelas: forma === 'cartao' ? parcelas : 1
                    }, (erroPedido, pedidoId) => {
                        if (erroPedido) {
                            console.log(erroPedido.message);
                            if (erroPedido.produto) return voltar(`"${erroPedido.produto.nome}" acabou de ficar sem estoque. Ajuste o carrinho.`);
                            return voltar('Não foi possível confirmar o pedido. Tente novamente.');
                        }

                        const terminar = () => {
                            req.session.carrinho = {};
                            delete req.session.enderecoEntrega;
                            res.redirect('/pedidos/' + pedidoId + '?novo=1');
                        };
                        // cartão: pagamento aprovado na hora; Pix e boleto ficam aguardando o pagamento
                        if (forma === 'cartao') return mudarStatus(db, pedidoId, 'Pago', 'Pagamento aprovado - Cartão de crédito.', terminar);
                        terminar();
                    });
                });
            });
        });
    });
});

module.exports = router;
