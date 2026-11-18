// Avaliações dos produtos: só quem comprou o produto (pedido com status "Entregue") pode avaliar,
// e cada cliente avalia um produto uma única vez (ver a trava UNIQUE na tabela "avaliacoes").
const db = require('../banco/database');

// média e lista de avaliações de um produto
function listarAvaliacoes(produtoId, callback) {
    db.all('SELECT * FROM avaliacoes WHERE produto_id = ? ORDER BY id DESC', [produtoId], (erro, avaliacoes) => {
        if (erro) return callback(erro);
        const media = avaliacoes.length ? avaliacoes.reduce((t, a) => t + a.nota, 0) / avaliacoes.length : 0;
        callback(null, avaliacoes, Math.round(media * 10) / 10);
    });
}

// o cliente pode avaliar se tiver algum pedido Entregue com esse produto e ainda não tiver avaliado
function podeAvaliar(usuarioId, produtoId, callback) {
    if (!usuarioId) return callback(false);
    db.get(`SELECT ip.id FROM itens_pedido ip
            JOIN pedidos p ON p.id = ip.pedido_id
            WHERE p.usuario_id = ? AND ip.produto_id = ? AND p.status = 'Entregue'`, [usuarioId, produtoId], (erro, comprou) => {
        if (erro || !comprou) return callback(false);
        db.get('SELECT id FROM avaliacoes WHERE produto_id = ? AND usuario_id = ?', [produtoId, usuarioId], (erro2, jaAvaliou) => {
            callback(!erro2 && !jaAvaliou);
        });
    });
}

function salvarAvaliacao(usuarioId, nome, produtoId, nota, comentario, callback) {
    db.run(`INSERT INTO avaliacoes (produto_id, usuario_id, nome, nota, comentario, criado_em) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [produtoId, usuarioId, nome, nota, comentario || null], callback);
}

module.exports = { listarAvaliacoes, podeAvaliar, salvarAvaliacao };
