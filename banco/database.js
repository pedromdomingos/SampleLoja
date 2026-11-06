const fs = require('fs');
const path = require('path');
// Tenta usar o pacote "sqlite3". Se ele não carregar (acontece em alguns servidores online),
// usa o plano B em banco/sqlite-compat.js, que usa o SQLite embutido no Node.
let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
} catch (erroSqlite) {
    console.log('Pacote sqlite3 indisponível (' + erroSqlite.code + '). Usando o SQLite embutido no Node.');
    sqlite3 = require('./sqlite-compat');
}
const bcrypt = require('bcryptjs');
const { colunasDeEspecificacao } = require('../util/tipos');
const { categoriasIniciais, produtosDeTeste, produtosCatalogoV2 } = require('../util/produtos-teste');

const db = new sqlite3.Database('./banco/ecommerce.db', (erro) => {
    if (erro) console.log(erro.message);
    else console.log('Banco conectado.');
});

// O projeto usa categorias com um TIPO para que o cadastro de produto
// consiga mostrar campos específicos (roupa, instrumento ou disco/vinil).
const camposCategorias = [
    { nome: 'tipo', tipo: "TEXT NOT NULL DEFAULT 'outros'" }
];

// Campos gerais e específicos dos produtos.
// A SAMPLE vende somente produtos novos (sem campo de condição) e não trabalha com fornecedor:
// todos os produtos são da própria loja.
const camposProdutos = [
    { nome: 'artista', tipo: 'TEXT' },
    { nome: 'genero', tipo: 'TEXT' },
    { nome: 'ano_lancamento', tipo: 'INTEGER' },
    { nome: 'gravadora', tipo: 'TEXT' },
    { nome: 'valor_promocional', tipo: 'FLOAT' },
    { nome: 'peso', tipo: 'INTEGER' },
    { nome: 'destaque', tipo: 'INTEGER DEFAULT 0' },
    { nome: 'data_cadastro', tipo: 'TEXT' },
    { nome: 'tipo_produto', tipo: "TEXT DEFAULT 'outros'" },
    { nome: 'avaliacao', tipo: 'REAL DEFAULT 0' },   // nota de 0 a 5 mostrada nas estrelas

    // Roupa
    { nome: 'tamanho', tipo: 'TEXT' },
    { nome: 'cor', tipo: 'TEXT' },
    { nome: 'material', tipo: 'TEXT' },
    { nome: 'modelagem', tipo: 'TEXT' },

    // Instrumento
    { nome: 'tipo_instrumento', tipo: 'TEXT' },
    { nome: 'marca', tipo: 'TEXT' },
    { nome: 'modelo', tipo: 'TEXT' },
    { nome: 'material_corpo', tipo: 'TEXT' },
    { nome: 'material_escala', tipo: 'TEXT' },
    { nome: 'captadores', tipo: 'TEXT' },
    { nome: 'ponte', tipo: 'TEXT' },
    { nome: 'numero_cordas', tipo: 'INTEGER' },

    // Disco / vinil
    { nome: 'formato', tipo: 'TEXT' },
    { nome: 'velocidade', tipo: 'TEXT' },
    { nome: 'edicao', tipo: 'TEXT' }
];

