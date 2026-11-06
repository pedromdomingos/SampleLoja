// Produtos e categorias de TESTE: são criados sozinhos na primeira execução, só se ainda não houver
// nenhum produto no banco. Servem para demonstrar a loja, o carrinho e os pedidos.
// Para apagar, basta excluir os produtos pelo painel.

const categoriasIniciais = [
    ['Roupas', 'Camisetas, moletons e peças para quem vive o rock.', 'roupa'],
    ['Guitarras', 'Guitarras elétricas e semiacústicas.', 'guitarra'],
    ['Baixos', 'Baixos de 4, 5 e 6 cordas.', 'baixo'],
    ['Baterias', 'Baterias acústicas e eletrônicas.', 'bateria'],
    ['Violões', 'Violões de nylon e de aço.', 'violao'],
    ['Outros instrumentos', 'Teclados, pedais, amplificadores e acessórios.', 'instrumento'],
    ['Discos / Vinis', 'LPs, singles e edições especiais.', 'disco']
];

// "destaque" = aparece em Mais vendidos | "valor_promocional" = aparece em Promoções
const tee = (nome, artista, genero, cor, tamanho, imagem, avaliacao) => ({
    nome: `Camiseta unissex ${nome}`, categoria: 'Roupas', tipo_produto: 'roupa', valor: 105.5, estoque: 25,
    descricao: `Camiseta unissex em algodão com estampa de ${nome}. Para vestir o rock todo dia.`,
    imagem, artista, genero, ano_lancamento: 2024, peso: 250, destaque: 1, avaliacao,
    tamanho, cor, material: 'Algodão', modelagem: 'Tradicional'
});

const produtosDeTeste = [
    // ----- Roupas (Mais vendidos) -----
    tee('Red Hot Chili Peppers', 'Red Hot Chili Peppers', 'Rock Alternativo', 'Preto', 'M', 'tee-rhcp.jpg', 4),
    tee('Iron Maiden', 'Iron Maiden', 'Heavy Metal', 'Azul marinho', 'G', 'tee-ironmaiden.jpg', 3),
    tee('Raul Seixas', 'Raul Seixas', 'Rock Nacional', 'Preto', 'M', 'tee-raulseixas.jpg', 5),
    tee('Nirvana', 'Nirvana', 'Grunge', 'Preto', 'P', 'tee-nirvana.jpg', 5),
    tee('AC/DC', 'AC/DC', 'Hard Rock', 'Preto', 'GG', 'tee-acdc.jpg', 4),
    tee('Queen', 'Queen', 'Rock Clássico', 'Vinho', 'M', 'tee-queen.jpg', 5),

    // ----- Instrumentos (Promoções) -----
    {
        nome: 'Baixo Elétrico Tagima Millenium 5 Cordas Preto Soap Bar HH Maple', categoria: 'Baixos', tipo_produto: 'baixo',
        valor: 2700, valor_promocional: 1531, estoque: 8, imagem: 'promo-baixo.jpg', peso: 4200, avaliacao: 5, ano_lancamento: 2023,
        descricao: 'Baixo de 5 cordas na cor preta, com captadores soap bar HH e escala em maple.',
        marca: 'Tagima', modelo: 'Millenium', numero_cordas: 5, captadores: 'Soap bar HH', material_corpo: 'Basswood', material_escala: 'Maple'
    },
    {
        nome: 'Guitarra Elétrica Bravo Music BSG450 Black Formato SG', categoria: 'Guitarras', tipo_produto: 'guitarra',
        valor: 2229, valor_promocional: 1890, estoque: 6, imagem: 'promo-guitarra.jpg', peso: 3800, avaliacao: 4, ano_lancamento: 2023,
        descricao: 'Guitarra no formato SG, na cor preta, acompanha capa.',
        marca: 'Bravo Music', modelo: 'BSG450', numero_cordas: 6, captadores: 'HH', ponte: 'Fixa', material_corpo: 'Mogno'
    },
    {
        nome: 'Bateria Acústica Voik BAM22-BK Cor Preto Brilhante Bumbo 22"', categoria: 'Baterias', tipo_produto: 'bateria',
        valor: 4851, valor_promocional: 2340, estoque: 3, imagem: 'promo-bateria.jpg', peso: 32000, avaliacao: 4, ano_lancamento: 2022,
        descricao: 'Bateria acústica de 5 peças com bumbo de 22", pratos e ferragens.',
        marca: 'Voik', modelo: 'BAM22-BK', numero_pecas: 5, material_casco: 'Poplar', pratos_ferragens: 'Sim', cor: 'Preto brilhante'
    },
    {
        nome: 'Pedal de Distorção para Guitarra', categoria: 'Outros instrumentos', tipo_produto: 'instrumento',
        valor: 389, valor_promocional: 249, estoque: 15, imagem: 'promo-pedal.jpg', peso: 450, avaliacao: 4, ano_lancamento: 2024,
        descricao: 'Pedal de distorção com controles de drive, tone e level.',
        tipo_instrumento: 'Pedal / efeito', marca: 'Sample', modelo: 'Distortion'
    },
    {
        nome: 'Encordoamento para Guitarra 0.10', categoria: 'Outros instrumentos', tipo_produto: 'instrumento',
        valor: 59, valor_promocional: 39.9, estoque: 60, imagem: 'promo-cordas.jpg', peso: 80, avaliacao: 5, ano_lancamento: 2024,
        descricao: 'Jogo de cordas de aço niquelado, calibre 0.10, para guitarra.',
        tipo_instrumento: 'Acessório', marca: 'Sample', modelo: '0.10'
    },

    // ----- Discos / Vinis -----
    {
        nome: 'Vinil LP Clássicos do Rock', categoria: 'Discos / Vinis', tipo_produto: 'disco', genero: 'Rock Clássico',
        valor: 199, valor_promocional: 149, estoque: 20, imagem: 'promo-vinil.jpg', peso: 300, avaliacao: 5, ano_lancamento: 2022,
        descricao: 'Coletânea de clássicos do rock em vinil de 12 polegadas.',
        formato: 'Vinil LP', velocidade: '33 RPM', edicao: 'Coletânea'
    },
    {
        nome: 'Vinil LP Hard Rock Essencial', categoria: 'Discos / Vinis', tipo_produto: 'disco', genero: 'Hard Rock',
        valor: 229, estoque: 12, imagem: 'disco-hardrock.jpg', peso: 320, avaliacao: 4, ano_lancamento: 2021,
        descricao: 'Os maiores sucessos do hard rock reunidos em um único LP.',
        formato: 'Vinil LP', velocidade: '33 RPM', edicao: 'Edição especial'
    },
    {
        nome: 'Vinil LP Heavy Metal Antologia', categoria: 'Discos / Vinis', tipo_produto: 'disco', genero: 'Heavy Metal',
        valor: 249, estoque: 9, imagem: 'disco-metal.jpg', peso: 320, avaliacao: 5, ano_lancamento: 2020,
        descricao: 'Antologia do heavy metal em vinil, com encarte.',
        formato: 'Vinil LP', velocidade: '33 RPM', edicao: 'Remasterizada'
    },
    {
        nome: 'CD Rock Nacional Coletânea', categoria: 'Discos / Vinis', tipo_produto: 'disco', genero: 'Rock Nacional',
        valor: 59.9, estoque: 30, imagem: 'disco-nacional.jpg', peso: 120, avaliacao: 4, ano_lancamento: 2019,
        descricao: 'Coletânea com os grandes nomes do rock nacional em CD.',
        formato: 'CD', velocidade: '33 RPM', edicao: 'Coletânea'
    }
].map(p => Object.assign({ artista: '', genero: '', destaque: 0 }, p, { imagem: p.imagem }));


