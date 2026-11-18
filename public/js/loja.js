// JavaScript da loja. Cada bloco só funciona se os elementos existirem na página.

function buscar(seletor, dentro) {
    return (dentro || document).querySelector(seletor);
}
function buscarTodos(seletor, dentro) {
    return Array.from((dentro || document).querySelectorAll(seletor));
}

// ---------- Menu do topo: botão do celular e menus que abrem ao clicar ----------
const cabecalho = buscar('#lojaHeader');
if (cabecalho) {
    buscar('#navToggle').addEventListener('click', function () {
        cabecalho.classList.toggle('menu-aberto');
    });

    // O ícone da conta abre uma lista; clicar fora fecha
    const menus = buscarTodos('.user-dd');
    menus.forEach(function (menu) {
        buscar('button', menu).addEventListener('click', function (e) {
            e.stopPropagation();
            const estavaAberto = menu.classList.contains('aberto');
            menus.forEach(function (m) { m.classList.remove('aberto'); });
            if (!estavaAberto) menu.classList.add('aberto');
        });
    });
    document.addEventListener('click', function () {
        menus.forEach(function (m) { m.classList.remove('aberto'); });
    });
}

// ---------- Carrossel (Mais vendidos, Promoções, Novidades) ----------
// Os cards andam um por vez: o primeiro vai para o fim da fila (ou o último vem para o começo).
buscarTodos('.carousel-wrap').forEach(function (caixa) {
    const trilho = buscar('.carousel-track', caixa);
    const setaEsq = buscar('.seta-esq', caixa);
    const setaDir = buscar('.seta-dir', caixa);
    const TEMPO = 650;
    let andando = false;

    function larguraDoPasso() {
        const espaco = parseFloat(getComputedStyle(trilho).columnGap) || 0;
        return trilho.children[0].getBoundingClientRect().width + espaco;
    }

    // só mostra as setas se tiver mais cards do que cabe na tela
    function mostrarSetas() {
        const cabem = Math.round(buscar('.carousel-viewport', caixa).getBoundingClientRect().width / larguraDoPasso());
        setaEsq.hidden = setaDir.hidden = trilho.children.length <= cabem;
    }

    setaDir.addEventListener('click', function () {
        if (andando) return;
        andando = true;
        trilho.style.transition = 'transform ' + TEMPO + 'ms ease';
        trilho.style.transform = 'translateX(' + (-larguraDoPasso()) + 'px)';
        setTimeout(function () {
            trilho.style.transition = 'none';
            trilho.appendChild(trilho.firstElementChild);
            trilho.style.transform = 'translateX(0)';
            andando = false;
        }, TEMPO);
    });

    setaEsq.addEventListener('click', function () {
        if (andando) return;
        andando = true;
        trilho.style.transition = 'none';
        trilho.insertBefore(trilho.lastElementChild, trilho.firstElementChild);
        trilho.style.transform = 'translateX(' + (-larguraDoPasso()) + 'px)';
        trilho.offsetWidth; // força o navegador a aplicar a posição antes da animação
        trilho.style.transition = 'transform ' + TEMPO + 'ms ease';
        trilho.style.transform = 'translateX(0)';
        setTimeout(function () { andando = false; }, TEMPO);
    });

    window.addEventListener('resize', mostrarSetas);
    mostrarSetas();
});

// ---------- Animação: blocos com a classe "reveal" aparecem suavemente ao rolar a página ----------
const observador = new IntersectionObserver(function (lista) {
    lista.forEach(function (item) {
        if (item.isIntersecting) {
            item.target.classList.add('visivel');
            observador.unobserve(item.target);
        }
    });
}, { threshold: 0.12 });
buscarTodos('.reveal').forEach(function (el) { observador.observe(el); });

// ---------- Newsletter ----------
const newsletter = buscar('#newsletterForm');
if (newsletter) {
    newsletter.addEventListener('submit', function (e) {
        e.preventDefault();
        newsletter.reset();
        const aviso = document.createElement('div');
        aviso.className = 'toast-loja';
        aviso.textContent = 'Inscrito! Valeu por entrar no som alto.';
        document.body.appendChild(aviso);
        setTimeout(function () { aviso.remove(); }, 2600);
    });
}

