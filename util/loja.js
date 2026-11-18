// Consultas da LOJA: páginas de categoria (roupas, instrumentos, discos), busca e home.
const { TIPOS } = require('./tipos');

const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

// Cada página de categoria reúne alguns tipos e define as SEÇÕES do painel de filtros (na ordem em que aparecem).
// campo 'preco' = faixas de preço (checkbox) | os demais = coluna do produto (checkbox, vários ao mesmo tempo)
const PAGINAS = {
    roupas: {
        titulo: 'ROUPAS',
        rotulo: 'Roupas',
        descricao: 'Vista o rock que faz parte de você! Encontre camisetas, jaquetas e outras peças inspiradas nas maiores bandas e lendas do rock. Do visual clássico ao estilo mais pesado, explore opções para expressar sua personalidade em shows, festivais ou no dia a dia.',
        tipos: ['roupa'],
        faixas: [[0, 100], [100, 200], [200, 300], [300, null]],
        filtros: [
            { campo: 'publico', rotulo: 'Gênero' },
            { campo: 'preco', rotulo: 'Preço' },
            { campo: 'tamanho', rotulo: 'Tamanho' },
            { campo: 'tipo_peca', rotulo: 'Tipo de produto' },
            { campo: 'cor', rotulo: 'Cor' },
            { campo: 'artista', rotulo: 'Banda' }
        ]
    },
    instrumentos: {
        titulo: 'INSTRUMENTOS',
        rotulo: 'Instrumentos',
        descricao: 'Guitarras, baixos, baterias, violões e tudo o que você precisa para botar o seu som no volume máximo. Escolha o instrumento certo e suba no palco.',
        tipos: ['guitarra', 'baixo', 'bateria', 'violao', 'instrumento'],
        faixas: [[0, 100], [100, 500], [500, 1500], [1500, 3000], [3000, null]],
        filtros: [
            { campo: 'tipo_produto', rotulo: 'Tipo de produto', rotulosDasOpcoes: true },
            { campo: 'preco', rotulo: 'Preço' },
            { campo: 'marca', rotulo: 'Marca' }
        ]
    },
    discos: {
        titulo: 'DISCOS',
        rotulo: 'Discos',
        descricao: 'Vinis e CDs para ouvir os clássicos do jeito que o rock merece. De coletâneas a edições especiais, monte a sua coleção.',
        tipos: ['disco'],
        faixas: [[0, 60], [60, 150], [150, 250], [250, null]],
        filtros: [
            { campo: 'genero', rotulo: 'Gênero' },
            { campo: 'preco', rotulo: 'Preço' },
            { campo: 'formato', rotulo: 'Tipo de produto' },
            { campo: 'ano_lancamento', rotulo: 'Ano' }
        ]
    }
};

// Página (roupas, instrumentos, discos) a que um tipo de produto pertence
function paginaDoTipo(tipo) {
    return Object.keys(PAGINAS).find(k => PAGINAS[k].tipos.includes(tipo)) || null;
}

// Opções do "Ordenar por" (a primeira é a padrão: ID crescente)
const ORDENS = {
    padrao: { rotulo: 'Padrão', sql: 'id ASC' },
    menor_preco: { rotulo: 'Menor preço', sql: 'preco_final ASC, id ASC' },
    maior_preco: { rotulo: 'Maior preço', sql: 'preco_final DESC, id ASC' },
    recentes: { rotulo: 'Mais recentes', sql: 'id DESC' },
    desconto: { rotulo: 'Maior desconto', sql: 'desconto DESC, id ASC' },
    nome: { rotulo: 'Nome (A a Z)', sql: 'nome COLLATE NOCASE ASC' }
};

// Colunas calculadas: preço final (promocional, se houver) e percentual de desconto
const COLUNAS = `*, COALESCE(valor_promocional, valor) AS preco_final,
                 CASE WHEN valor_promocional IS NOT NULL THEN (1 - valor_promocional / valor) ELSE 0 END AS desconto`;

function ordemValida(ordem) {
    return ORDENS[ordem] ? ordem : 'padrao';
}