// ===== CATÁLOGO V2: mais produtos para a loja ficar cheia (inseridos UMA vez, em qualquer banco, novo ou antigo) =====
// As imagens são ilustrações (SVG) em public/img. Para usar fotos reais, cadastre o produto pelo painel com a foto.
const roupa = (nome, artista, genero, publico, tipo_peca, tamanho, cor, modelagem, valor, promo, imagem, extra) => Object.assign({
    nome, categoria: 'Roupas', tipo_produto: 'roupa', valor, valor_promocional: promo || null, estoque: 18,
    descricao: `${nome}. Peça da coleção SAMPLE para vestir o rock todo dia.`,
    imagem, artista, genero, ano_lancamento: 2026, peso: 300, destaque: 0, avaliacao: 4,
    publico, tipo_peca, tamanho, cor, material: 'Algodão', modelagem
}, extra || {});

const instr = (nome, categoria, tipo_produto, valor, promo, imagem, peso, specs, extra) => Object.assign({
    nome, categoria, tipo_produto, valor, valor_promocional: promo || null, estoque: 10, imagem, peso, ano_lancamento: 2026,
    descricao: `${nome}. Equipamento SAMPLE para botar o seu som no volume máximo.`, artista: '', genero: '', destaque: 0, avaliacao: 5
}, specs, extra || {});

const disco = (nome, genero, valor, promo, imagem, formato, velocidade, edicao, ano, extra) => Object.assign({
    nome, categoria: 'Discos / Vinis', tipo_produto: 'disco', valor, valor_promocional: promo || null, estoque: 14, imagem, peso: formato === 'CD' ? 120 : 320,
    descricao: `${nome}. ${edicao}, para ouvir do jeito que o rock merece.`, artista: '', genero, ano_lancamento: ano, destaque: 0, avaliacao: 5,
    formato, velocidade, edicao
}, extra || {});