// ---------- Quantidade com botões − e + (página do produto e carrinho) ----------
buscarTodos('[data-qtd]').forEach(function (caixa) {
    const campo = buscar('input[type=number]', caixa);
    const enviaSozinho = caixa.hasAttribute('data-auto'); // no carrinho, envia o formulário ao mudar

    function mudar(valor) {
        const nova = Math.max(1, Math.min(parseInt(campo.max) || 99, parseInt(campo.value) + valor));
        if (nova === parseInt(campo.value)) return;
        campo.value = nova;
        if (enviaSozinho) caixa.submit();
    }
    buscar('[data-menos]', caixa).addEventListener('click', function () { mudar(-1); });
    buscar('[data-mais]', caixa).addEventListener('click', function () { mudar(1); });
});

// ---------- Páginas com lista: "Ordenar por" e "Filtros" ----------
const formFiltros = buscar('#formFiltros');
if (formFiltros) {
    const painel = buscar('#painelFiltros');
    const menuOrdenar = buscar('#menuOrdenar');

    // o painel de filtros abre embaixo do botão "Filtros"
    buscar('#alternarFiltros').addEventListener('click', function (e) {
        e.stopPropagation();
        painel.hidden = !painel.hidden;
    });
    buscar('#btnOrdenar').addEventListener('click', function (e) {
        e.stopPropagation();
        menuOrdenar.hidden = !menuOrdenar.hidden;
    });
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.dd-filtros')) painel.hidden = true;
        if (!e.target.closest('.dd-ordenar')) menuOrdenar.hidden = true;
    });

    // mexeu em qualquer filtro ou na ordem: envia o formulário e a página recarrega com o resultado
    formFiltros.addEventListener('change', function () { formFiltros.submit(); });
}

// ---------- Página do produto: miniaturas trocam o fundo da foto grande ----------
buscarTodos('.miniatura').forEach(function (mini) {
    mini.addEventListener('click', function () {
        buscar('.produto-foto').style.background = mini.dataset.fundo;
        buscarTodos('.miniatura').forEach(function (m) { m.classList.remove('ativa'); });
        mini.classList.add('ativa');
    });
});

// ---------- Disco de vinil da home: gira sozinho, o clique acelera e liga/desliga a música ----------
const disco = buscar('#vinil');
if (disco) {
    const botaoSom = buscar('#vinilSom');
    const VELOCIDADE_NORMAL = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 25; // graus por segundo
    let angulo = 0;
    let velocidade = VELOCIDADE_NORMAL;
    let ultimoTempo = performance.now();

    // a velocidade volta devagar para a normal; o clique dá um empurrão
    function girar(agora) {
        const segundos = (agora - ultimoTempo) / 1000;
        ultimoTempo = agora;
        velocidade = velocidade + (VELOCIDADE_NORMAL - velocidade) * segundos * 0.8;
        angulo = angulo + velocidade * segundos;
        disco.style.transform = 'rotate(' + angulo + 'deg)';
        requestAnimationFrame(girar);
    }
    requestAnimationFrame(girar);

    // música: o navegador só deixa tocar depois do primeiro clique na página
    const musica = new Audio('/audio/musica.mp3');
    musica.loop = true;
    musica.volume = 0.5;
    let comecou = false;
    let horaDoInicio = 0;

    function mostrarEstado() {
        let texto = 'Clique no disco para tocar rock';
        let icone = 'bi-volume-mute-fill';
        if (comecou && !musica.muted) { texto = 'Tocando · clique no disco para silenciar'; icone = 'bi-volume-up-fill'; }
        if (comecou && musica.muted) { texto = 'Mudo · clique no disco para ligar o som'; }
        botaoSom.querySelector('span').textContent = texto;
        botaoSom.querySelector('i').className = 'bi ' + icone;
    }

    document.addEventListener('pointerdown', function () {
        if (comecou) return;
        comecou = true;
        horaDoInicio = performance.now();
        musica.play();
        mostrarEstado();
    }, { once: true });

    function clicouNoDisco(e) {
        if (e.currentTarget === disco) {
            const meio = disco.getBoundingClientRect().left + disco.offsetWidth / 2;
            const lado = e.clientX > meio ? 1 : -1; // clicou na direita ou na esquerda do disco
            velocidade = velocidade + lado * 500;
        }
        // o clique que acabou de ligar a música não deve silenciá-la
        if (performance.now() - horaDoInicio < 600) return;
        if (!comecou) { comecou = true; musica.play(); }
        else { musica.muted = !musica.muted; }
        mostrarEstado();
    }
    disco.addEventListener('click', clicouNoDisco);
    botaoSom.addEventListener('click', clicouNoDisco);

    // pausa a música quando a aba fica escondida
    document.addEventListener('visibilitychange', function () {
        if (!comecou) return;
        if (document.hidden) musica.pause(); else musica.play();
    });
}

