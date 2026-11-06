const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../banco/database');
const { precisaPerfil } = require('../util/auth');
const { lerEndereco, salvarEndereco } = require('../util/enderecos');

// Área do CLIENTE.
//   /conta               -> Minha conta (dados e, nas próximas etapas, pedidos)
//   /conta/configuracoes -> Configurações: endereços de entrega
router.use(precisaPerfil('cliente'));

// ---------- MINHA CONTA ----------
router.get('/', (req, res) => {
    db.get(
        `SELECT nome, email, cpf, telefone FROM usuarios WHERE id = ?`,
        [req.session.usuario.id],
        (erro, cliente) => {
            if (erro || !cliente) return res.send('Erro ao consultar a conta.');
            res.render('cliente/conta', { cliente });
        }
    );
});

// ---------- CONFIGURAÇÕES (endereços) ----------
router.get('/configuracoes', (req, res) => {
    db.all(
        `SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY id`,
        [req.session.usuario.id],
        (erro, enderecos) => {
            if (erro) return res.send('Erro ao consultar endereços.');
            // esconderAviso: nesta página o aviso "cadastre seu endereço" não precisa aparecer
            res.render('cliente/configuracoes', { enderecos, esconderAviso: true });
        }
    );
});

// ADICIONAR ENDEREÇO DE ENTREGA (RF11 e RF12)
router.post('/enderecos', (req, res) => {
    const { dados, erro } = lerEndereco(req.body);

    if (erro) {
        req.session.mensagem = { tipo: 'danger', texto: erro };
        return res.redirect('/conta/configuracoes');
    }

    salvarEndereco(db, req.session.usuario.id, dados, (erroDb) => {
        if (erroDb) {
            console.log(erroDb.message);
            req.session.mensagem = { tipo: 'danger', texto: 'Erro ao salvar endereço.' };
        } else {
            req.session.mensagem = { tipo: 'success', texto: 'Endereço adicionado!' };
        }
        res.redirect('/conta/configuracoes');
    });
});

// EXCLUIR ENDEREÇO (apenas os do próprio cliente)
router.post('/enderecos/:id/excluir', (req, res) => {
    db.run(
        `DELETE FROM enderecos WHERE id = ? AND usuario_id = ?`,
        [req.params.id, req.session.usuario.id],
        (erro) => {
            if (erro) console.log(erro.message);
            req.session.mensagem = { tipo: 'success', texto: 'Endereço removido.' };
            res.redirect('/conta/configuracoes');
        }
    );
});

// FECHAR O AVISO "cadastre seu endereço" (vale até o cliente sair da conta)
router.post('/aviso-endereco/fechar', (req, res) => {
    req.session.avisoEnderecoFechado = true;
    res.sendStatus(204);
});

// EXCLUIR A PRÓPRIA CONTA (RN38) - pede a senha para confirmar
router.post('/excluir', (req, res) => {
    const usuarioId = req.session.usuario.id;

    db.get('SELECT senha FROM usuarios WHERE id = ?', [usuarioId], (erro, usuario) => {
        if (erro || !usuario) {
            req.session.mensagem = { tipo: 'danger', texto: 'Erro ao excluir a conta.' };
            return res.redirect('/conta/configuracoes');
        }
        if (!bcrypt.compareSync(String(req.body.senha || ''), usuario.senha)) {
            req.session.mensagem = { tipo: 'danger', texto: 'Senha incorreta. A conta não foi excluída.' };
            return res.redirect('/conta/configuracoes');
        }

        // apaga tudo que pertence ao cliente e, por fim, a conta
        // os pedidos já feitos continuam registrados na loja, mas deixam de apontar para a conta
        db.run('UPDATE pedidos SET usuario_id = NULL WHERE usuario_id = ?', [usuarioId], () => {
        db.run('DELETE FROM enderecos WHERE usuario_id = ?', [usuarioId], () => {
            db.run('DELETE FROM recuperacoes_senha WHERE usuario_id = ?', [usuarioId], () => {
                db.run(`DELETE FROM usuarios WHERE id = ? AND perfil = 'cliente'`, [usuarioId], (erroDelete) => {
                    if (erroDelete) {
                        req.session.mensagem = { tipo: 'danger', texto: 'Erro ao excluir a conta.' };
                        return res.redirect('/conta/configuracoes');
                    }
                    // encerra a sessão e leva para a loja com um aviso
                    req.session.regenerate(() => {
                        req.session.mensagem = { tipo: 'success', texto: 'Sua conta foi excluída.' };
                        res.redirect('/');
                    });
                });
            });
        });
        });
    });
});

module.exports = router;
