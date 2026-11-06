// Middlewares de autenticação e controle de acesso por perfil.
//
// Perfis do sistema SAMPLE:
//   admin       -> gerencia tudo (usuários, produtos, categorias, exclusões) e também vê a loja
//   funcionario -> cadastra/consulta produtos e categorias (não exclui, não gerencia usuários) e vê a loja
//   cliente     -> navega na loja, compra e acompanha pedidos

// Página inicial de cada perfil (para onde ele é enviado após o login)
const paginaInicial = {
    admin: '/admin/index',
    funcionario: '/admin/index',
    cliente: '/'            // o cliente entra direto na loja
};

// Exige que o usuário esteja logado
function precisaLogin(req, res, next) {
    if (!req.session.usuario) {
        req.session.mensagem = { tipo: 'warning', texto: 'Faça login para continuar.' };
        return res.redirect('/login');
    }
    next();
}

// Exige que o usuário logado tenha um dos perfis informados
function precisaPerfil(...perfis) {
    return (req, res, next) => {
        if (!req.session.usuario) {
            req.session.mensagem = { tipo: 'warning', texto: 'Faça login para continuar.' };
            return res.redirect('/login');
        }
        if (!perfis.includes(req.session.usuario.perfil)) {
            return res.status(403).render('403', { paginaInicial: paginaInicial[req.session.usuario.perfil] });
        }
        next();
    };
}

module.exports = { precisaLogin, precisaPerfil, paginaInicial };
