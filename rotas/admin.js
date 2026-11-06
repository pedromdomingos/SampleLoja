const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../banco/database');
const upload = require('../util/imagens');
const { precisaPerfil } = require('../util/auth');
const { somenteNumeros, cpfValido, emailValido, senhaValida } = require('../util/validacoes');
const { TIPOS, tiposSelecionaveis } = require('../util/tipos');
const { PROXIMO_STATUS, FORMAS_DE_PAGAMENTO, ETAPAS, mudarStatus, cancelarPedido, PODE_CANCELAR } = require('../util/pedidos');

router.use(precisaPerfil('admin', 'funcionario'));

const opcional = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);

function apagarImagem(nomeArquivo) {
    if (!nomeArquivo) return;
    fs.unlink(path.join(__dirname, '..', 'public', 'uploads', nomeArquivo), () => {});
}

router.get('/index', (req, res) => res.render('admin/index-admin'));

//================== CATEGORIAS ==================//
router.get('/categorias', (req, res) => {
    db.all('SELECT * FROM categorias ORDER BY id', [], (erro, categorias) => {
        if (erro) return res.send('Erro ao consultar categorias.');
        res.render('admin/categorias/lista', { categorias, tipos: TIPOS });
    });
});

router.get('/categorias/form-cadastrar', (req, res) => {
    res.render('admin/categorias/cadastro', { tipos: TIPOS, selecionaveis: tiposSelecionaveis() });
});

router.post('/categorias/cadastrar', (req, res) => {
    const nome = String(req.body.nome || '').trim();
    const descricao = opcional(req.body.descricao);
    const tipo = String(req.body.tipo || '');

    if (!nome) {
        req.session.mensagem = { tipo: 'danger', texto: 'Informe o nome da categoria.' };
        return res.redirect('/admin/categorias/form-cadastrar');
    }
    // o tipo precisa ser um dos tipos disponíveis (o antigo "Outros" não existe mais)
    if (!tiposSelecionaveis().includes(tipo)) {
        req.session.mensagem = { tipo: 'danger', texto: 'Escolha o tipo da categoria.' };
        return res.redirect('/admin/categorias/form-cadastrar');
    }

    db.run(
        `INSERT INTO categorias (nome, descricao, tipo) VALUES (?, ?, ?)`,
        [nome, descricao, tipo],
        (erro) => {
            if (erro) {
                if (String(erro.message).includes('UNIQUE')) {
                    req.session.mensagem = { tipo: 'danger', texto: 'Já existe uma categoria com este nome.' };
                    return res.redirect('/admin/categorias/form-cadastrar');
                }
                return res.send('Erro ao cadastrar categoria.');
            }
            req.session.mensagem = { tipo: 'success', texto: 'Categoria cadastrada com sucesso!' };
            res.redirect('/admin/categorias');
        }
    );
});

router.post('/categorias/:id/excluir', (req, res) => {
    const id = req.params.id;
    db.get(
        `SELECT COUNT(*) AS total FROM produtos
         WHERE categoria = (SELECT nome FROM categorias WHERE id = ?)`,
        [id],
        (erro, linha) => {
            if (erro) {
                req.session.mensagem = { tipo: 'danger', texto: 'Erro ao excluir categoria.' };
                return res.redirect('/admin/categorias');
            }
            if (linha.total > 0) {
                req.session.mensagem = { tipo: 'warning', texto: `Não é possível excluir: existem ${linha.total} produto(s) nesta categoria.` };
                return res.redirect('/admin/categorias');
            }
            db.run('DELETE FROM categorias WHERE id = ?', [id], (erroDel) => {
                if (erroDel) {
                    req.session.mensagem = { tipo: 'danger', texto: 'Erro ao excluir categoria.' };
                    return res.redirect('/admin/categorias');
                }
                req.session.mensagem = { tipo: 'success', texto: 'Categoria excluída.' };
                res.redirect('/admin/categorias');
            });
        }
    );
});

//================== PRODUTOS ==================//
router.get('/produtos', (req, res) => {
    db.all('SELECT * FROM produtos ORDER BY id', [], (erro, produtos) => {
        if (erro) return res.send('Erro ao consultar produtos.');
        res.render('admin/produtos/lista', { produtos, tipos: TIPOS });
    });
});