// ---------- Checkout (página única): recalcula o resumo ao trocar endereço, entrega, pagamento ou cupom ----------
const formCheckout = buscar('#formCheckout');
if (formCheckout) {
    const subtotal = parseFloat(formCheckout.dataset.subtotal);
    const CUPOM = formCheckout.dataset.cupom;
    const CUPOM_PCT = parseFloat(formCheckout.dataset.cupomPct);
    const PIX_PCT = parseFloat(formCheckout.dataset.pixPct);
    const EXPRESSA = parseFloat(formCheckout.dataset.expressa);
    const PARCELAS_MAX = parseInt(formCheckout.dataset.parcelas);
    const campoCupom = buscar('#campoCupom');
    const msgCupom = buscar('#msgCupom');
    let cupomAplicado = false;

    function moeda(v) { return 'R$ ' + (Math.round(v * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    function fretePadraoEscolhido() {
        const marcado = buscar('input[name=endereco_id]:checked', formCheckout);
        return marcado ? parseFloat(marcado.dataset.frete) || 0 : 0;
    }

    // mostra o painel da forma de pagamento escolhida (Pix, Cartão ou Boleto) e esconde os outros
    function mostrarPainelPagamento() {
        const forma = buscar('input[name=forma]:checked', formCheckout).value;
        buscarTodos('[data-painel]', formCheckout).forEach(function (painel) {
            painel.hidden = painel.dataset.painel !== forma;
        });
        buscarTodos('.aba', formCheckout).forEach(function (aba) {
            aba.classList.toggle('ativa', buscar('input', aba).checked);
        });
    }

    // preenche o seletor de parcelas (1x a 6x, sem juros)
    const selectParcelas = buscar('#parcelas');
    if (selectParcelas) {
        for (let n = 1; n <= PARCELAS_MAX; n++) {
            const opcao = document.createElement('option');
            opcao.value = n;
            opcao.textContent = n + 'x de ' + moeda(subtotal / n) + (n === 1 ? ' à vista' : ' sem juros');
            selectParcelas.appendChild(opcao);
        }
    }

    // monta de novo o Subtotal, Descontos, Frete e Total do resumo
    function recalcular() {
        const entrega = buscar('input[name=entrega]:checked', formCheckout).value;
        const forma = buscar('input[name=forma]:checked', formCheckout).value;
        const frete = entrega === 'expressa' ? EXPRESSA : fretePadraoEscolhido();

        let desconto = cupomAplicado ? subtotal * CUPOM_PCT / 100 : 0;
        if (forma === 'pix') desconto += subtotal * PIX_PCT / 100;

        buscar('#precoPadrao').textContent = fretePadraoEscolhido() === 0 ? 'Grátis' : moeda(fretePadraoEscolhido());
        buscar('#valFrete').textContent = frete === 0 ? 'Grátis' : moeda(frete);
        buscar('#valDescontos').textContent = '- ' + moeda(desconto);
        buscar('#valTotal').textContent = moeda(subtotal - desconto + frete);
        mostrarPainelPagamento();
    }

    formCheckout.addEventListener('change', recalcular);
    recalcular();

    buscar('#aplicarCupom').addEventListener('click', function () {
        if (campoCupom.value.trim().toUpperCase() === CUPOM) {
            cupomAplicado = true;
            msgCupom.textContent = 'Cupom aplicado! ' + CUPOM_PCT + '% de desconto.';
            msgCupom.className = 'cupom-msg ok';
        } else {
            cupomAplicado = false;
            msgCupom.textContent = 'Cupom inválido.';
            msgCupom.className = 'cupom-msg erro';
        }
        recalcular();
    });

    // máscara simples do número e da validade do cartão
    const cartaoNumero = buscar('#cartaoNumero');
    if (cartaoNumero) cartaoNumero.addEventListener('input', function () {
        cartaoNumero.value = cartaoNumero.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    });
    const cartaoValidade = buscar('#cartaoValidade');
    if (cartaoValidade) cartaoValidade.addEventListener('input', function () {
        const n = cartaoValidade.value.replace(/\D/g, '').slice(0, 4);
        cartaoValidade.value = n.length > 2 ? n.slice(0, 2) + '/' + n.slice(2) : n;
    });
}

// ---------- Botão "Copiar código" (Pix e boleto) ----------
buscarTodos('[data-copiar]').forEach(function (botao) {
    botao.addEventListener('click', function () {
        const texto = buscar(botao.dataset.copiar).textContent;
        navigator.clipboard.writeText(texto).then(function () {
            const original = botao.textContent;
            botao.textContent = 'Copiado!';
            setTimeout(function () { botao.textContent = original; }, 1800);
        });
    });
});

// ---------- Página do produto: abas (Descrição / Especificações / Avaliações) ----------
const abasProduto = buscarTodos('.aba-produto');
if (abasProduto.length) {
    abasProduto.forEach(function (aba) {
        aba.addEventListener('click', function () {
            abasProduto.forEach(function (a) { a.classList.remove('ativa'); });
            aba.classList.add('ativa');
            buscarTodos('[data-painel-produto]').forEach(function (painel) {
                painel.hidden = painel.dataset.painelProduto !== aba.dataset.aba;
            });
        });
    });
}

// ---------- Calcular frete e prazo na página do produto ----------
const btnFrete = buscar('#btnCalcularFrete');
if (btnFrete) {
    const campoCep = buscar('#cepFrete');
    const resultado = buscar('#resultadoFrete');
    const produtoId = window.location.pathname.split('/').pop();

    campoCep.addEventListener('input', function () {
        campoCep.value = campoCep.value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
    });

    btnFrete.addEventListener('click', function () {
        resultado.innerHTML = 'Calculando...';
        const dados = new URLSearchParams({ cep: campoCep.value });
        fetch('/produto/' + produtoId + '/frete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: dados })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.erro) { resultado.innerHTML = '<p class="erro">' + d.erro + '</p>'; return; }
                resultado.innerHTML =
                    '<p><span>Padrão (' + d.padrao.prazo + ')</span><strong>' + (d.padrao.gratis ? 'Grátis' : 'R$ ' + d.padrao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })) + '</strong></p>' +
                    '<p><span>Expressa (' + d.expressa.prazo + ')</span><strong>R$ ' + d.expressa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '</strong></p>';
            })
            .catch(function () { resultado.innerHTML = '<p class="erro">Não foi possível calcular agora.</p>'; });
    });
}

