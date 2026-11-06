const express = require('express');
const router = express.Router();
const db = require('../banco/database');
const { precisaPerfil } = require('../util/auth');
const { lerEndereco, salvarEndereco } = require('../util/enderecos');
const { cpfValido, somenteNumeros } = require('../util/validacoes');
const { calcularFrete } = require('../util/frete');
const { criarPedido, FORMAS_DE_PAGAMENTO } = require('../util/pedidos');

// FINALIZAR COMPRA, em dois passos:
//   1) /checkout/endereco -> escolher (ou cadastrar) o endereço de entrega. É OBRIGATÓRIO para comprar (RN15 e RN16):
//        - cliente sem endereço  -> precisa cadastrar um agora
//        - cliente com endereço  -> escolhe um dos cadastrados OU cadastra um novo
//   2) /checkout/resumo   -> confere itens, frete e total, informa o CPF (só na compra) e escolhe o pagamento
router.use(precisaPerfil('cliente'));

function listarEnderecos(usuarioId, callback) {
    db.all('SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY id', [usuarioId], callback);
}

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

// Sem itens no carrinho não há o que finalizar
router.use((req, res, next) => {
    if (!req.session.carrinho || !Object.keys(req.session.carrinho).length) {
        req.session.mensagem = { tipo: 'warning', texto: 'Seu carrinho está vazio.' };
        return res.redirect('/carrinho');
    }
    next();
});

// ---------- PASSO 1: ENDEREÇO ----------
router.get('/endereco', (req, res) => {
    listarEnderecos(req.session.usuario.id, (erro, enderecos) => {
        if (erro) return res.send('Erro ao consultar endereços.');
        res.render('checkout/endereco', {
            enderecos,
            erro: null,
            dados: {},
            abrirNovo: false,
            selecionado: req.session.enderecoEntrega || (enderecos[0] ? enderecos[0].id : null),
            esconderAviso: true
        });
    });
});

router.post('/endereco', (req, res) => {
    const usuarioId = req.session.usuario.id;
    const escolha = req.body.endereco_id;   // id de um endereço cadastrado, ou "novo"

    const mostrarErro = (texto, dados) => {
        listarEnderecos(usuarioId, (erro, enderecos) => {
            res.render('checkout/endereco', {
                enderecos: enderecos || [], erro: texto, dados: dados || {}, abrirNovo: true, selecionado: null, esconderAviso: true
            });
        });
    };

    // 1) escolheu um endereço que já tem
    if (escolha && escolha !== 'novo') {
        db.get('SELECT id FROM enderecos WHERE id = ? AND usuario_id = ?', [escolha, usuarioId], (erro, endereco) => {
            if (erro || !endereco) return mostrarErro('Escolha um endereço válido.');
            req.session.enderecoEntrega = endereco.id;
            res.redirect('/checkout/resumo');
        });
        return;
    }

    // 2) cadastrando um endereço novo
    const { dados, erro } = lerEndereco(req.body);
    if (erro) return mostrarErro(erro, dados);

    salvarEndereco(db, usuarioId, dados, (erroDb, novoId) => {
        if (erroDb) {
            console.log(erroDb.message);
            return mostrarErro('Erro ao salvar o endereço.', dados);
        }
        req.session.enderecoEntrega = novoId;
        res.redirect('/checkout/resumo');
    });
});

// ---------- PASSO 2: RESUMO, CPF E PAGAMENTO ----------
function carregarResumo(req, callback) {
    if (!req.session.enderecoEntrega) return callback(null, null);

    db.get('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ?', [req.session.enderecoEntrega, req.session.usuario.id], (erro, endereco) => {
        if (erro || !endereco) { delete req.session.enderecoEntrega; return callback(erro, null); }

        itensDoCarrinho(req, (erro2, itens) => {
            if (erro2) return callback(erro2);
            const subtotal = Math.round(itens.reduce((t, i) => t + i.preco * i.quantidade, 0) * 100) / 100;
            const pesoTotal = itens.reduce((t, i) => t + (i.produto.peso || 0) * i.quantidade, 0);

            calcularFrete(db, endereco.estado, pesoTotal, subtotal, (erro3, frete) => {
                if (erro3) return callback(erro3);
                db.get('SELECT cpf FROM usuarios WHERE id = ?', [req.session.usuario.id], (erro4, usuario) => {
                    callback(erro4, { endereco, itens, subtotal, pesoTotal, frete, total: Math.round((subtotal + frete.valor) * 100) / 100, cpf: usuario ? usuario.cpf : null });
                });
            });
        });
    });
}

router.get('/resumo', (req, res) => {
    carregarResumo(req, (erro, resumo) => {
        if (erro) { console.log(erro.message); return res.send('Erro ao montar o resumo.'); }
        if (!resumo) return res.redirect('/checkout/endereco');
        res.render('checkout/resumo', Object.assign({ formas: FORMAS_DE_PAGAMENTO, esconderAviso: true, footerGrande: true }, resumo));
    });
});

// ---------- CONFIRMAR O PEDIDO ----------
router.post('/confirmar', (req, res) => {
    const voltar = (texto) => { req.session.mensagem = { tipo: 'danger', texto }; return res.redirect('/checkout/resumo'); };
    const forma = String(req.body.forma || '');
    const cpf = somenteNumeros(req.body.cpf);

    if (!FORMAS_DE_PAGAMENTO[forma]) return voltar('Escolha a forma de pagamento.');
    if (!cpfValido(cpf)) return voltar('Informe um CPF válido para finalizar a compra.');

    carregarResumo(req, (erro, resumo) => {
        if (erro || !resumo) return res.redirect('/checkout/endereco');
        if (!resumo.itens.length) return res.redirect('/carrinho');

        // o CPF informado fica salvo na conta (não precisa digitar de novo nas próximas compras)
        db.run('UPDATE usuarios SET cpf = ? WHERE id = ?', [cpf, req.session.usuario.id], (erroCpf) => {
            if (erroCpf) {
                const repetido = String(erroCpf.message).includes('UNIQUE');
                return voltar(repetido ? 'Este CPF já está cadastrado em outra conta.' : 'Erro ao salvar o CPF.');
            }

            criarPedido(db, {
                usuarioId: req.session.usuario.id,
                endereco: {
                    destinatario: resumo.endereco.destinatario, telefone: resumo.endereco.telefone, cep: resumo.endereco.cep,
                    estado: resumo.endereco.estado, cidade: resumo.endereco.cidade, bairro: resumo.endereco.bairro,
                    rua: resumo.endereco.rua, numero: resumo.endereco.numero, complemento: resumo.endereco.complemento
                },
                itens: resumo.itens,
                forma,
                cpf,
                frete: resumo.frete.valor
            }, (erroPedido, pedidoId) => {
                if (erroPedido) {
                    console.log(erroPedido.message);
                    if (erroPedido.produto) return voltar(`"${erroPedido.produto.nome}" acabou de ficar sem estoque. Ajuste o carrinho.`);
                    return voltar('Não foi possível confirmar o pedido. Tente novamente.');
                }
                // pedido criado: limpa o carrinho
                req.session.carrinho = {};
                delete req.session.enderecoEntrega;
                req.session.mensagem = { tipo: 'success', texto: 'Pedido confirmado! Agora é só simular o pagamento.' };
                res.redirect('/pedidos/' + pedidoId + '?novo=1');
            });
        });
    });
});

module.exports = router;
