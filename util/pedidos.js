// Regras dos pedidos: status, cancelamento, baixa de estoque e criação.

const crypto = require('crypto');

// Caminho normal de um pedido. O funcionário/admin avança de uma etapa por vez.
//   Aguardando pagamento -> Pago (o cliente simula o pagamento) -> Em separação -> Enviado -> Entregue
const PROXIMO_STATUS = {
    'Pago': 'Em separação',        // RN31: só separa depois de pago
    'Em separação': 'Enviado',     // RN32: depois de separado, envia
    'Enviado': 'Entregue'
};

// RN33: só dá para cancelar ANTES de ser marcado como Enviado
const PODE_CANCELAR = ['Aguardando pagamento', 'Pago', 'Em separação'];

const ETAPAS = ['Aguardando pagamento', 'Pago', 'Em separação', 'Enviado', 'Entregue'];
const FORMAS_DE_PAGAMENTO = { pix: 'PIX', cartao: 'Cartão de crédito', boleto: 'Boleto' };

// Regras do valor do pedido (a página de checkout usa os mesmos números)
const CUPOM = { codigo: 'SAMPLE10', percentual: 10 };   // cupom de 10% sobre o subtotal
const DESCONTO_PIX = 5;                                 // 5% sobre o subtotal para quem paga no Pix
const FRETE_EXPRESSO = 39.9;
const PARCELAS_MAXIMAS = 6;                             // até 6x sem juros no cartão

// total = subtotal - descontos + frete. Os descontos do cupom e do Pix somam.
function calcularValores(subtotal, fretePadrao, entrega, forma, cupom) {
    const cupomValido = String(cupom || '').trim().toUpperCase() === CUPOM.codigo;
    let desconto = 0;
    if (cupomValido) desconto += subtotal * CUPOM.percentual / 100;
    if (forma === 'pix') desconto += subtotal * DESCONTO_PIX / 100;
    desconto = Math.round(desconto * 100) / 100;

    const frete = entrega === 'expressa' ? FRETE_EXPRESSO : fretePadrao;
    const total = Math.round((subtotal - desconto + frete) * 100) / 100;
    return { desconto, frete, total, cupomValido };
}

// Código de rastreio no formato dos Correios (ex.: SM123456789BR), gerado na confirmação do pedido (RN27)
function gerarCodigoRastreio() {
    return 'SM' + String(crypto.randomInt(0, 1000000000)).padStart(9, '0') + 'BR';
}

function registrarHistorico(db, pedidoId, status, observacao, callback) {
    db.run(
        `INSERT INTO historico_pedido (pedido_id, status, observacao, criado_em) VALUES (?, ?, ?, datetime('now', 'localtime'))`,
        [pedidoId, status, observacao || null],
        (erro) => callback && callback(erro)
    );
}

function mudarStatus(db, pedidoId, novoStatus, observacao, callback) {
    db.run('UPDATE pedidos SET status = ? WHERE id = ?', [novoStatus, pedidoId], (erro) => {
        if (erro) return callback(erro);
        registrarHistorico(db, pedidoId, novoStatus, observacao, callback);
    });
}

// Executa as tarefas uma por vez: cada tarefa recebe "feito(erro)"
function emSequencia(tarefas, fim) {
    let i = 0;
    const proxima = (erro) => {
        if (erro || i >= tarefas.length) return fim(erro || null);
        tarefas[i++](proxima);
    };
    proxima();
}

// Devolve os itens ao estoque
function devolverEstoque(db, itens, callback) {
    emSequencia(
        itens.filter(i => i.produto_id).map(i => (feito) =>
            db.run('UPDATE produtos SET estoque = estoque + ? WHERE id = ?', [i.quantidade, i.produto_id], (erro) => feito(erro))),
        callback
    );
}

