// CATÁLOGO DE TIPOS DE CATEGORIA E ESPECIFICAÇÕES DOS PRODUTOS
//
// Cada categoria tem um "tipo". O tipo define quais especificações o produto tem.
// O formulário de produto, a validação no servidor e as colunas do banco usam ESTA lista:
// para mudar ou criar uma especificação, basta editar aqui.
//
// Cada campo tem:
//   nome        -> nome da coluna no banco (e do campo do formulário)
//   rotulo      -> texto mostrado na tela
//   tipo        -> 'texto', 'numero' ou 'select' (lista de opções)
//   obrigatorio -> true = precisa preencher para cadastrar o produto
//   opcoes      -> opções do select
//   placeholder -> exemplo mostrado no campo

const SIM_NAO = ['Sim', 'Não'];

const TIPOS = {
    roupa: {
        rotulo: 'Roupas',
        titulo: 'Especificações de roupa',
        campos: [
            { nome: 'publico', rotulo: 'Gênero (público)', tipo: 'select', opcoes: ['Feminino', 'Masculino', 'Unissex'], obrigatorio: true },
            { nome: 'tipo_peca', rotulo: 'Tipo de peça', tipo: 'select', opcoes: ['Camiseta', 'Regata', 'Jaqueta', 'Moletom', 'Acessório'], obrigatorio: true },
            { nome: 'tamanho', rotulo: 'Tamanho', tipo: 'select', opcoes: ['PP', 'P', 'M', 'G', 'GG', 'XGG'], obrigatorio: true },
            { nome: 'cor', rotulo: 'Cor', tipo: 'texto', placeholder: 'Ex.: Preto', obrigatorio: true },
            { nome: 'material', rotulo: 'Material', tipo: 'texto', placeholder: 'Ex.: Algodão', obrigatorio: true },
            { nome: 'modelagem', rotulo: 'Modelagem', tipo: 'select', opcoes: ['Tradicional', 'Oversized', 'Baby look', 'Moletom'] }
        ]
    },

    guitarra: {
        rotulo: 'Guitarras',
        titulo: 'Especificações da guitarra',
        campos: [
            { nome: 'marca', rotulo: 'Marca', tipo: 'texto', placeholder: 'Ex.: Fender', obrigatorio: true },
            { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', placeholder: 'Ex.: Stratocaster', obrigatorio: true },
            { nome: 'numero_cordas', rotulo: 'Nº de cordas', tipo: 'numero', placeholder: '6', obrigatorio: true },
            { nome: 'captadores', rotulo: 'Captadores', tipo: 'texto', placeholder: 'Ex.: HSS', obrigatorio: true },
            { nome: 'ponte', rotulo: 'Ponte', tipo: 'texto', placeholder: 'Ex.: Tremolo' },
            { nome: 'material_corpo', rotulo: 'Material do corpo', tipo: 'texto', placeholder: 'Ex.: Alder' },
            { nome: 'material_escala', rotulo: 'Material da escala', tipo: 'texto', placeholder: 'Ex.: Maple' }
        ]
    },

    baixo: {
        rotulo: 'Baixos',
        titulo: 'Especificações do baixo',
        campos: [
            { nome: 'marca', rotulo: 'Marca', tipo: 'texto', placeholder: 'Ex.: Tagima', obrigatorio: true },
            { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', placeholder: 'Ex.: Millenium', obrigatorio: true },
            { nome: 'numero_cordas', rotulo: 'Nº de cordas', tipo: 'numero', placeholder: '4', obrigatorio: true },
            { nome: 'captadores', rotulo: 'Captadores', tipo: 'texto', placeholder: 'Ex.: Soap bar HH', obrigatorio: true },
            { nome: 'material_corpo', rotulo: 'Material do corpo', tipo: 'texto', placeholder: 'Ex.: Basswood' },
            { nome: 'material_escala', rotulo: 'Material da escala', tipo: 'texto', placeholder: 'Ex.: Maple' }
        ]
    },

    bateria: {
        rotulo: 'Baterias',
        titulo: 'Especificações da bateria',
        campos: [
            { nome: 'marca', rotulo: 'Marca', tipo: 'texto', placeholder: 'Ex.: Voik', obrigatorio: true },
            { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', placeholder: 'Ex.: BAM22-BK', obrigatorio: true },
            { nome: 'numero_pecas', rotulo: 'Nº de peças', tipo: 'numero', placeholder: '5', obrigatorio: true },
            { nome: 'material_casco', rotulo: 'Material do casco', tipo: 'texto', placeholder: 'Ex.: Bordo', obrigatorio: true },
            { nome: 'pratos_ferragens', rotulo: 'Vem com pratos e ferragens?', tipo: 'select', opcoes: SIM_NAO, obrigatorio: true },
            { nome: 'cor', rotulo: 'Cor / acabamento', tipo: 'texto', placeholder: 'Ex.: Preto brilhante' }
        ]
    },

    violao: {
        rotulo: 'Violões',
        titulo: 'Especificações do violão',
        campos: [
            { nome: 'marca', rotulo: 'Marca', tipo: 'texto', placeholder: 'Ex.: Giannini', obrigatorio: true },
            { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', placeholder: 'Ex.: Start', obrigatorio: true },
            { nome: 'numero_cordas', rotulo: 'Nº de cordas', tipo: 'numero', placeholder: '6', obrigatorio: true },
            { nome: 'tipo_corda', rotulo: 'Tipo de corda', tipo: 'select', opcoes: ['Aço', 'Nylon'], obrigatorio: true },
            { nome: 'material_tampo', rotulo: 'Material do tampo', tipo: 'texto', placeholder: 'Ex.: Spruce' }
        ]
    },

    // Para qualquer outro instrumento (teclado, pedal, amplificador...)
    instrumento: {
        rotulo: 'Outros instrumentos',
        titulo: 'Especificações do instrumento',
        campos: [
            { nome: 'tipo_instrumento', rotulo: 'Tipo', tipo: 'select', opcoes: ['Teclado', 'Pedal / efeito', 'Amplificador', 'Acessório', 'Outro'], obrigatorio: true },
            { nome: 'marca', rotulo: 'Marca', tipo: 'texto', placeholder: 'Ex.: Yamaha', obrigatorio: true },
            { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', placeholder: 'Ex.: PSR-E373', obrigatorio: true }
        ]
    },

    disco: {
        rotulo: 'Discos / Vinis',
        titulo: 'Especificações do disco / vinil',
        campos: [
            { nome: 'formato', rotulo: 'Formato', tipo: 'select', opcoes: ['Vinil LP', 'Vinil 7"', 'Vinil 12"', 'CD', 'Box Set', 'Outro'], obrigatorio: true },
            { nome: 'velocidade', rotulo: 'Velocidade', tipo: 'select', opcoes: ['33 RPM', '45 RPM', '78 RPM'], obrigatorio: true },
            { nome: 'edicao', rotulo: 'Edição', tipo: 'texto', placeholder: 'Ex.: Edição remasterizada', obrigatorio: true }
        ]
    },

    // Tipo antigo: continua existindo só para categorias que já estavam cadastradas.
    // Não aparece mais na criação de categorias.
    outros: {
        rotulo: 'Outros',
        titulo: '',
        campos: [],
        selecionavel: false
    }
};

// Tipos que o administrador pode escolher ao criar uma categoria
function tiposSelecionaveis() {
    return Object.keys(TIPOS).filter(t => TIPOS[t].selecionavel !== false);
}

// Todas as colunas de especificação (sem repetir): { nome, tipoSql }
function colunasDeEspecificacao() {
    const colunas = {};
    Object.values(TIPOS).forEach(t => t.campos.forEach(c => {
        colunas[c.nome] = c.tipo === 'numero' ? 'INTEGER' : 'TEXT';
    }));
    return Object.keys(colunas).map(nome => ({ nome, tipo: colunas[nome] }));
}

module.exports = { TIPOS, tiposSelecionaveis, colunasDeEspecificacao };