const lista = (v) => [].concat(v === undefined || v === null ? [] : v).map(x => String(x).trim()).filter(Boolean);

// "0-100" -> [0, 100] | "300-" -> [300, null]
function lerFaixa(texto) {
    const [a, b] = String(texto).split('-');
    const min = parseFloat(a), max = b === '' || b === undefined ? null : parseFloat(b);
    if (isNaN(min)) return null;
    return [min, isNaN(max) ? null : max];
}
const chaveFaixa = (f) => `${f[0]}-${f[1] === null ? '' : f[1]}`;
const brlCurto = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR');
function rotuloFaixa(f) {
    if (f[0] === 0) return `Até ${brlCurto(f[1])}`;
    if (f[1] === null) return `Acima de ${brlCurto(f[0])}`;
    return `${brlCurto(f[0])} – ${brlCurto(f[1])}`;
}

// Condições SQL das faixas de preço escolhidas (OU entre elas)
function condicaoPreco(faixasEscolhidas, condicoes, params) {
    const partes = [];
    faixasEscolhidas.forEach(t => {
        const f = lerFaixa(t);
        if (!f) return;
        if (f[1] === null) { partes.push('COALESCE(valor_promocional, valor) >= ?'); params.push(f[0]); }
        else if (f[0] === 0) { partes.push('COALESCE(valor_promocional, valor) <= ?'); params.push(f[1]); }
        else { partes.push('(COALESCE(valor_promocional, valor) > ? AND COALESCE(valor_promocional, valor) <= ?)'); params.push(f[0], f[1]); }
    });
    if (partes.length) condicoes.push('(' + partes.join(' OR ') + ')');
}

// Lista os produtos de uma página de categoria aplicando ordenação e filtros.
// Todos os filtros aceitam VÁRIOS valores (?tamanho=M&tamanho=G) e a faixa de preço vem em ?preco=0-100.
function listarPagina(db, pagina, consulta, callback) {
    const config = PAGINAS[pagina];
    const ordem = ordemValida(consulta.ordem);
    const marcadores = config.tipos.map(() => '?').join(', ');
    const condicoes = [`tipo_produto IN (${marcadores})`];
    const params = config.tipos.slice();
    const selecionados = {};
    const colunas = config.filtros.filter(f => f.campo !== 'preco');

    colunas.forEach(f => {
        const valores = lista(consulta[f.campo]);
        if (valores.length) {
            condicoes.push(`${f.campo} IN (${valores.map(() => '?').join(', ')})`);
            params.push(...valores);
            selecionados[f.campo] = valores;
        }
    });

    const faixas = lista(consulta.preco).filter(lerFaixa);
    if (faixas.length) { condicaoPreco(faixas, condicoes, params); selecionados.preco = faixas; }
    if (consulta.promocao === '1') { condicoes.push('valor_promocional IS NOT NULL'); selecionados.promocao = ['1']; }

    db.all(`SELECT ${COLUNAS} FROM produtos WHERE ${condicoes.join(' AND ')} ORDER BY ${ORDENS[ordem].sql}`, params, (erro, produtos) => {
        if (erro) return callback(erro);

        // opções de cada filtro (com quantidade): valores que existem nos produtos desta página
        const opcoes = {};
        opcoes.preco = config.faixas.map(f => ({ valor: chaveFaixa(f), rotulo: rotuloFaixa(f) }));
        let pendentes = colunas.length;
        const pronto = () => callback(null, { config, produtos, ordem, selecionados, opcoes, total: produtos.length });
        if (!pendentes) return pronto();

        colunas.forEach(f => {
            db.all(`SELECT ${f.campo} AS valor, COUNT(*) AS n FROM produtos
                    WHERE tipo_produto IN (${marcadores}) AND ${f.campo} IS NOT NULL AND ${f.campo} <> ''
                    GROUP BY ${f.campo}`, config.tipos, (erroOp, linhas) => {
                let ops = (linhas || []).map(l => ({
                    valor: String(l.valor), n: l.n,
                    rotulo: f.rotulosDasOpcoes ? (TIPOS[l.valor] ? TIPOS[l.valor].rotulo : l.valor) : String(l.valor)
                }));
                if (f.campo === 'tamanho') ops.sort((a, b) => TAMANHOS.indexOf(a.valor) - TAMANHOS.indexOf(b.valor));
                else if (f.campo === 'ano_lancamento') ops.sort((a, b) => Number(b.valor) - Number(a.valor));
                else ops.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
                opcoes[f.campo] = ops;
                if (--pendentes === 0) pronto();
            });
        });
    });
}