// Cancela o pedido (RN26: se já estava pago, o valor é devolvido - simulado) e devolve o estoque
function cancelarPedido(db, pedido, callback) {
    if (!PODE_CANCELAR.includes(pedido.status)) {
        return callback(new Error('Este pedido não pode mais ser cancelado.'));
    }
    db.all('SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = ?', [pedido.id], (erro, itens) => {
        if (erro) return callback(erro);
        devolverEstoque(db, itens, (erroEstoque) => {
            if (erroEstoque) return callback(erroEstoque);
            const observacao = pedido.status === 'Aguardando pagamento'
                ? 'Pedido cancelado.'
                : 'Pedido cancelado. O valor pago será devolvido (simulado).';
            mudarStatus(db, pedido.id, 'Cancelado', observacao, callback);
        });
    });
}

// Cria o pedido: baixa o estoque (RN25), grava o pedido, os itens e o primeiro registro do histórico.
// itens = [{ produto: <linha de produtos>, quantidade }]
function criarPedido(db, dados, callback) {
    const { usuarioId, endereco, itens, forma, cpf, frete, desconto, entrega, cupom, parcelas } = dados;

    const subtotal = Math.round(itens.reduce((t, i) => t + (i.produto.valor_promocional || i.produto.valor) * i.quantidade, 0) * 100) / 100;
    const pesoTotal = itens.reduce((t, i) => t + (i.produto.peso || 0) * i.quantidade, 0);
    const total = Math.round((subtotal - desconto + frete) * 100) / 100;
    const codigo = gerarCodigoRastreio();
    const baixados = [];   // para desfazer se algum item acabar no meio do caminho

    // 1) baixa o estoque item por item (só baixa se ainda houver quantidade suficiente)
    const baixas = itens.map(i => (feito) => {
        db.run('UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?',
            [i.quantidade, i.produto.id, i.quantidade], function (erro) {
                if (erro) return feito(erro);
                if (this.changes === 0) return feito(Object.assign(new Error('Estoque insuficiente'), { produto: i.produto }));
                baixados.push({ produto_id: i.produto.id, quantidade: i.quantidade });
                feito();
            });
    });

    emSequencia(baixas, (erroBaixa) => {
        if (erroBaixa) return devolverEstoque(db, baixados, () => callback(erroBaixa));

        db.run(
            `INSERT INTO pedidos
                (usuario_id, status, forma_pagamento, cpf, subtotal, frete, total, peso_total, codigo_rastreio,
                 dest_nome, dest_telefone, dest_cep, dest_estado, dest_cidade, dest_bairro, dest_rua, dest_numero, dest_complemento,
                 desconto, entrega, cupom, parcelas, criado_em)
             VALUES (?, 'Aguardando pagamento', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
            [usuarioId, forma, cpf || '', subtotal, frete, total, pesoTotal, codigo,
             endereco.destinatario, endereco.telefone, endereco.cep, endereco.estado, endereco.cidade,
             endereco.bairro, endereco.rua, endereco.numero, endereco.complemento,
             desconto, entrega, cupom || null, parcelas || 1],
            function (erroPedido) {
                if (erroPedido) return devolverEstoque(db, baixados, () => callback(erroPedido));
                const pedidoId = this.lastID;

                const gravarItens = itens.map(i => (feito) => db.run(
                    `INSERT INTO itens_pedido (pedido_id, produto_id, nome, imagem, preco_unitario, quantidade, peso) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [pedidoId, i.produto.id, i.produto.nome, i.produto.imagem, i.produto.valor_promocional || i.produto.valor, i.quantidade, i.produto.peso || 0],
                    (erro) => feito(erro)));

                emSequencia(gravarItens, (erroItens) => {
                    if (erroItens) return callback(erroItens);
                    registrarHistorico(db, pedidoId, 'Aguardando pagamento',
                        `Pedido confirmado. Código de rastreio gerado: ${codigo}.`, (erroHist) => callback(erroHist, pedidoId));
                });
            }
        );
    });
}

module.exports = {
    PROXIMO_STATUS, PODE_CANCELAR, ETAPAS, FORMAS_DE_PAGAMENTO, CUPOM, DESCONTO_PIX, FRETE_EXPRESSO, PARCELAS_MAXIMAS, calcularValores,
    gerarCodigoRastreio, registrarHistorico, mudarStatus, cancelarPedido, criarPedido
};