const produtosCatalogoV2 = [
    // ----- Roupas -----
    roupa('Camiseta Feminina Pink Floyd The Wall', 'Pink Floyd', 'Rock Progressivo', 'Feminino', 'Camiseta', 'P', 'Preto', 'Baby look', 99.9, null, 'tee-pinkfloyd.svg', { avaliacao: 5 }),
    roupa('Camiseta Masculina Metallica Master of Puppets', 'Metallica', 'Heavy Metal', 'Masculino', 'Camiseta', 'G', 'Preto', 'Tradicional', 109.9, 89.9, 'tee-metallica.svg', { avaliacao: 5 }),
    roupa('Camiseta Oversized Ramones', 'Ramones', 'Punk Rock', 'Unissex', 'Camiseta', 'M', 'Branco', 'Oversized', 119.9, null, 'tee-ramones.svg'),
    roupa('Jaqueta Jeans Patches Rock', '', '', 'Unissex', 'Jaqueta', 'M', 'Azul jeans', 'Tradicional', 289.9, 249.9, 'jaqueta-jeans.svg', { material: 'Jeans', peso: 900, destaque: 1, avaliacao: 5 }),
    roupa('Moletom Amplificada com Capuz', '', '', 'Unissex', 'Moletom', 'GG', 'Cinza mescla', 'Moletom', 189.9, 159.9, 'moletom-amplificada.svg', { material: 'Algodão e poliéster', peso: 750 }),
    roupa('Boné Distorção Aba Curva', '', '', 'Unissex', 'Acessório', 'M', 'Preto e vermelho', 'Tradicional', 59.9, null, 'bone-distorcao.svg', { material: 'Sarja', peso: 120, avaliacao: 4 }),

    // ----- Instrumentos -----
    instr('Guitarra Stray Cat SG', 'Guitarras', 'guitarra', 1899, null, 'guitarra-straycat.svg', 3700,
        { marca: 'Sample', modelo: 'Stray Cat SG', numero_cordas: 6, captadores: 'HH', ponte: 'Fixa', material_corpo: 'Mogno' }, { destaque: 1 }),
    instr('Guitarra Strato Garage', 'Guitarras', 'guitarra', 2299, 2069, 'guitarra-strato.svg', 3500,
        { marca: 'Sample', modelo: 'Strato Garage', numero_cordas: 6, captadores: 'HSS', ponte: 'Tremolo', material_corpo: 'Alder', material_escala: 'Maple' }),
    instr('Baixo Thunder 4 Cordas', 'Baixos', 'baixo', 1599, null, 'baixo-thunder.svg', 4100,
        { marca: 'Sample', modelo: 'Thunder 4', numero_cordas: 4, captadores: 'PJ', material_corpo: 'Basswood', material_escala: 'Maple' }),
    instr('Violão Folk Cinzas Aço', 'Violões', 'violao', 899, 749, 'violao-folk.svg', 2300,
        { marca: 'Sample', modelo: 'Folk Cinzas', numero_cordas: 6, tipo_corda: 'Aço', material_tampo: 'Spruce' }),
    instr('Teclado Synth 61 Teclas', 'Outros instrumentos', 'instrumento', 1299, null, 'teclado-synth.svg', 4800,
        { tipo_instrumento: 'Teclado', marca: 'Sample', modelo: 'Synth 61' }),
    instr('Pedal FuzzTone', 'Outros instrumentos', 'instrumento', 349.9, 262.43, 'pedal-fuzztone.svg', 420,
        { tipo_instrumento: 'Pedal / efeito', marca: 'Sample', modelo: 'FuzzTone' }, { destaque: 1 }),
    instr('Amplificador Combo 30W', 'Outros instrumentos', 'instrumento', 1190, null, 'amp-combo.svg', 9800,
        { tipo_instrumento: 'Amplificador', marca: 'Sample', modelo: 'Combo 30' }),
    instr('Baquetas Thunder 5A', 'Outros instrumentos', 'instrumento', 49.9, null, 'baquetas-thunder.svg', 150,
        { tipo_instrumento: 'Acessório', marca: 'Sample', modelo: 'Thunder 5A' }, { estoque: 60 }),

    // ----- Discos -----
    disco('Vinil Noites de Garagem', 'Rock Nacional', 129.9, null, 'disco-garagem.svg', 'Vinil LP', '33 RPM', 'Edição limitada', 2024, { destaque: 1 }),
    disco('Vinil Fumaça Elétrica Ao Vivo', 'Hard Rock', 149.9, 119.9, 'disco-fumaca.svg', 'Vinil LP', '33 RPM', 'Gravação ao vivo', 2023),
    disco('CD Cinzas do Asfalto', 'Rock Alternativo', 39.9, null, 'cd-cinzas.svg', 'CD', '33 RPM', 'Edição padrão', 2022),
    disco('CD Os Marginais Best Of', 'Punk Rock', 44.9, null, 'cd-marginais.svg', 'CD', '33 RPM', 'Coletânea', 2021),
    disco('Box Set Vaidade Suja 1976', 'Rock Clássico', 389.9, null, 'box-vaidade.svg', 'Box Set', '33 RPM', 'Edição de colecionador', 2026, { destaque: 1, peso: 1200 }),
    disco('Vinil Máquina de Ferrugem', 'Heavy Metal', 119.9, 99.9, 'disco-ferrugem.svg', 'Vinil LP', '33 RPM', 'Edição remasterizada', 2020)
];

module.exports = { categoriasIniciais, produtosDeTeste, produtosCatalogoV2 };
