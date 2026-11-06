const express = require('express');
const session = require('express-session');
const { paginaInicial } = require('./util/auth');

const db = require('./banco/database');
const app = express();
const port = process.env.PORT || 3000;   // na hospedagem online a porta vem da variável PORT

// WhatsApp da loja (link no rodapé). Formato: código do país + DDD + número, só números.
const WHATSAPP = '5549991500450';

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Sessão: guarda quem está logado e o carrinho. Em produção, definir SESSION_SECRET no ambiente.
app.use(session({
    secret: process.env.SESSION_SECRET || 'sample-segredo-de-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 4 } // 4 horas
}));

// Variáveis disponíveis em TODAS as views
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    res.locals.minhaArea = req.session.usuario ? paginaInicial[req.session.usuario.perfil] : '/login';
    res.locals.caminhoAtual = req.originalUrl || req.url;   // para voltar à mesma página depois de adicionar ao carrinho
    res.locals.mensagem = req.session.mensagem || null;
    delete req.session.mensagem; // a mensagem aparece uma única vez

    // quantidade de itens no carrinho (número ao lado do ícone)
    const carrinho = req.session.carrinho || {};
    res.locals.carrinhoQtd = Object.keys(carrinho).reduce((total, id) => total + carrinho[id], 0);

    // funções de apoio para mostrar preços
    res.locals.brl = (valor) => 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    res.locals.precoFinal = (p) => p.valor_promocional || p.valor;
    res.locals.desconto = (p) => p.valor_promocional ? Math.floor((1 - p.valor_promocional / p.valor) * 100) : 0;
    res.locals.slugStatus = (status) => String(status).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ /g, '-');
    res.locals.whatsappLink = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Vim pelo site da SAMPLE.')}`;
    next();
});

// Aviso "cadastre seu endereço de entrega": aparece para o CLIENTE que ainda não tem endereço.
// Ele pode fechar o aviso (fica fechado até sair da conta) e cadastrar depois.
app.use((req, res, next) => {
    res.locals.avisoEndereco = false;
    const u = req.session.usuario;

    if (req.method !== 'GET' || !u || u.perfil !== 'cliente' || req.session.avisoEnderecoFechado) {
        return next();
    }
    db.get('SELECT COUNT(*) AS total FROM enderecos WHERE usuario_id = ?', [u.id], (erro, linha) => {
        res.locals.avisoEndereco = !erro && linha.total === 0;
        next();
    });
});

//================== ROTAS ==================//

// loja: home, categorias (roupas, instrumentos, discos), busca e detalhes do produto
app.use('/', require('./rotas/loja'));

// login, logout, cadastro de clientes e recuperação de senha
app.use('/', require('./rotas/auth'));

// área administrativa (admin e funcionário)
app.use('/admin', require('./rotas/admin'));

// área do cliente (minha conta e configurações)
app.use('/conta', require('./rotas/cliente'));

// compra: carrinho, endereço de entrega e finalização
app.use('/carrinho', require('./rotas/carrinho'));
app.use('/checkout', require('./rotas/checkout'));

// pedidos do cliente (acompanhar entrega)
app.use('/pedidos', require('./rotas/pedidos'));

// página não encontrada
app.use((req, res) => {
    res.status(404).send('Página não encontrada. <a href="/">Voltar à loja</a>');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