router.get('/produtos/form-cadastrar', (req, res) => {
    db.all('SELECT * FROM categorias ORDER BY id', [], (erro, categorias) => {
        if (erro) return res.send('Erro ao consultar categorias.');
        res.render('admin/produtos/cadastro', { categorias, tipos: TIPOS });
    });
});

router.post('/produtos/cadastrar', upload.single('imagem'), (req, res) => {
    const imagem = req.file ? req.file.filename : null;
    const b = req.body;

    const recusar = (texto) => {
        apagarImagem(imagem);
        req.session.mensagem = { tipo: 'danger', texto };
        return res.redirect('/admin/produtos/form-cadastrar');
    };

    const nome = String(b.nome || '').trim();
    const categoria = String(b.categoria || '').trim();
    const descricao = String(b.descricao || '').trim();
    const ano = Number(b.ano_lancamento);
    const valor = Number(b.valor);
    const estoque = Number(b.estoque);
    const peso = Number(b.peso);
    const promo = opcional(b.valor_promocional);

    // Informações principais obrigatórias: nome, categoria, ano e descrição
    if (!nome || !categoria || !descricao || !String(b.ano_lancamento || '').trim()) {
        return recusar('Nome, categoria, ano de lançamento e descrição são obrigatórios.');
    }
    if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
        return recusar('Informe um ano de lançamento válido (entre 1900 e 2100).');
    }
    if (!imagem) return recusar('A imagem do produto é obrigatória.');
    if (!String(b.valor || '').trim() || !(valor >= 0)) return recusar('Informe um valor válido.');
    if (!String(b.estoque || '').trim() || !Number.isInteger(estoque) || estoque < 0) return recusar('Informe um estoque válido.');
    // o peso é obrigatório porque o frete é calculado a partir dele (RN35)
    if (!String(b.peso || '').trim() || !Number.isInteger(peso) || peso <= 0) return recusar('Informe o peso do produto em gramas (usado no cálculo do frete).');
    if (promo !== null && !(Number(promo) >= 0 && Number(promo) < valor)) {
        return recusar('O valor promocional deve ser menor que o valor normal.');
    }

    // O tipo do produto vem da CATEGORIA escolhida (e não do formulário)
    db.get('SELECT tipo FROM categorias WHERE nome = ?', [categoria], (erroCat, cat) => {
        if (erroCat || !cat) return recusar('Categoria inválida.');

        const tipo = TIPOS[cat.tipo] ? cat.tipo : 'outros';

        // Especificações do tipo (campos definidos em util/tipos.js)
        const especificacoes = {};
        for (const campo of TIPOS[tipo].campos) {
            const valorCampo = String(b[campo.nome] === undefined ? '' : b[campo.nome]).trim();

            if (campo.obrigatorio && !valorCampo) {
                return recusar(`${TIPOS[tipo].rotulo}: informe ${campo.rotulo.toLowerCase()}.`);
            }
            if (valorCampo && campo.tipo === 'numero' && !(Number.isInteger(Number(valorCampo)) && Number(valorCampo) > 0)) {
                return recusar(`${campo.rotulo} deve ser um número inteiro maior que zero.`);
            }
            if (valorCampo && campo.tipo === 'select' && !campo.opcoes.includes(valorCampo)) {
                return recusar(`Opção inválida em ${campo.rotulo.toLowerCase()}.`);
            }
            especificacoes[campo.nome] = valorCampo || null;
        }

        // Cada chave abaixo é uma coluna da tabela produtos.
        // (Todos os produtos são novos e da própria SAMPLE: não há condição nem fornecedor.)
        const campos = Object.assign({
            nome, categoria, valor, estoque, descricao, imagem,
            // artista e gênero são opcionais; no banco a coluna não aceita NULL, então vai texto vazio
            artista: String(b.artista || '').trim(),
            genero: String(b.genero || '').trim(),
            ano_lancamento: ano,
            gravadora: opcional(b.gravadora),
            valor_promocional: promo,
            peso,
            destaque: b.destaque ? 1 : 0,
            tipo_produto: tipo
        }, especificacoes);
        const colunas = Object.keys(campos);

        db.run(
            `INSERT INTO produtos (${colunas.join(', ')}, data_cadastro)
             VALUES (${colunas.map(() => '?').join(', ')}, datetime('now','localtime'))`,
            Object.values(campos),
            (erro) => {
                if (erro) {
                    console.log(erro.message);
                    return recusar('Erro ao cadastrar produto.');
                }
                req.session.mensagem = { tipo: 'success', texto: 'Produto cadastrado com sucesso!' };
                res.redirect('/admin/produtos');
            }
        );
    });
});

