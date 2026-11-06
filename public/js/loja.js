// JavaScript da LOJA (carregado em todas as páginas; cada bloco só age se encontrar seus elementos).
(function () {
    'use strict';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var brl = function (v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

    // ---------- AVISO RÁPIDO (toast) ----------
    function toast(texto) {
        var t = document.createElement('div');
        t.className = 'toast-loja'; t.setAttribute('role', 'status'); t.textContent = texto;
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('sai'); setTimeout(function () { t.remove(); }, 400); }, 2600);
    }

    // ---------- CABEÇALHO: sombra ao rolar, menu mobile e menus suspensos ----------
    var header = $('#lojaHeader');
    if (header) {
        var rolou = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
        window.addEventListener('scroll', rolou, { passive: true }); rolou();

        var toggle = $('#navToggle'), links = $('#navLinks');
        if (toggle) toggle.addEventListener('click', function () {
            var aberto = header.classList.toggle('menu-aberto');
            toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        });
        $$('#navLinks a').forEach(function (a) { a.addEventListener('click', function () { header.classList.remove('menu-aberto'); }); });

        // "Categorias" e "Conta": abrem ao clicar (e no hover, via CSS no desktop)
        [['.nav-dd', '.nav-dd-btn'], ['.user-dd', '.user-dd-btn']].forEach(function (par) {
            var cx = $(par[0]); if (!cx) return;
            var btn = $(par[1], cx);
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var abrir = !cx.classList.contains('aberto');
                $$('.nav-dd, .user-dd').forEach(function (o) { o.classList.remove('aberto'); var b = o.querySelector('button'); if (b) b.setAttribute('aria-expanded', 'false'); });
                cx.classList.toggle('aberto', abrir); btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
            });
        });
        document.addEventListener('click', function () { $$('.nav-dd, .user-dd').forEach(function (o) { o.classList.remove('aberto'); }); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { $$('.nav-dd, .user-dd').forEach(function (o) { o.classList.remove('aberto'); }); fecharSugestoes(); } });
    }

    // ---------- BUSCA: sugestões enquanto digita ----------
    var campo = $('#campoBusca'), caixa = $('#buscaSugestoes'), formBusca = $('#formBusca');
    var temporizador, ultima = '', itemAtivo = -1;
    function fecharSugestoes() { if (caixa) { caixa.hidden = true; caixa.innerHTML = ''; itemAtivo = -1; } }
    if (campo && caixa) {
        campo.addEventListener('input', function () {
            clearTimeout(temporizador);
            var q = campo.value.trim();
            if (q.length < 2) return fecharSugestoes();
            temporizador = setTimeout(function () {
                ultima = q;
                fetch('/busca/sugestoes?q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (lista) {
                    if (q !== ultima) return;
                    var html = lista.map(function (p) {
                        return '<a href="/produto/' + p.id + '" role="option" class="sug-item">' +
                            (p.imagem ? '<img src="/uploads/' + esc(p.imagem) + '" alt="">' : '<span class="sug-sem"></span>') +
                            '<span class="sug-txt"><strong>' + esc(p.nome) + '</strong><small>' + esc(p.categoria) + '</small></span><b>' + brl(p.preco) + '</b></a>';
                    }).join('');
                    html += lista.length
                        ? '<a href="/busca?q=' + encodeURIComponent(q) + '" class="sug-todos">Ver todos os resultados para “' + esc(q) + '” <i class="bi bi-arrow-right"></i></a>'
                        : '<div class="sug-vazio">Nada encontrado para “' + esc(q) + '”.</div>';
                    caixa.innerHTML = html; caixa.hidden = false; itemAtivo = -1;
                }).catch(fecharSugestoes);
            }, 180);
        });
        campo.addEventListener('keydown', function (e) {
            var itens = $$('a', caixa);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (!itens.length) return; e.preventDefault();
                itemAtivo = (itemAtivo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
                itens.forEach(function (a, i) { a.classList.toggle('ativo', i === itemAtivo); });
            } else if (e.key === 'Enter' && itemAtivo >= 0 && itens[itemAtivo]) { e.preventDefault(); window.location = itens[itemAtivo].href; }
        });
        document.addEventListener('click', function (e) { if (!formBusca.contains(e.target)) fecharSugestoes(); });
        formBusca.addEventListener('submit', function (e) { if (!campo.value.trim()) e.preventDefault(); });
    }

    // ---------- CARROSSEL INFINITO (Mais vendidos, Promoções, Novidades) ----------
    // Cada carrossel tem: uma trilha com os cards e duas setas redondas nas laterais.
    $$('.carousel-wrap').forEach(function (caixa) {
        var viewport = $('.carousel-viewport', caixa), trilho = $('.carousel-track', caixa);
        var esq = $('.seta-esq', caixa), dir = $('.seta-dir', caixa);
        if (!viewport || !trilho || !esq || !dir) return;
        var ocupado = false, DURACAO = 650, SUAVE = 'cubic-bezier(.22,.8,.24,1)';
        function passo() { var gap = parseFloat(getComputedStyle(trilho).columnGap) || 0; return trilho.children[0].getBoundingClientRect().width + gap; }
        function visiveis() { return Math.round(viewport.getBoundingClientRect().width / passo()); }
        function ajustar() { esq.hidden = dir.hidden = trilho.children.length <= visiveis(); }
        function proximo() {   // anda um card para a esquerda e manda o primeiro para o fim da fila
            if (ocupado) return; ocupado = true;
            trilho.style.transition = 'transform ' + DURACAO + 'ms ' + SUAVE; trilho.style.transform = 'translateX(' + (-passo()) + 'px)';
            setTimeout(function () { trilho.style.transition = 'none'; trilho.appendChild(trilho.firstElementChild); trilho.style.transform = 'translateX(0)'; ocupado = false; }, DURACAO);
        }
        function anterior() {  // traz o último card para o começo e anda para a direita
            if (ocupado) return; ocupado = true;
            trilho.style.transition = 'none'; trilho.insertBefore(trilho.lastElementChild, trilho.firstElementChild);
            trilho.style.transform = 'translateX(' + (-passo()) + 'px)'; void trilho.offsetWidth;
            trilho.style.transition = 'transform ' + DURACAO + 'ms ' + SUAVE; trilho.style.transform = 'translateX(0)';
            setTimeout(function () { ocupado = false; }, DURACAO);
        }
        dir.addEventListener('click', proximo); esq.addEventListener('click', anterior);
        window.addEventListener('resize', ajustar); ajustar();
    });

    // ---------- ANIMAÇÃO DE ENTRADA: os blocos com a classe "reveal" aparecem suavemente ao rolar ----------
    var revelar = $$('.reveal');
    if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (lista) {
            lista.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visivel'); obs.unobserve(e.target); } });
        }, { threshold: 0.12 });
        revelar.forEach(function (el) { obs.observe(el); });
    } else { revelar.forEach(function (el) { el.classList.add('visivel'); }); }

    // ---------- NEWSLETTER ----------
    var news = $('#newsletterForm');
    if (news) news.addEventListener('submit', function (e) { e.preventDefault(); news.reset(); toast('Inscrito! Valeu por entrar no som alto.'); });

    // ---------- QUANTIDADE COM − E + (produto e carrinho) ----------
    $$('[data-qtd]').forEach(function (cx) {
        var input = $('input[type=number]', cx), auto = cx.hasAttribute('data-auto');
        function mudar(delta) {
            var max = parseInt(input.max, 10) || 99, v = (parseInt(input.value, 10) || 1) + delta;
            v = Math.max(1, Math.min(max, v));
            if (v === parseInt(input.value, 10)) return;
            input.value = v; if (auto) cx.submit();
        }
        $('[data-menos]', cx).addEventListener('click', function () { mudar(-1); });
        $('[data-mais]', cx).addEventListener('click', function () { mudar(1); });
        if (auto) input.addEventListener('change', function () { cx.submit(); });
    });

    // ---------- ORDENAR E FILTROS (categorias e busca): atualiza a lista sem recarregar a página ----------
    var form = $('#formFiltros[data-lista]');
    if (form) {
        var painel = $('#painelFiltros'), btnF = $('#alternarFiltros'), btnO = $('#btnOrdenar'), menuO = $('#menuOrdenar');
        var chips = $('#chipsAtivos'), contador = $('#contadorFiltros'), pendente = 0;

        function abrirFiltros(abrir) {
            painel.hidden = !abrir;
            btnF.setAttribute('aria-expanded', abrir ? 'true' : 'false'); btnF.classList.toggle('is-active', abrir);
            document.body.classList.toggle('filtros-aberto', abrir && window.innerWidth <= 900);
        }
        function marcados() { return $$('.filtros-lateral input[type=checkbox]:checked', form); }
        function mostrarChips() {
            var ms = marcados();
            chips.innerHTML = ms.map(function (c, i) { return '<button type="button" class="chip" data-i="' + i + '">' + esc(c.getAttribute('data-rotulo') || c.value) + ' <i class="bi bi-x"></i></button>'; }).join('') +
                (ms.length > 1 ? '<button type="button" class="chip chip-limpar" data-limpar>Limpar tudo</button>' : '');
            contador.textContent = ms.length ? ' (' + ms.length + ')' : '';
            $$('.chip[data-i]', chips).forEach(function (b) { b.addEventListener('click', function () { ms[b.getAttribute('data-i')].checked = false; atualizar(); }); });
            var l = $('[data-limpar]', chips); if (l) l.addEventListener('click', limpar);
        }
        function url() {
            var dados = new URLSearchParams(new FormData(form)); var qs = dados.toString();
            return form.getAttribute('action') + (qs ? '?' + qs : '');
        }
        function atualizar() {
            var alvo = url(), id = ++pendente;
            mostrarChips(); history.replaceState(null, '', alvo);
            var res = $('#resultados'); res.classList.add('carregando');
            fetch(alvo).then(function (r) { return r.text(); }).then(function (html) {
                if (id !== pendente) return;
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var novo = $('#resultados', doc), info = $('#resultadoInfo', doc);
                if (novo) res.innerHTML = novo.innerHTML;
                if (info) $('#resultadoInfo').textContent = info.textContent;
                res.classList.remove('carregando');
            }).catch(function () { window.location = alvo; });
        }
        function limpar() { marcados().forEach(function (c) { c.checked = false; }); atualizar(); }

        btnF.addEventListener('click', function () { abrirFiltros(painel.hidden); });
        $('#fecharFiltros').addEventListener('click', function () { abrirFiltros(false); });
        $('#limparFiltros').addEventListener('click', limpar);
        form.addEventListener('change', function (e) { if (e.target.name === 'ordem') { $$('.dd-opcao', menuO).forEach(function (o) { o.classList.toggle('is-active', o.contains(e.target)); }); menuO.hidden = true; btnO.setAttribute('aria-expanded', 'false'); } atualizar(); });
        form.addEventListener('submit', function (e) { e.preventDefault(); atualizar(); });
        btnO.addEventListener('click', function (e) { e.stopPropagation(); menuO.hidden = !menuO.hidden; btnO.setAttribute('aria-expanded', menuO.hidden ? 'true' : 'false'); });
        document.addEventListener('click', function (e) { if (!menuO.hidden && !menuO.contains(e.target)) { menuO.hidden = true; btnO.setAttribute('aria-expanded', 'false'); } });

        // o painel é um menu que abre embaixo do botão "Filtros": fecha ao clicar fora ou apertar Esc
        document.addEventListener('click', function (e) { if (!painel.hidden && !e.target.closest('.dd-filtros') && !e.target.closest('.chips-ativos')) abrirFiltros(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !painel.hidden) abrirFiltros(false); });
        mostrarChips();
    }

    // ---------- MÚSICA: toca o arquivo public/audio/musica.mp3 em repetição ----------
    // Para trocar a música, basta substituir esse arquivo (mantendo o nome musica.mp3).
    function criarMusica() {
        var audio = new Audio('/audio/musica.mp3');
        audio.loop = true; audio.volume = 0.5;
        var tocando = false;
        // ao trocar de aba, pausa; ao voltar, continua (se não estiver mutada)
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) audio.pause(); else if (tocando) audio.play().catch(function () {});
        });
        return {
            iniciar: function () { tocando = true; audio.play().catch(function () {}); },
            mudo: function (m) { audio.muted = m; }
        };
    }

    // ---------- DISCO DE VINIL (hero): gira sozinho; cliques e arrastos mudam a velocidade e o sentido ----------
    var vinil = $('#vinil'), zona = $('#vinilZona'), tilt = $('#vinilTilt');
    if (vinil && zona) {
        // som: 'parado' (ainda não começou), 'tocando' ou 'mudo'. O navegador só libera áudio depois do primeiro toque na página.
        var somBtn = $('#vinilSom'), musica = null, estado = 'parado', inicioSom = 0, mudoSalvo = false;
        try { mudoSalvo = localStorage.getItem('sp_mudo') === '1'; } catch (e) {}
        function mostrarSom() {
            if (!somBtn) return;
            var textos = { parado: 'Clique no disco para tocar rock', tocando: 'Tocando · clique no disco para silenciar', mudo: 'Mudo · clique no disco para ligar o som' };
            somBtn.querySelector('i').className = 'bi ' + (estado === 'tocando' ? 'bi-volume-up-fill' : 'bi-volume-mute-fill');
            somBtn.querySelector('span').textContent = textos[estado]; zona.classList.toggle('com-som', estado === 'tocando');
        }
        function alternarSom(automatico) {
            if (!automatico && performance.now() - inicioSom < 600) return;   // o toque que acabou de ligar a música não deve silenciá-la
            if (!musica) { musica = criarMusica(); if (!musica) return; }
            if (estado === 'parado') { musica.iniciar(); inicioSom = performance.now(); estado = 'tocando'; if (mudoSalvo) { musica.mudo(true); estado = 'mudo'; } }
            else if (estado === 'tocando') { musica.mudo(true); estado = 'mudo'; }
            else { musica.mudo(false); estado = 'tocando'; }
            try { localStorage.setItem('sp_mudo', estado === 'mudo' ? '1' : '0'); } catch (e) {}
            mostrarSom();
        }
        ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { if (estado === 'parado') alternarSom(true); }, { once: true }); });
        if (somBtn) somBtn.addEventListener('click', function () { alternarSom(false); });
        mostrarSom();

        var BASE = reduzir ? 0 : 360 / 14;           // graus por segundo (uma volta a cada 14 s)
        var ang = 0, vel = BASE, arrastando = false, ultimoAng = 0, ultimoT = 0, moveu = 0, inicioT = 0, visivel = true, anterior = performance.now();

        function centro() { var r = vinil.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; }
        function anguloDoPonteiro(e) { var c = centro(); return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; }
        function impulso(direcao, forca) {
            var alvo = vel + direcao * forca;
            vel = Math.max(-2600, Math.min(2600, alvo));
            zona.classList.add('acelerado'); clearTimeout(impulso.t); impulso.t = setTimeout(function () { zona.classList.remove('acelerado'); }, 900);
        }
        function onda(e) {   // anel que se abre onde clicou
            var r = vinil.getBoundingClientRect(), o = document.createElement('span');
            o.className = 'vinyl-onda'; o.style.left = (e.clientX - r.left) + 'px'; o.style.top = (e.clientY - r.top) + 'px';
            vinil.parentNode.appendChild(o); setTimeout(function () { o.remove(); }, 700);
        }

        function loop(agora) {
            var dt = Math.min(0.05, (agora - anterior) / 1000); anterior = agora;
            if (!arrastando) {
                vel += (BASE - vel) * (1 - Math.exp(-dt * 0.8));   // volta devagar para a velocidade normal
                ang += vel * dt;
            }
            vinil.style.transform = 'rotate(' + ang + 'deg)';
            if (visivel && !document.hidden) requestAnimationFrame(loop);
        }
        function iniciarLoop() { anterior = performance.now(); requestAnimationFrame(loop); }
        if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !visivel) { visivel = true; iniciarLoop(); } visivel = v; }).observe(zona);
        document.addEventListener('visibilitychange', function () { if (!document.hidden && visivel) iniciarLoop(); });
        iniciarLoop();

        vinil.addEventListener('pointerdown', function (e) {
            arrastando = true; moveu = 0; inicioT = performance.now(); ultimoAng = anguloDoPonteiro(e); ultimoT = inicioT;
            vinil.setPointerCapture(e.pointerId); zona.classList.add('segurando');
        });
        vinil.addEventListener('pointermove', function (e) {
            if (!arrastando) return;
            var a = anguloDoPonteiro(e), d = a - ultimoAng, t = performance.now();
            if (d > 180) d -= 360; if (d < -180) d += 360;
            ang += d; moveu += Math.abs(d);
            var dtm = Math.max(1, t - ultimoT) / 1000; vel = Math.max(-2600, Math.min(2600, 0.6 * vel + 0.4 * (d / dtm)));
            ultimoAng = a; ultimoT = t;
        });
        function soltar(e) {
            if (!arrastando) return; arrastando = false; zona.classList.remove('segurando');
            if (moveu < 6 && performance.now() - inicioT < 350) {     // foi um clique: dá um empurrão no lado clicado
                var c = centro(), lado = e.clientX >= c.x ? 1 : -1;
                impulso(lado, 520); onda(e); alternarSom(false);
            }
        }
        vinil.addEventListener('pointerup', soltar); vinil.addEventListener('pointercancel', soltar);
        vinil.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); impulso(e.shiftKey ? -1 : 1, 520); alternarSom(false); } });

        // o mouse perto do disco inclina o conjunto, como se ele flutuasse
        if (!reduzir && tilt) {
            zona.addEventListener('pointermove', function (e) {
                if (e.pointerType === 'touch') return;
                var r = zona.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
                tilt.style.transform = 'perspective(900px) rotateY(' + (x * 14) + 'deg) rotateX(' + (-y * 14) + 'deg)';
            });
            zona.addEventListener('pointerleave', function () { tilt.style.transform = ''; });
        }
    }
})();