// ---------- Quiz "Qual é o seu estilo de rock?" (até 5 perguntas) ----------
const quiz = buscar('#quizRock');
if (quiz) {
    // cada opção tem um "genero" que já existe no banco (campo "genero" dos discos e roupas)
    const PERGUNTAS = [
        { pergunta: 'Qual dessas bandas mais toca no seu fone?', opcoes: [
            { texto: 'Led Zeppelin ou Queen', genero: 'Rock Clássico' },
            { texto: 'Iron Maiden ou Metallica', genero: 'Heavy Metal' },
            { texto: 'Ramones ou Ratos de Porão', genero: 'Punk Rock' },
            { texto: 'Nirvana ou Alice in Chains', genero: 'Grunge' },
            { texto: 'Legião Urbana', genero: 'Rock Nacional' }
        ] },
        { pergunta: 'Como você prefere curtir um show?', opcoes: [
            { texto: 'Sentado, curtindo cada solo', genero: 'Rock Progressivo' },
            { texto: 'No meio do moshpit', genero: 'Heavy Metal' },
            { texto: 'Pulando e gritando o refrão', genero: 'Punk Rock' },
            { texto: 'Guitarra suja e balançando a cabeça', genero: 'Grunge' },
            { texto: 'Cantando em português a plenos pulmões', genero: 'Rock Nacional' }
        ] },
        { pergunta: 'Qual peça combina mais com você?', opcoes: [
            { texto: 'Camiseta clássica de banda', genero: 'Rock Clássico' },
            { texto: 'Jaqueta cheia de patch', genero: 'Heavy Metal' },
            { texto: 'Moletom rasgado', genero: 'Punk Rock' },
            { texto: 'Camiseta oversized e descolorida', genero: 'Grunge' },
            { texto: 'Camiseta de banda nacional', genero: 'Rock Nacional' }
        ] },
        { pergunta: 'Qual instrumento você mais repara numa música?', opcoes: [
            { texto: 'O solo de guitarra', genero: 'Rock Clássico' },
            { texto: 'O peso da bateria dupla', genero: 'Heavy Metal' },
            { texto: 'O ritmo acelerado', genero: 'Punk Rock' },
            { texto: 'O baixo distorcido', genero: 'Grunge' },
            { texto: 'A letra em português', genero: 'Rock Nacional' }
        ] },
        { pergunta: 'Se fosse montar uma coleção de discos, começaria por...', opcoes: [
            { texto: 'Um vinil clássico dos anos 70', genero: 'Rock Clássico' },
            { texto: 'Um álbum de heavy metal', genero: 'Heavy Metal' },
            { texto: 'Um disco de punk underground', genero: 'Punk Rock' },
            { texto: 'Um CD de grunge dos anos 90', genero: 'Grunge' },
            { texto: 'Um clássico do rock brasileiro', genero: 'Rock Nacional' }
        ] }
    ];

    let indice = 0;
    const pontos = {};

    function mostrarPergunta() {
        const p = PERGUNTAS[indice];
        buscar('.quiz-progresso span', quiz).style.width = (indice / PERGUNTAS.length * 100) + '%';
        buscar('.quiz-pergunta h3', quiz).textContent = p.pergunta;
        const lista = buscar('.quiz-opcoes', quiz);
        lista.innerHTML = '';
        p.opcoes.forEach(function (opcao) {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.textContent = opcao.texto;
            botao.addEventListener('click', function () { escolher(opcao.genero); });
            lista.appendChild(botao);
        });
    }

    function escolher(genero) {
        pontos[genero] = (pontos[genero] || 0) + 1;
        indice++;
        if (indice < PERGUNTAS.length) return mostrarPergunta();

        // descobre o gênero com mais pontos e guarda a escolha para a próxima visita
        const vencedor = Object.keys(pontos).sort(function (a, b) { return pontos[b] - pontos[a]; })[0];
        try { localStorage.setItem('sp_estilo', vencedor); } catch (e) {}

        buscar('.quiz-progresso span', quiz).style.width = '100%';
        buscar('.quiz-pergunta', quiz).hidden = true;
        const resultado = buscar('.quiz-resultado', quiz);
        resultado.hidden = false;
        buscar('.quiz-resultado h3', quiz).textContent = 'Seu estilo é ' + vencedor + '!';
        destacarRecomendados(vencedor);
    }

    buscar('#quizComecar').addEventListener('click', function () {
        buscar('.quiz-intro', quiz).hidden = true;
        buscar('.quiz-caixa', quiz).hidden = false;
        mostrarPergunta();
    });
}