router.post('/produtos/:id/excluir', (req, res) => {
    const id = req.params.id;
    db.get('SELECT imagem FROM produtos WHERE id = ?', [id], (erro, produto) => {
        if (erro || !produto) {
            req.session.mensagem = { tipo: 'danger', texto: 'Produto não encontrado.' };
            return res.redirect('/admin/produtos');
        }
        db.run('DELETE FROM produtos WHERE id = ?', [id], (erroDel) => {
            if (erroDel) {
                req.session.mensagem = { tipo: 'danger', texto: 'Erro ao excluir produto.' };
                return res.redirect('/admin/produtos');
            }
            apagarImagem(produto.imagem);
            req.session.mensagem = { tipo: 'success', texto: 'Produto excluído.' };
            res.redirect('/admin/produtos');
        });
    });
});

//================== USUÁRIOS ==================//
router.get('/usuarios', precisaPerfil('admin'), (req, res) => {
    db.all(
        `SELECT id, nome, email, cpf, telefone, perfil, ativo, data_cadastro
         FROM usuarios ORDER BY perfil, nome`,
        [],
        (erro, usuarios) => {
            if (erro) return res.send('Erro ao consultar usuários.');
            res.render('admin/usuarios/lista', { usuarios });
        }
    );
});

router.get('/usuarios/form-cadastrar', precisaPerfil('admin'), (req, res) => {
    res.render('admin/usuarios/cadastro');
});

router.post('/usuarios/cadastrar', precisaPerfil('admin'), (req, res) => {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const cpf = somenteNumeros(req.body.cpf);
    const telefone = somenteNumeros(req.body.telefone);
    const senha = String(req.body.senha || '');
    const perfil = req.body.perfil;

    const recusar = (texto) => {
        req.session.mensagem = { tipo: 'danger', texto };
        return res.redirect('/admin/usuarios/form-cadastrar');
    };

    // Admin e funcionário: nome, CPF, e-mail, telefone, senha e confirmar senha são obrigatórios
    if (!nome || !email || !cpf || !telefone || !senha || !perfil) return recusar('Preencha todos os campos obrigatórios.');
    if (!['admin', 'funcionario'].includes(perfil)) return recusar('Perfil inválido.');
    if (!emailValido(email)) return recusar('E-mail inválido.');
    if (!cpfValido(cpf)) return recusar('CPF inválido.');
    if (!senhaValida(senha)) return recusar('A senha deve ter pelo menos 8 caracteres.');
    if (senha !== req.body.confirmar_senha) return recusar('As senhas não conferem.');

    db.run(
        `INSERT INTO usuarios (nome, cpf, email, telefone, senha, perfil, data_cadastro)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [nome, cpf, email, telefone, bcrypt.hashSync(senha, 10), perfil],
        (erro) => {
            if (erro) {
                if (String(erro.message).includes('UNIQUE')) return recusar('Já existe uma conta com este e-mail ou CPF.');
                return recusar('Erro ao cadastrar usuário.');
            }
            req.session.mensagem = { tipo: 'success', texto: 'Usuário cadastrado com sucesso!' };
            res.redirect('/admin/usuarios');
        }
    );
});

router.post('/usuarios/:id/alternar-ativo', precisaPerfil('admin'), (req, res) => {
    const id = Number(req.params.id);
    if (id === req.session.usuario.id) {
        req.session.mensagem = { tipo: 'warning', texto: 'Você não pode desativar a própria conta.' };
        return res.redirect('/admin/usuarios');
    }
    db.run(`UPDATE usuarios SET ativo = 1 - ativo WHERE id = ?`, [id], (erro) => {
        if (erro) console.log(erro.message);
        req.session.mensagem = { tipo: 'success', texto: 'Situação da conta atualizada.' };
        res.redirect('/admin/usuarios');
    });
});

//================== PEDIDOS (admin e funcionário) ==================//
// Aqui a loja acompanha os pedidos e atualiza o status (RF23 e RF35).
// Caminho: Pago -> Em separação -> Enviado -> Entregue (RN31 e RN32). O cliente simula o pagamento.
router.get('/pedidos', (req, res) => {
    db.all(
        `SELECT p.*, u.nome AS cliente FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id ORDER BY p.id DESC`,
        [],
        (erro, pedidos) => {
            if (erro) return res.send('Erro ao consultar pedidos.');
            res.render('admin/pedidos/lista', { pedidos, formas: FORMAS_DE_PAGAMENTO });
        }
    );
});

router.get('/pedidos/:id', (req, res, next) => {
    db.get(`SELECT p.*, u.nome AS cliente, u.email AS email FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`, [req.params.id], (erro, pedido) => {
        if (erro) return res.send('Erro ao consultar o pedido.');
        if (!pedido) return next();
        db.all('SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY id', [pedido.id], (erro2, itens) => {
            db.all('SELECT * FROM historico_pedido WHERE pedido_id = ? ORDER BY id', [pedido.id], (erro3, historico) => {
                res.render('admin/pedidos/detalhe', {
                    pedido, itens: itens || [], historico: historico || [], ETAPAS, formas: FORMAS_DE_PAGAMENTO,
                    proximo: PROXIMO_STATUS[pedido.status] || null, podeCancelar: PODE_CANCELAR.includes(pedido.status)
                });
            });
        });
    });
});

// Avança o pedido para a próxima etapa
router.post('/pedidos/:id/avancar', (req, res, next) => {
    db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id], (erro, pedido) => {
        if (erro || !pedido) return next();
        const proximo = PROXIMO_STATUS[pedido.status];
        if (!proximo) {
            req.session.mensagem = { tipo: 'warning', texto: pedido.status === 'Aguardando pagamento'
                ? 'O pedido só pode ser separado depois que o cliente pagar.' : 'Este pedido não tem uma próxima etapa.' };
            return res.redirect('/admin/pedidos/' + pedido.id);
        }
        mudarStatus(db, pedido.id, proximo, `Status atualizado por ${req.session.usuario.nome}.`, () => {
            req.session.mensagem = { tipo: 'success', texto: `Pedido #${pedido.id}: ${proximo}.` };
            res.redirect('/admin/pedidos/' + pedido.id);
        });
    });
});

