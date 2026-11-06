const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../banco/database');
const { paginaInicial } = require('../util/auth');
const { somenteNumeros, emailValido, senhaValida } = require('../util/validacoes');

router.get('/login', (req, res) => {
    if (req.session.usuario) return res.redirect(paginaInicial[req.session.usuario.perfil]);
    res.render('auth/login');
});

router.get('/admin', (req, res) => res.redirect('/login'));

router.post('/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], (erro, user) => {
        if (erro) {
            req.session.mensagem = { tipo: 'danger', texto: 'Erro ao realizar login.' };
            return res.redirect('/login');
        }
        if (!user || !bcrypt.compareSync(senha, user.senha)) {
            req.session.mensagem = { tipo: 'danger', texto: 'E-mail ou senha incorretos.' };
            return res.redirect('/login');
        }
        if (!user.ativo) {
            req.session.mensagem = { tipo: 'warning', texto: 'Esta conta está desativada. Procure a administração.' };
            return res.redirect('/login');
        }

        const carrinho = req.session.carrinho;   // o carrinho não se perde ao entrar na conta
        req.session.regenerate((erroSessao) => {
            if (erroSessao) return res.redirect('/login');
            req.session.usuario = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
            if (carrinho) req.session.carrinho = carrinho;
            res.redirect(paginaInicial[user.perfil]);
        });
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// O cadastro cria somente a conta. O endereço de entrega é cadastrado depois,
// em Configurações (ou na hora da compra). Depois de criar a conta o cliente já entra na loja.
router.get('/cadastro', (req, res) => {
    res.render('auth/cadastro', { erro: null, dados: {} });
});

router.post('/cadastro', (req, res) => {
    const d = req.body;
    const dados = {
        nome: String(d.nome || '').trim(),
        email: String(d.email || '').trim().toLowerCase(),
        telefone: somenteNumeros(d.telefone)
    };
    const senha = String(d.senha || '');
    const falha = (texto) => res.render('auth/cadastro', { erro: texto, dados });

    // O CPF não é pedido no cadastro: só na hora de finalizar uma compra
    if (!dados.nome || !dados.email || !dados.telefone || !senha || !d.confirmar_senha) {
        return falha('Preencha todos os campos obrigatórios.');
    }
    if (!emailValido(dados.email)) return falha('E-mail inválido.');
    if (!senhaValida(senha)) return falha('A senha deve ter pelo menos 8 caracteres.');
    if (senha !== d.confirmar_senha) return falha('As senhas não conferem.');

    db.run(
        `INSERT INTO usuarios (nome, email, telefone, senha, perfil, data_cadastro)
         VALUES (?, ?, ?, ?, 'cliente', datetime('now', 'localtime'))`,
        [dados.nome, dados.email, dados.telefone, bcrypt.hashSync(senha, 10)],
        function (erro) {
            if (erro) {
                if (String(erro.message).includes('UNIQUE')) return falha('Já existe uma conta com este e-mail.');
                return falha('Erro ao cadastrar. Tente novamente.');
            }
            const novoId = this.lastID;

            // já deixa o cliente logado e leva para a loja (lá aparece o aviso para cadastrar o endereço)
            const carrinho = req.session.carrinho;
            req.session.regenerate((erroSessao) => {
                if (erroSessao) return res.redirect('/login');
                req.session.usuario = { id: novoId, nome: dados.nome, email: dados.email, perfil: 'cliente' };
                if (carrinho) req.session.carrinho = carrinho;
                req.session.mensagem = { tipo: 'success', texto: 'Conta criada! Bem-vindo à SAMPLE.' };
                res.redirect('/');
            });
        }
    );
});

//================== RECUPERAR SENHA (RN8) ==================//
// Fluxo: 1) cliente informa o e-mail  2) o sistema gera um código de 6 dígitos
//        3) cliente digita o código e a nova senha.
// O ENVIO DE E-MAIL É SIMULADO: o código aparece na tela (e no terminal do servidor).
// Para enviar e-mail de verdade, basta trocar o trecho marcado "E-MAIL SIMULADO" por um envio com nodemailer.
const VALIDADE_DO_CODIGO = 15 * 60 * 1000;   // 15 minutos
const MAXIMO_DE_TENTATIVAS = 5;

router.get('/recuperar-senha', (req, res) => {
    res.render('auth/recuperar-senha', { erro: null, email: '' });
});

router.post('/recuperar-senha', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const falha = (texto) => res.render('auth/recuperar-senha', { erro: texto, email });

    if (!emailValido(email)) return falha('Informe um e-mail válido.');

    db.get('SELECT id, ativo FROM usuarios WHERE email = ?', [email], (erro, usuario) => {
        if (erro) return falha('Erro ao gerar o código. Tente novamente.');
        if (!usuario || !usuario.ativo) return falha('Não encontramos uma conta ativa com este e-mail.');

        const codigo = String(crypto.randomInt(100000, 1000000));   // 6 dígitos

        // apaga códigos antigos e guarda o novo (criptografado, com validade)
        db.run('DELETE FROM recuperacoes_senha WHERE usuario_id = ?', [usuario.id], () => {
            db.run(
                'INSERT INTO recuperacoes_senha (usuario_id, codigo, expira_em) VALUES (?, ?, ?)',
                [usuario.id, bcrypt.hashSync(codigo, 10), Date.now() + VALIDADE_DO_CODIGO],
                (erroInsert) => {
                    if (erroInsert) return falha('Erro ao gerar o código. Tente novamente.');

                    // ---- E-MAIL SIMULADO ----
                    console.log(`[Recuperação de senha] código para ${email}: ${codigo}`);
                    req.session.recuperacao = { email, codigoDemo: codigo };

                    res.redirect('/recuperar-senha/codigo');
                }
            );
        });
    });
});

