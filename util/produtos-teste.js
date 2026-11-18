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

].map(p => Object.assign({ artista: '', genero: '', destaque: 0 }, p, { imagem: p.imagem }));


// ===== CATÁLOGO REAL =====
// Produtos reais pesquisados em lojas brasileiras (Magazine Luiza e outras). Os preços são de REFERÊNCIA,
// vistos na pesquisa em novembro de 2026, e mudam nas lojas. As fotos NÃO vêm junto: salve cada foto em
// public/uploads com o nome do campo "imagem" (veja a LISTA_DE_FOTOS.md). Sem a foto, aparece uma imagem padrão.
// Este lote entra uma única vez em cada banco (a tabela "sementes" lembra disso).

// roupa(nome, banda, gênero musical, tipo da peça, cor, preço, preço promocional, arquivo da foto)
function roupa(nome, artista, genero, tipo_peca, cor, valor, promo, imagem, destaque) {
    return {
        nome, categoria: 'Roupas', tipo_produto: 'roupa', valor, valor_promocional: promo || null, estoque: 15, imagem,
        descricao: nome + '. Peça de banda para quem vive o rock todo dia.',
        artista, genero, peso: tipo_peca === 'Moletom' ? 700 : 250, destaque: destaque ? 1 : 0, avaliacao: 0,
        publico: 'Unissex', tipo_peca, tamanho: 'M', cor, modelagem: 'Tradicional'
    };
}

// instrumento(nome, categoria, tipo, preço, preço promocional, foto, peso, descrição, campos específicos)
function instrumento(nome, categoria, tipo_produto, valor, promo, imagem, peso, descricao, campos) {
    return Object.assign({
        nome, categoria, tipo_produto, valor, valor_promocional: promo || null, estoque: 8, imagem, peso, descricao,
        artista: '', genero: '', destaque: 0, avaliacao: 0
    }, campos);
}

// disco(nome, artista, gênero, formato, edição, gravadora, ano do álbum, preço, preço promocional, foto)
function disco(nome, artista, genero, formato, edicao, gravadora, ano, valor, promo, imagem, destaque) {
    return {
        nome, categoria: 'Discos / Vinis', tipo_produto: 'disco', valor, valor_promocional: promo || null, estoque: 10, imagem,
        descricao: nome + '. ' + edicao + '.',
        artista, genero, ano_lancamento: ano, gravadora, peso: formato === 'CD' ? 120 : 350, destaque: destaque ? 1 : 0, avaliacao: 0,
        formato, velocidade: formato === 'CD' ? null : '33 RPM', edicao
    };
}