// ---------- BUSCA ----------
// Procura o texto no nome, artista, gênero, categoria, marca e cor. Aceita os mesmos filtros das categorias.
function buscar(db, termo, consulta, callback) {
    const ordem = ordemValida(consulta.ordem);
    const condicoes = [];
    const params = [];

    // cada palavra digitada precisa aparecer em algum desses campos
    termo.split(' ').filter(palavra => palavra !== '').forEach(palavra => {
        condicoes.push('(nome LIKE ? OR artista LIKE ? OR genero LIKE ? OR categoria LIKE ? OR marca LIKE ? OR cor LIKE ?)');
        for (let i = 0; i < 6; i++) params.push('%' + palavra + '%');
    });

    // filtro de categoria: roupas, instrumentos ou discos
    const paginas = lista(consulta.pagina).filter(k => PAGINAS[k]);
    if (paginas.length) {
        const tipos = [];
        paginas.forEach(k => tipos.push(...PAGINAS[k].tipos));
        condicoes.push(`tipo_produto IN (${tipos.map(() => '?').join(', ')})`);
        params.push(...tipos);
    }

    const faixas = lista(consulta.preco).filter(lerFaixa);
    if (faixas.length) condicaoPreco(faixas, condicoes, params);
    if (consulta.promocao === '1') condicoes.push('valor_promocional IS NOT NULL');

    db.all(`SELECT ${COLUNAS} FROM produtos WHERE ${condicoes.join(' AND ')} ORDER BY ${ORDENS[ordem].sql}`, params, (erro, produtos) => {
        callback(erro, produtos, ordem, { paginas, faixas, promocao: consulta.promocao === '1' ? ['1'] : [] });
    });
}

// Intercala grupos (roupas, instrumentos, discos) para a vitrine ficar variada
function intercalar(produtos, limite) {
    const grupos = {};
    produtos.forEach(p => { (grupos[paginaDoTipo(p.tipo_produto) || 'outros'] = grupos[paginaDoTipo(p.tipo_produto) || 'outros'] || []).push(p); });
    const filas = Object.values(grupos), saida = [];
    while (saida.length < limite && filas.some(f => f.length)) filas.forEach(f => { if (f.length && saida.length < limite) saida.push(f.shift()); });
    return saida;
}

// Home: Mais vendidos = produtos em destaque | Promoções = com valor promocional | Novidades = últimos cadastrados (variados)
function vitrineDaHome(db, callback) {
    db.all(`SELECT ${COLUNAS} FROM produtos WHERE destaque = 1 ORDER BY id`, [], (erro, maisVendidos) => {
        if (erro) return callback(erro);
        db.all(`SELECT ${COLUNAS} FROM produtos WHERE valor_promocional IS NOT NULL ORDER BY id`, [], (erro2, promocoes) => {
            if (erro2) return callback(erro2);
            db.all(`SELECT ${COLUNAS} FROM produtos ORDER BY id DESC LIMIT 24`, [], (erro3, recentes) => {
                if (erro3) return callback(erro3);
                const novidades = intercalar(recentes, 9);
                // cartões flutuantes do vinil: um disco e a maior promoção
                const vinil = recentes.find(p => p.tipo_produto === 'disco') || null;
                const oferta = promocoes.slice().sort((a, b) => b.desconto - a.desconto)[0] || null;
                callback(null, { maisVendidos, promocoes, novidades, vinil, oferta });
            });
        });
    });
}

module.exports = { PAGINAS, ORDENS, listarPagina, buscar, vitrineDaHome, paginaDoTipo };