router.get('/recuperar-senha/codigo', (req, res) => {
    const rec = req.session.recuperacao;
    if (!rec) return res.redirect('/recuperar-senha');
    res.render('auth/codigo-senha', { erro: null, email: rec.email, codigoDemo: rec.codigoDemo });
});

router.post('/recuperar-senha/codigo', (req, res) => {
    const rec = req.session.recuperacao;
    if (!rec) return res.redirect('/recuperar-senha');

    const codigo = String(req.body.codigo || '').trim();
    const senha = String(req.body.senha || '');
    const falha = (texto) => res.render('auth/codigo-senha', { erro: texto, email: rec.email, codigoDemo: rec.codigoDemo });

    if (!senhaValida(senha)) return falha('A senha deve ter pelo menos 8 caracteres.');
    if (senha !== req.body.confirmar_senha) return falha('As senhas não conferem.');

    db.get(
        `SELECT r.id, r.codigo, r.expira_em, r.tentativas, u.id AS usuario_id
         FROM recuperacoes_senha r JOIN usuarios u ON u.id = r.usuario_id
         WHERE u.email = ?`,
        [rec.email],
        (erro, registro) => {
            if (erro || !registro) return falha('Código expirado. Solicite um novo código.');

            if (Date.now() > registro.expira_em || registro.tentativas >= MAXIMO_DE_TENTATIVAS) {
                db.run('DELETE FROM recuperacoes_senha WHERE id = ?', [registro.id]);
                return falha('Código expirado ou com muitas tentativas. Solicite um novo código.');
            }

            if (!bcrypt.compareSync(codigo, registro.codigo)) {
                db.run('UPDATE recuperacoes_senha SET tentativas = tentativas + 1 WHERE id = ?', [registro.id]);
                return falha('Código incorreto.');
            }

            // código certo: troca a senha e apaga o código usado
            db.run('UPDATE usuarios SET senha = ? WHERE id = ?', [bcrypt.hashSync(senha, 10), registro.usuario_id], (erroUpdate) => {
                if (erroUpdate) return falha('Erro ao salvar a nova senha.');

                db.run('DELETE FROM recuperacoes_senha WHERE usuario_id = ?', [registro.usuario_id]);
                delete req.session.recuperacao;
                req.session.mensagem = { tipo: 'success', texto: 'Senha alterada! Entre com a nova senha.' };
                res.redirect('/login');
            });
        }
    );
});

module.exports = router;
