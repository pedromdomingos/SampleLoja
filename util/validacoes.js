// Funções de validação reutilizadas nos formulários

function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '');
}

// Valida CPF pelos dígitos verificadores
function cpfValido(cpf) {
    cpf = somenteNumeros(cpf);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    for (let t = 9; t < 11; t++) {
        let soma = 0;
        for (let i = 0; i < t; i++) {
            soma += Number(cpf[i]) * (t + 1 - i);
        }
        const digito = ((soma * 10) % 11) % 10;
        if (digito !== Number(cpf[t])) return false;
    }
    return true;
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

// Senha: mínimo 8 caracteres (RN6)
function senhaValida(senha) {
    return typeof senha === 'string' && senha.length >= 8;
}

module.exports = { somenteNumeros, cpfValido, emailValido, senhaValida };