db.serialize(() => {
    db.run(`PRAGMA foreign_keys = ON`);

    db.run(`
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            descricao TEXT,
            tipo TEXT NOT NULL DEFAULT 'outros'
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria TEXT NOT NULL,
            valor FLOAT NOT NULL,
            estoque INTEGER NOT NULL DEFAULT 0,
            descricao TEXT NOT NULL,
            imagem TEXT,
            artista TEXT NOT NULL DEFAULT '',
            genero TEXT NOT NULL DEFAULT '',
            ano_lancamento INTEGER,
            gravadora TEXT,
            valor_promocional FLOAT,
            peso INTEGER,
            destaque INTEGER DEFAULT 0,
            data_cadastro TEXT,
            tipo_produto TEXT NOT NULL DEFAULT 'outros',
            tamanho TEXT,
            cor TEXT,
            material TEXT,
            modelagem TEXT,
            tipo_instrumento TEXT,
            marca TEXT,
            modelo TEXT,
            material_corpo TEXT,
            material_escala TEXT,
            captadores TEXT,
            ponte TEXT,
            numero_cordas INTEGER,
            formato TEXT,
            velocidade TEXT,
            edicao TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE,
            email TEXT NOT NULL UNIQUE,
            telefone TEXT,
            senha TEXT NOT NULL,
            perfil TEXT NOT NULL DEFAULT 'cliente',
            ativo INTEGER NOT NULL DEFAULT 1,
            data_cadastro TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS enderecos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            destinatario TEXT NOT NULL,
            cpf TEXT NOT NULL DEFAULT '',
            telefone TEXT NOT NULL,
            cep TEXT NOT NULL,
            estado TEXT NOT NULL,
            cidade TEXT NOT NULL,
            bairro TEXT NOT NULL,
            rua TEXT NOT NULL,
            numero TEXT NOT NULL,
            complemento TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );
    `);

    // Recuperação de senha (RN8): guarda o código (criptografado), a validade e as tentativas.
    db.run(`
        CREATE TABLE IF NOT EXISTS recuperacoes_senha (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            codigo TEXT NOT NULL,
            expira_em INTEGER NOT NULL,
            tentativas INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );
    `);

    // Frete por região (RN35): valor base + valor por kg. Admin e funcionário editam no painel.
    db.run(`
        CREATE TABLE IF NOT EXISTS frete_regioes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT NOT NULL UNIQUE,
            nome TEXT NOT NULL,
            ufs TEXT NOT NULL,
            valor_base REAL NOT NULL,
            valor_kg REAL NOT NULL
        );
    `);

    // Pedidos. O endereço é COPIADO para o pedido (dest_*), assim ele não muda se o cliente editar o cadastro.
    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            status TEXT NOT NULL DEFAULT 'Aguardando pagamento',
            forma_pagamento TEXT NOT NULL,
            cpf TEXT NOT NULL,
            subtotal REAL NOT NULL,
            frete REAL NOT NULL,
            total REAL NOT NULL,
            peso_total INTEGER NOT NULL DEFAULT 0,
            codigo_rastreio TEXT NOT NULL,
            dest_nome TEXT NOT NULL,
            dest_telefone TEXT NOT NULL,
            dest_cep TEXT NOT NULL,
            dest_estado TEXT NOT NULL,
            dest_cidade TEXT NOT NULL,
            dest_bairro TEXT NOT NULL,
            dest_rua TEXT NOT NULL,
            dest_numero TEXT NOT NULL,
            dest_complemento TEXT,
            criado_em TEXT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS itens_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            produto_id INTEGER,
            nome TEXT NOT NULL,
            imagem TEXT,
            preco_unitario REAL NOT NULL,
            quantidade INTEGER NOT NULL,
            peso INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS historico_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            observacao TEXT,
            criado_em TEXT NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
        );
    `);

    // O restante (migração de bancos antigos e dados iniciais) roda em ORDEM, uma tarefa por vez.
    iniciarMigracao();
});

// Executa as tarefas uma depois da outra. Cada tarefa recebe a função "feito" e chama quando termina.
function emSequencia(tarefas, fim) {
    let i = 0;
    const proxima = () => {
        if (i >= tarefas.length) return fim && fim();
        tarefas[i++](proxima);
    };
    proxima();
}

// Tarefa que executa um comando SQL
const sql = (comando, params) => (feito) => {
    db.run(comando, params || [], (erro) => {
        if (erro) console.log('Aviso no banco:', erro.message);
        feito();
    });
};

// Cria a linha só se a tabela estiver vazia: contar(tabela, criar)
const seSemRegistros = (tabela, criar) => (feito) => {
    db.get(`SELECT COUNT(*) AS total FROM ${tabela}`, [], (erro, linha) => {
        if (erro || linha.total > 0) return feito();
        criar(feito);
    });
};

function iniciarMigracao() {
    db.all(`PRAGMA table_info(categorias)`, [], (erro, colunasCat) => {
        if (erro) return console.log(erro.message);
        db.all(`PRAGMA table_info(produtos)`, [], (erro2, colunasProd) => {
            if (erro2) return console.log(erro2.message);

            const tarefas = [];
            const catExistentes = colunasCat.map(c => c.name);
            const prodExistentes = colunasProd.map(c => c.name);

            // 1) colunas que faltam em bancos antigos (categorias e produtos)
            camposCategorias.forEach(campo => {
                if (!catExistentes.includes(campo.nome)) tarefas.push(sql(`ALTER TABLE categorias ADD COLUMN ${campo.nome} ${campo.tipo}`));
            });
            const jaCriadas = new Set();
            camposProdutos.concat(colunasDeEspecificacao()).forEach(campo => {   // as colunas de especificação vêm de util/tipos.js
                if (!prodExistentes.includes(campo.nome) && !jaCriadas.has(campo.nome)) {
                    jaCriadas.add(campo.nome);
                    tarefas.push(sql(`ALTER TABLE produtos ADD COLUMN ${campo.nome} ${campo.tipo}`));
                }
            });

            // 2) categorias "instrumento" com nome de guitarra, baixo, bateria ou violão passam para o tipo específico
            [['guitarra', '%guitarr%'], ['baixo', '%baix%'], ['bateria', '%bateri%'], ['violao', '%viol%']].forEach(([tipo, trecho]) => {
                tarefas.push(sql(`UPDATE categorias SET tipo = ? WHERE tipo = 'instrumento' AND lower(nome) LIKE ?`, [tipo, trecho]));
            });
            tarefas.push(sql(`UPDATE produtos SET tipo_produto = (SELECT tipo FROM categorias WHERE categorias.nome = produtos.categoria)
                              WHERE categoria IN (SELECT nome FROM categorias WHERE tipo IN ('guitarra', 'baixo', 'bateria', 'violao'))`));

            // 3) a SAMPLE não tem fornecedor nem produtos usados: remove colunas e contas antigas
            ['fornecedor_id', 'condicao'].forEach(coluna => {
                if (prodExistentes.includes(coluna)) tarefas.push(sql(`ALTER TABLE produtos DROP COLUMN ${coluna}`));
            });
            tarefas.push(sql(`DELETE FROM usuarios WHERE perfil = 'fornecedor'`));

            // 4) dados iniciais (só quando a tabela está vazia)
            tarefas.push(seSemRegistros('categorias', (feito) => {
                emSequencia(categoriasIniciais.map(([nome, descricao, tipo]) =>
                    sql(`INSERT INTO categorias (nome, descricao, tipo) VALUES (?, ?, ?)`, [nome, descricao, tipo])), feito);
            }));

            tarefas.push(seSemRegistros('usuarios', (feito) => {
                const contas = [
                    ['Administrador SAMPLE', 'admin@sample.com', 'admin123', 'admin'],
                    ['Funcionário SAMPLE', 'funcionario@sample.com', '123456', 'funcionario'],
                    ['Cliente SAMPLE', 'cliente@sample.com', '123456', 'cliente']
                ];
                emSequencia(contas.map(([nome, email, senha, perfil]) =>
                    sql(`INSERT INTO usuarios (nome, email, senha, perfil, data_cadastro) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))`,
                        [nome, email, bcrypt.hashSync(senha, 10), perfil])), feito);
            }));

            tarefas.push(seSemRegistros('frete_regioes', (feito) => {
                const regioes = [
                    ['sc', 'Santa Catarina', 'SC', 12, 3],
                    ['sul', 'Sul (PR e RS)', 'PR,RS', 18, 4],
                    ['sudeste', 'Sudeste', 'SP,RJ,MG,ES', 24, 5],
                    ['centro-oeste', 'Centro-Oeste', 'DF,GO,MT,MS', 28, 6],
                    ['nordeste', 'Nordeste', 'AL,BA,CE,MA,PB,PE,PI,RN,SE', 34, 7],
                    ['norte', 'Norte', 'AC,AP,AM,PA,RO,RR,TO', 42, 8]
                ];
                emSequencia(regioes.map(r => sql(`INSERT INTO frete_regioes (codigo, nome, ufs, valor_base, valor_kg) VALUES (?, ?, ?, ?, ?)`, r)), feito);
            }));

            // 5) produtos de teste (só se não houver nenhum produto). As fotos são copiadas de public/img para public/uploads.
            tarefas.push(seSemRegistros('produtos', (feito) => {
                const itens = [];
                categoriasIniciais.forEach(([nome, descricao, tipo]) => {
                    itens.push(sql(`INSERT OR IGNORE INTO categorias (nome, descricao, tipo) VALUES (?, ?, ?)`, [nome, descricao, tipo]));
                });
                produtosDeTeste.forEach(produto => {
                    itens.push((pronto) => {
                        try {
                            fs.copyFileSync(path.join(__dirname, '..', 'public', 'img', produto.imagem),
                                            path.join(__dirname, '..', 'public', 'uploads', produto.imagem));
                        } catch (e) { /* sem a foto, o produto aparece sem imagem */ }
                        const colunas = Object.keys(produto);
                        sql(`INSERT INTO produtos (${colunas.join(', ')}, data_cadastro) VALUES (${colunas.map(() => '?').join(', ')}, datetime('now', 'localtime'))`,
                            Object.values(produto))(pronto);
                    });
                });
                emSequencia(itens, feito);
            }));

            // 6) ajustes de roupas antigas para os novos filtros (gênero e tipo de peça)
            tarefas.push(sql(`UPDATE produtos SET publico = 'Unissex' WHERE tipo_produto = 'roupa' AND (publico IS NULL OR publico = '')`));
            [['Camiseta', 'camiseta%'], ['Regata', 'regata%'], ['Jaqueta', 'jaqueta%'], ['Moletom', 'moletom%'], ['Acessório', 'bon%']].forEach(([peca, trecho]) => {
                tarefas.push(sql(`UPDATE produtos SET tipo_peca = ? WHERE tipo_produto = 'roupa' AND (tipo_peca IS NULL OR tipo_peca = '') AND lower(nome) LIKE ?`, [peca, trecho]));
            });

            // 7) catálogo V2: produtos extras inseridos uma única vez (a tabela "sementes" lembra que já foi feito,
            //    então produtos excluídos pelo painel não voltam)
            tarefas.push(sql(`CREATE TABLE IF NOT EXISTS sementes (chave TEXT PRIMARY KEY)`));
            tarefas.push((feito) => {
                db.get(`SELECT chave FROM sementes WHERE chave = 'catalogo-v2'`, [], (erro, linha) => {
                    if (erro || linha) return feito();
                    const itens = [];
                    produtosCatalogoV2.forEach(produto => {
                        itens.push((pronto) => {
                            try {
                                fs.copyFileSync(path.join(__dirname, '..', 'public', 'img', produto.imagem),
                                                path.join(__dirname, '..', 'public', 'uploads', produto.imagem));
                            } catch (e) { /* sem a foto, o produto aparece sem imagem */ }
                            const base = Object.assign({ artista: '', genero: '' }, produto);
                            const colunas = Object.keys(base);
                            sql(`INSERT INTO produtos (${colunas.join(', ')}, data_cadastro) VALUES (${colunas.map(() => '?').join(', ')}, datetime('now', 'localtime'))`,
                                Object.values(base))(pronto);
                        });
                    });
                    itens.push(sql(`INSERT INTO sementes (chave) VALUES ('catalogo-v2')`));
                    emSequencia(itens, feito);
                });
            });

            emSequencia(tarefas, () => console.log('Banco pronto.'));
        });
    });
}

module.exports = db;