const catalogoReal = [
    // ----- Roupas (14) -----
    roupa('Camiseta Led Zeppelin Highway to Heaven Preta', 'Led Zeppelin', 'Hard Rock', 'Camiseta', 'Preto', 59.9, null, 'camiseta-led-zeppelin-highway-heaven.jpg', true),
    roupa('Camiseta Pink Floyd Banda de Rock Unissex', 'Pink Floyd', 'Rock Progressivo', 'Camiseta', 'Preto', 59.9, 58.7, 'camiseta-pink-floyd-mr254.jpg'),
    roupa('Camiseta Pink Floyd The Final Cut Oficial Licenciada', 'Pink Floyd', 'Rock Progressivo', 'Camiseta', 'Preto', 79.9, null, 'camiseta-pink-floyd-final-cut.jpg'),
    roupa('Camiseta Ramones Banda Unissex', 'Ramones', 'Punk Rock', 'Camiseta', 'Preto', 59.9, null, 'camiseta-ramones.jpg'),
    roupa('Camiseta Alice in Chains Banda de Rock Unissex', 'Alice in Chains', 'Grunge', 'Camiseta', 'Preto', 69.9, null, 'camiseta-alice-in-chains.jpg'),
    roupa('Camiseta Metallica One Preta Oficial Stamp', 'Metallica', 'Heavy Metal', 'Camiseta', 'Preto', 129.96, null, 'camiseta-metallica-one-stamp.jpg'),
    roupa('Camiseta Iron Maiden Of0027 Consulado do Rock Oficial', 'Iron Maiden', 'Heavy Metal', 'Camiseta', 'Preto', 69.9, 65.01, 'camiseta-iron-maiden-of0027.jpg'),
    roupa('Camiseta Megadeth Of0083 Consulado do Rock Oficial', 'Megadeth', 'Thrash Metal', 'Camiseta', 'Preto', 73.46, null, 'camiseta-megadeth-of0083.jpg'),
    roupa('Camiseta Kiss Of0120 Consulado do Rock Oficial', 'Kiss', 'Hard Rock', 'Camiseta', 'Preto', 73.46, null, 'camiseta-kiss-of0120.jpg'),
    roupa('Camiseta Slayer Of0116 Consulado do Rock Oficial', 'Slayer', 'Thrash Metal', 'Camiseta', 'Preto', 73.46, null, 'camiseta-slayer-of0116.jpg'),
    roupa('Camiseta Ratos de Porão Of0044 Consulado do Rock', 'Ratos de Porão', 'Hardcore Punk', 'Camiseta', 'Preto', 69.9, 65.01, 'camiseta-ratos-de-porao-of0044.jpg'),
    roupa('Camiseta Masculina Foo Fighters Banda Rock', 'Foo Fighters', 'Rock Alternativo', 'Camiseta', 'Preto', 44.9, null, 'camiseta-foo-fighters.jpg'),
    roupa('Camiseta Regata Led Zeppelin', 'Led Zeppelin', 'Hard Rock', 'Regata', 'Preto', 59.9, null, 'regata-led-zeppelin.jpg'),
    roupa('Blusa Canguru com Capuz Led Zeppelin Unissex', 'Led Zeppelin', 'Hard Rock', 'Moletom', 'Preto', 150, 124.9, 'moletom-led-zeppelin-capuz.jpg'),

    // ----- Instrumentos (15) -----
    instrumento('Guitarra Elétrica Tagima TG-500 Stratocaster Preta Escala Escura', 'Guitarras', 'guitarra', 1179.9, null, 'guitarra-tagima-tg-500.jpg', 3600,
        'Guitarra Tagima TG-500 no formato Stratocaster, com captadores single coil na configuração SSS.',
        { marca: 'Tagima', modelo: 'TG-500', numero_cordas: 6, captadores: 'SSS' }),
    instrumento('Guitarra Elétrica Tagima TW Series TG-510 Stratocaster Tília Preta', 'Guitarras', 'guitarra', 989, 939.55, 'guitarra-tagima-tg-510.jpg', 3600,
        'Guitarra Tagima da linha TW Series, modelo TG-510, Stratocaster com alavanca e corpo em tília.',
        { marca: 'Tagima', modelo: 'TG-510', numero_cordas: 6, material_corpo: 'Tília' }),
    instrumento('Guitarra Elétrica Tagima Série Memphis MG-30 Stratocaster', 'Guitarras', 'guitarra', 834.5, null, 'guitarra-tagima-memphis-mg-30.jpg', 3500,
        'Guitarra Tagima da Série Memphis, modelo MG-30, no formato Stratocaster. Boa opção para quem está começando.',
        { marca: 'Tagima', modelo: 'Memphis MG-30', numero_cordas: 6 }),
    instrumento('Guitarra Elétrica Fender Squier Stratocaster Surf Green', 'Guitarras', 'guitarra', 1499.78, null, 'guitarra-squier-stratocaster-surf-green.jpg', 3600,
        'Guitarra Stratocaster da Squier by Fender na cor Surf Green.',
        { marca: 'Squier by Fender', modelo: 'Stratocaster', numero_cordas: 6 }),
    instrumento('Guitarra Strato Strinberg STS-100 Preto Fosco', 'Guitarras', 'guitarra', 1021, null, 'guitarra-strinberg-sts-100.jpg', 3600,
        'Guitarra Strinberg STS-100 no formato Stratocaster, acabamento preto fosco.',
        { marca: 'Strinberg', modelo: 'STS-100', numero_cordas: 6 }),
    instrumento('Contrabaixo Strinberg JBS-50 SB Jazz Bass Sunburst 4 Cordas Passivo', 'Baixos', 'baixo', 1249.25, null, 'baixo-strinberg-jbs-50.jpg', 4200,
        'Baixo Strinberg JBS-50 no estilo Jazz Bass, 4 cordas, captação passiva, acabamento sunburst.',
        { marca: 'Strinberg', modelo: 'JBS-50', numero_cordas: 4 }),
    instrumento('Contrabaixo Tagima TBA-73 BK 4 Cordas Passivo Preto Tortoise', 'Baixos', 'baixo', 1804.91, null, 'baixo-tagima-tba-73.jpg', 4200,
        'Contrabaixo Tagima TBA-73 de 4 cordas, passivo, na cor preta com escudo tortoise.',
        { marca: 'Tagima', modelo: 'TBA-73', numero_cordas: 4 }),
    instrumento('Violão Folk Yamaha F310P TBS Tobacco Brown Sunburst Aço', 'Violões', 'violao', 1799, null, 'violao-yamaha-f310p.jpg', 2000,
        'Violão folk de cordas de aço Yamaha F310P, indicado para iniciantes e para quem já toca.',
        { marca: 'Yamaha', modelo: 'F310P', numero_cordas: 6, tipo_corda: 'Aço', material_tampo: 'Spruce' }),
    instrumento('Violão Yamaha C40MII Clássico Nylon Natural', 'Violões', 'violao', 994.09, null, 'violao-yamaha-c40mii.jpg', 2000,
        'Violão clássico de cordas de nylon Yamaha C40 II, na cor natural.',
        { marca: 'Yamaha', modelo: 'C40 II', numero_cordas: 6, tipo_corda: 'Nylon' }),
    instrumento('Violão Acústico Giannini Nylon Performance Plus N-17 Natural', 'Violões', 'violao', 574.9, 517.41, 'violao-giannini-n-17.jpg', 2000,
        'Violão acústico de nylon Giannini, linha Performance Plus, modelo N-17.',
        { marca: 'Giannini', modelo: 'N-17', numero_cordas: 6, tipo_corda: 'Nylon' }),
    instrumento('Violão Acústico Aço Giannini S-14 Start Estudo', 'Violões', 'violao', 513.9, 462.51, 'violao-giannini-s-14.jpg', 2000,
        'Violão acústico de cordas de aço Giannini, linha Start, modelo S-14, para estudo.',
        { marca: 'Giannini', modelo: 'S-14 Start', numero_cordas: 6, tipo_corda: 'Aço' }),
    instrumento('Violão Tagima Memphis AD-60 Nylon Eletroacústico Preto', 'Violões', 'violao', 699, null, 'violao-tagima-memphis-ad-60.jpg', 2200,
        'Violão eletroacústico de nylon Tagima Memphis AD-60, cor preta.',
        { marca: 'Tagima', modelo: 'Memphis AD-60', numero_cordas: 6, tipo_corda: 'Nylon' }),
    instrumento('Teclado Musical Casio Casiotone CT-S300 Preto 61 Teclas', 'Outros instrumentos', 'instrumento', 1249.99, null, 'teclado-casio-ct-s300.jpg', 4000,
        'Teclado Casiotone CT-S300 com 61 teclas e teclas sensíveis ao toque. Funciona com o aplicativo gratuito Chordana Play.',
        { tipo_instrumento: 'Teclado', marca: 'Casio', modelo: 'CT-S300' }),
    instrumento('Teclado Yamaha PSR-E383 61 Teclas', 'Outros instrumentos', 'instrumento', 1647.03, null, 'teclado-yamaha-psr-e383.jpg', 4500,
        'Teclado Yamaha PSR-E383 com 61 teclas.',
        { tipo_instrumento: 'Teclado', marca: 'Yamaha', modelo: 'PSR-E383' }),
    instrumento('Bateria Completa Acústica Profissional MXT M-B120P Preta', 'Baterias', 'bateria', 3037.61, null, 'bateria-mxt-m-b120p.jpg', 28000,
        'Bateria acústica completa MXT M-B120P na cor preta.',
        { marca: 'MXT', modelo: 'M-B120P' }),

    // ----- Discos (16) -----
    disco('Vinil Pink Floyd The Dark Side of the Moon', 'Pink Floyd', 'Rock Progressivo', 'Vinil LP', 'Edição em vinil Legacy Recordings', 'Legacy Recordings', 1973, 390.08, null, 'vinil-pink-floyd-dark-side.jpg', true),
    disco('Vinil Led Zeppelin Physical Graffiti (Remasterização 2015)', 'Led Zeppelin', 'Hard Rock', 'Vinil LP', 'Remasterização de 2015', 'Atlantic', 1975, 643.26, null, 'vinil-led-zeppelin-physical-graffiti.jpg'),
    disco('Vinil Led Zeppelin III Edição Deluxe (Remasterização 2014)', 'Led Zeppelin', 'Hard Rock', 'Vinil LP', 'Edição Deluxe, remasterização de 2014', 'Atlantic', 1970, 549.04, null, 'vinil-led-zeppelin-iii.jpg'),
    disco('Vinil Black Sabbath Master of Reality', 'Black Sabbath', 'Heavy Metal', 'Vinil LP', 'Edição em vinil', null, 1971, 305.08, null, 'vinil-black-sabbath-master-of-reality.jpg'),
    disco('Vinil The Beatles Magical Mystery Tour', 'The Beatles', 'Rock Clássico', 'Vinil LP', 'Edição em vinil', null, 1967, 247.22, null, 'vinil-beatles-magical-mystery-tour.jpg'),
    disco('Vinil The Beatles The White Album 2 LP', 'The Beatles', 'Rock Clássico', 'Vinil LP', 'Álbum duplo (2 LPs)', null, 1968, 457.62, null, 'vinil-beatles-white-album.jpg'),
    disco('Vinil The Beatles Abbey Road Edição de Aniversário', 'The Beatles', 'Rock Clássico', 'Vinil LP', 'Edição de aniversário', null, 1969, 294.56, null, 'vinil-beatles-abbey-road.jpg', true),
    disco('Vinil Queen A Night at the Opera Edição Limitada 180g', 'Queen', 'Rock Clássico', 'Vinil LP', 'Edição limitada importada, 180 gramas, capa gatefold', 'Hollywood Records', 1975, 385.25, null, 'vinil-queen-a-night-at-the-opera.jpg'),
    disco('Vinil Nirvana Secrets RSD 2022 Limitado Verde', 'Nirvana', 'Grunge', 'Vinil LP', 'Edição limitada Record Store Day 2022, vinil verde', null, 2022, 194.9, null, 'vinil-nirvana-secrets-rsd-2022.jpg'),
    disco('CD Pink Floyd The Dark Side of the Moon', 'Pink Floyd', 'Rock Progressivo', 'CD', 'Edição em CD', null, 1973, 49.9, 44.9, 'cd-pink-floyd-dark-side.jpg'),
    disco('CD Nirvana Nevermind', 'Nirvana', 'Grunge', 'CD', 'Edição em CD Universal', 'Universal', 1991, 45.99, null, 'cd-nirvana-nevermind.jpg'),
    disco('CD My Chemical Romance The Black Parade', 'My Chemical Romance', 'Rock Alternativo', 'CD', 'Edição em CD Warner Music', 'Warner Music', 2006, 62.99, null, 'cd-mcr-the-black-parade.jpg'),
    disco('CD Iron Maiden Fear of the Dark', 'Iron Maiden', 'Heavy Metal', 'CD', 'Edição em CD', null, 1992, 39.9, 37.91, 'cd-iron-maiden-fear-of-the-dark.jpg'),
    disco('CD Iron Maiden Piece of Mind', 'Iron Maiden', 'Heavy Metal', 'CD', 'Edição em CD Warner Music', 'Warner Music', 1983, 45.99, null, 'cd-iron-maiden-piece-of-mind.jpg'),
    disco('CD Iron Maiden Seventh Son of a Seventh Son', 'Iron Maiden', 'Heavy Metal', 'CD', 'Edição em CD', null, 1988, 39.9, 37.91, 'cd-iron-maiden-seventh-son.jpg'),
    disco('CD Duplo Helloween Master of the Rings Expanded Edition', 'Helloween', 'Power Metal', 'CD', 'Edição expandida, CD duplo', null, 1994, 205, 194.75, 'cd-helloween-master-of-the-rings.jpg'),
    disco('CD AC/DC Back in Black', 'AC/DC', 'Hard Rock', 'CD', 'Edição em CD', null, 1980, 39.9, 37.91, 'cd-acdc-back-in-black.jpg', true),
    disco('CD Metallica The Black Album (Remastered) Universal Music', 'Metallica', 'Heavy Metal', 'CD', 'Edição remasterizada em CD', 'Universal Music', 1991, 49.99, 44.99, 'cd-metallica-black-album.jpg'),
    disco('CD Queen Greatest Hits I', 'Queen', 'Rock Clássico', 'CD', 'Coletânea em CD', null, 1981, 39.9, 37.91, 'cd-queen-greatest-hits.jpg'),
    disco('CD Legião Urbana Legião Urbana Digipack', 'Legião Urbana', 'Rock Nacional', 'CD', 'Edição digipack em CD', null, 1985, 78.9, 74.96, 'cd-legiao-urbana.jpg')
];

module.exports = { categoriasIniciais, produtosDeTeste, catalogoReal };
