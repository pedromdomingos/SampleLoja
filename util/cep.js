// Descobre o estado (UF) pelo começo do CEP, usando as faixas dos Correios.
// Serve para calcular o frete na página do produto, antes mesmo do cliente ter um endereço cadastrado.
const FAIXAS = [
    [1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'],
    [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'],
    [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'],
    [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'],
    [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 73699, 'DF'],
    [73700, 76799, 'GO'], [76800, 76999, 'RO'], [77000, 77999, 'TO'], [78000, 78899, 'MT'],
    [78900, 78999, 'RO'], [79000, 79999, 'MS'], [80000, 87999, 'PR'], [88000, 89999, 'SC'],
    [90000, 99999, 'RS']
];

// "89560-000" -> "SC"   (devolve null se o CEP não existir)
function estadoPorCep(cep) {
    const numeros = String(cep || '').replace(/\D/g, '');
    if (numeros.length !== 8) return null;
    const inicio = parseInt(numeros.slice(0, 5));
    const faixa = FAIXAS.find(f => inicio >= f[0] && inicio <= f[1]);
    return faixa ? faixa[2] : null;
}

module.exports = { estadoPorCep };
