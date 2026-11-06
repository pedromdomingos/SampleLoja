// Funções compartilhadas para endereço de entrega.
// Usadas em "Configurações" (rotas/cliente.js) e na etapa de compra (rotas/checkout.js).

const { somenteNumeros } = require('./validacoes');

// Lê o formulário de endereço, limpa os dados e valida.
// Retorna { dados, erro }  ->  erro é null quando está tudo certo.
function lerEndereco(d) {
    const dados = {
        destinatario: String(d.destinatario || '').trim(),
        telefone: somenteNumeros(d.telefone),
        cep: somenteNumeros(d.cep),
        estado: String(d.estado || '').trim().toUpperCase(),
        cidade: String(d.cidade || '').trim(),
        bairro: String(d.bairro || '').trim(),
        rua: String(d.rua || '').trim(),
        numero: String(d.numero || '').trim(),
        // RN15: o complemento é obrigatório; quem não tem marca "Sem complemento"
        complemento: d.sem_complemento ? 'Sem complemento' : String(d.complemento || '').trim()
    };

    const obrigatorios = ['destinatario', 'telefone', 'cep', 'estado', 'cidade', 'bairro', 'rua', 'numero', 'complemento'];
    let erro = null;

    if (obrigatorios.some(c => !dados[c])) erro = 'Preencha todos os campos do endereço (se não houver complemento, marque "Sem complemento").';
    else if (dados.cep.length !== 8) erro = 'CEP inválido (8 dígitos).';
    else if (!/^[A-Z]{2}$/.test(dados.estado)) erro = 'Informe o estado com a sigla (ex: SC).';

    return { dados, erro };
}

// O CPF não fica mais no endereço (é pedido só na compra); a coluna antiga recebe texto vazio.
// Grava o endereço do cliente e devolve o id do novo endereço: callback(erro, novoId)
function salvarEndereco(db, usuarioId, e, callback) {
    db.run(
        `INSERT INTO enderecos
            (usuario_id, destinatario, cpf, telefone, cep, estado, cidade, bairro, rua, numero, complemento)
         VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuarioId, e.destinatario, e.telefone, e.cep, e.estado,
         e.cidade, e.bairro, e.rua, e.numero, e.complemento || null],
        function (erro) {
            callback(erro, this ? this.lastID : null);
        }
    );
}

module.exports = { lerEndereco, salvarEndereco };
