// Plano B para o banco de dados.
// O projeto usa o pacote "sqlite3". Em alguns servidores (como o Render) esse pacote não consegue carregar.
// Quando isso acontece, o banco/database.js usa este arquivo, que imita o mesmo jeito de usar
// (db.run, db.get, db.all e db.serialize) mas por baixo usa o SQLite que já vem dentro do Node (módulo "node:sqlite").
// Precisa do Node 22.13 ou mais novo.

const { DatabaseSync } = require('node:sqlite');

// o node:sqlite não aceita undefined nem true/false; aqui viram null e 1/0
const limpar = (valores) => valores.map(v => v === undefined ? null : (typeof v === 'boolean' ? (v ? 1 : 0) : v));

class Database {
    constructor(arquivo, callback) {
        this.banco = new DatabaseSync(arquivo);
        if (callback) setImmediate(() => callback(null));
    }

    serialize(funcao) { funcao(); }

    // db.run(sql, [valores], function (erro) { this.lastID, this.changes })
    run(sql, valores, callback) {
        if (typeof valores === 'function') { callback = valores; valores = []; }
        let contexto = {};
        try {
            const r = this.banco.prepare(sql).run(...limpar(valores || []));
            contexto = { lastID: Number(r.lastInsertRowid), changes: Number(r.changes) };
        } catch (erro) {
            if (callback) setImmediate(() => callback.call(contexto, erro));
            return;
        }
        if (callback) setImmediate(() => callback.call(contexto, null));
    }

    // db.get(sql, [valores], function (erro, linha))
    get(sql, valores, callback) {
        if (typeof valores === 'function') { callback = valores; valores = []; }
        let linha;
        try {
            linha = this.banco.prepare(sql).get(...limpar(valores || []));
        } catch (erro) { return setImmediate(() => callback(erro)); }
        setImmediate(() => callback(null, linha ? Object.assign({}, linha) : undefined));
    }

    // db.all(sql, [valores], function (erro, linhas))
    all(sql, valores, callback) {
        if (typeof valores === 'function') { callback = valores; valores = []; }
        let linhas;
        try {
            linhas = this.banco.prepare(sql).all(...limpar(valores || [])).map(l => Object.assign({}, l));
        } catch (erro) { return setImmediate(() => callback(erro)); }
        setImmediate(() => callback(null, linhas));
    }
}

module.exports = { verbose() { return module.exports; }, Database };