router.post('/pedidos/:id/cancelar', (req, res, next) => {
    db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id], (erro, pedido) => {
        if (erro || !pedido) return next();
        cancelarPedido(db, pedido, (erroCancelar) => {
            req.session.mensagem = erroCancelar
                ? { tipo: 'warning', texto: 'Este pedido não pode mais ser cancelado (já foi enviado).' }
                : { tipo: 'success', texto: `Pedido #${pedido.id} cancelado e itens devolvidos ao estoque.` };
            res.redirect('/admin/pedidos/' + pedido.id);
        });
    });
});

//================== FRETE (admin e funcionário) ==================//
// Valor base + valor por kg de cada região. Pode ser mudado a qualquer momento (RN35).
router.get('/frete', (req, res) => {
    db.all('SELECT * FROM frete_regioes ORDER BY id', [], (erro, regioes) => {
        if (erro) return res.send('Erro ao consultar o frete.');
        res.render('admin/frete', { regioes });
    });
});

router.post('/frete', (req, res) => {
    db.all('SELECT id FROM frete_regioes ORDER BY id', [], (erro, regioes) => {
        if (erro) return res.send('Erro ao salvar o frete.');

        const valores = regioes.map(r => ({
            id: r.id,
            base: parseFloat(String(req.body['base_' + r.id] || '').replace(',', '.')),
            kg: parseFloat(String(req.body['kg_' + r.id] || '').replace(',', '.'))
        }));
        if (valores.some(v => isNaN(v.base) || isNaN(v.kg) || v.base < 0 || v.kg < 0)) {
            req.session.mensagem = { tipo: 'danger', texto: 'Informe valores válidos (zero ou maiores) em todas as regiões.' };
            return res.redirect('/admin/frete');
        }

        let restantes = valores.length;
        valores.forEach(v => {
            db.run('UPDATE frete_regioes SET valor_base = ?, valor_kg = ? WHERE id = ?', [v.base, v.kg, v.id], () => {
                if (--restantes === 0) {
                    req.session.mensagem = { tipo: 'success', texto: 'Tabela de frete atualizada.' };
                    res.redirect('/admin/frete');
                }
            });
        });
    });
});

module.exports = router;