// Coloca os produtos do gênero preferido na frente de cada vitrine e marca com um selo "Combina com seu estilo"
function destacarRecomendados(genero) {
    buscarTodos('.carousel-track').forEach(function (trilho) {
        const cards = buscarTodos('.product-card', trilho);
        let encontrou = false;
        cards.forEach(function (card) {
            if (card.dataset.genero === genero) {
                encontrou = true;
                if (!buscar('.combina-tag', card)) {
                    const selo = document.createElement('em');
                    selo.className = 'combina-tag';
                    selo.textContent = 'Combina com seu estilo';
                    buscar('.product-photo', card).appendChild(selo);
                }
                trilho.insertBefore(card, trilho.firstChild);
            }
        });
        if (encontrou) trilho.closest('.carousel-wrap').querySelectorAll('.seta').forEach(function (s) {});
    });
}

// se a pessoa já fez o quiz numa visita anterior, já destaca ao carregar a página
try {
    const estiloSalvo = localStorage.getItem('sp_estilo');
    if (estiloSalvo) destacarRecomendados(estiloSalvo);
} catch (e) {}


// ---------- Cartazes do topo: trocam sozinhos a cada 6 segundos (e pelas bolinhas) ----------
const cartazes = buscar('#cartazCarrossel');
if (cartazes) {
    const trilhoCartaz = buscar('.cartaz-trilho', cartazes);
    const bolinhasCartaz = buscarTodos('.cartaz-bolinhas button', cartazes);
    const totalCartazes = bolinhasCartaz.length;
    let posicaoCartaz = 0;

    function irParaCartaz(n) {
        posicaoCartaz = (n + totalCartazes) % totalCartazes;
        trilhoCartaz.style.transform = 'translateX(' + (-posicaoCartaz * 100) + '%)';
        bolinhasCartaz.forEach(function (b, i) { b.classList.toggle('ativa', i === posicaoCartaz); });
    }
    bolinhasCartaz.forEach(function (b, i) { b.addEventListener('click', function () { irParaCartaz(i); }); });

    let pausado = false;
    cartazes.addEventListener('mouseenter', function () { pausado = true; });
    cartazes.addEventListener('mouseleave', function () { pausado = false; });
    setInterval(function () { if (!pausado) irParaCartaz(posicaoCartaz + 1); }, 6000);
}
