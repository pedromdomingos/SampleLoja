// Cálculo do frete (RN35): depende da REGIÃO do endereço (pelo estado) e do PESO total do pedido.
//   frete = valor base da região + valor por kg da região × kg
//   kg    = peso total arredondado para cima (mínimo 1 kg)
// Os valores ficam na tabela frete_regioes e podem ser mudados por admin e funcionário em Admin > Frete.

// Frete grátis: pedidos com subtotal a partir deste valor não pagam frete
const FRETE_GRATIS_A_PARTIR = 300;

function calcularFrete(db, estado, pesoGramas, subtotal, callback) {
    const uf = String(estado || '').trim().toUpperCase();

    db.all('SELECT * FROM frete_regioes ORDER BY id', [], (erro, regioes) => {
        if (erro || !regioes.length) return callback(erro || new Error('Nenhuma região de frete cadastrada.'));

        // procura a região que contém o estado; se não achar, usa a última (a mais distante)
        let regiao = regioes.find(r => r.ufs.split(',').map(s => s.trim()).includes(uf));
        if (!regiao) regiao = regioes[regioes.length - 1];

        const kg = Math.max(1, Math.ceil(Number(pesoGramas || 0) / 1000));
        const gratis = Number(subtotal || 0) >= FRETE_GRATIS_A_PARTIR;
        const valor = gratis ? 0 : Math.round((regiao.valor_base + regiao.valor_kg * kg) * 100) / 100;

        callback(null, { valor, regiao, kg, gratis });
    });
}

module.exports = { calcularFrete, FRETE_GRATIS_A_PARTIR };
