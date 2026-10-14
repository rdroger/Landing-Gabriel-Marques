/* ==========================================================================
   Gabriel Marques — Princípios da Adoração
   Script principal: navegação entre views (Home / Curso), menu mobile,
   rolagem suave e ano dinâmico no rodapé.
   ========================================================================== */

function showView(viewId, event) {
    // Esconder todas as views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Mostrar a view selecionada
    document.getElementById('view-' + viewId).classList.add('active');

    // Atualizar estado do body para navegação dinâmica
    if (viewId === 'course') {
        document.body.classList.add('is-course');
        document.getElementById('nav-title').innerText = 'Curso Presencial';
    } else {
        document.body.classList.remove('is-course');
        document.getElementById('nav-title').innerText = 'Gabriel Marques';
    }

    // Fechar o menu mobile, se estiver aberto
    closeMobileMenu();

    // Scroll para o topo (garante que a nova página comece de cima)
    window.scrollTo(0, 0);

    // Prevenir comportamento padrão se for disparado por link
    if (event) event.preventDefault();
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('open');
}

function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
    // Suporte para âncoras internas suaves na Home
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
            closeMobileMenu();
        });
    });

    // Ano dinâmico no rodapé
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    loadLatestPodcastEpisode();
    initYouTubeFacades();
    initScrollReveal();
});

/**
 * Observa elementos com a classe .reveal e adiciona .is-visible quando eles
 * entram na viewport, disparando a animação definida em css/style.css.
 * Cada elemento para de ser observado assim que aparece uma vez (a
 * animação não repete ao rolar para cima e para baixo).
 */
function initScrollReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach(el => observer.observe(el));
}

/**
 * Lazy-load com facade (lite embed) para vídeos do YouTube: carrega só a
 * thumbnail + botão de play em CSS, e só injeta o iframe do player quando
 * o usuário clica — evita baixar o player inteiro do YouTube (vários MB de
 * JS) em quem nunca chega a assistir ao vídeo.
 */
function initYouTubeFacades() {
    document.querySelectorAll('.yt-facade').forEach(btn => {
        btn.addEventListener('click', () => {
            const videoId = btn.dataset.ytId;
            if (!videoId) return;

            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
            iframe.title = btn.getAttribute('aria-label') || 'Vídeo do YouTube';
            iframe.className = 'absolute inset-0 w-full h-full';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('allowfullscreen', '');

            btn.replaceWith(iframe);
        }, { once: true });
    });
}

/**
 * Busca o feed RSS do ARCO Podcast (Anchor/Spotify for Podcasters) e
 * atualiza o player na seção #podcast com o episódio mais recente.
 * O feed da Anchor expõe "Access-Control-Allow-Origin: *", então o fetch
 * funciona direto do navegador quando o site está em http(s) — não funciona
 * testando o arquivo localmente via file://. Em caso de falha, o HTML já
 * traz o último episódio conhecido como conteúdo padrão (fallback).
 */
async function loadLatestPodcastEpisode() {
    const RSS_URL = 'https://anchor.fm/s/10bae737c/podcast/rss';
    const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';

    try {
        const response = await fetch(RSS_URL);
        if (!response.ok) throw new Error('Falha ao buscar o feed: ' + response.status);

        const xmlText = await response.text();
        const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
        if (xml.querySelector('parsererror')) throw new Error('Falha ao interpretar o feed RSS');

        const item = xml.querySelector('item');
        if (!item) return;

        const title = item.querySelector('title')?.textContent?.trim();
        const episodeLink = item.querySelector('link')?.textContent?.trim();
        const audioUrl = item.querySelector('enclosure')?.getAttribute('url');
        const coverUrl = item.getElementsByTagNameNS(ITUNES_NS, 'image')[0]?.getAttribute('href');

        const titleEl = document.getElementById('podcast-title');
        const audioEl = document.getElementById('podcast-audio');
        const sourceEl = document.getElementById('podcast-audio-source');
        const linkEl = document.getElementById('podcast-spotify-link');
        const coverEl = document.getElementById('podcast-cover');

        if (title && titleEl) titleEl.textContent = title;
        if (episodeLink && linkEl) linkEl.setAttribute('href', episodeLink);
        if (coverUrl && coverEl) coverEl.setAttribute('src', coverUrl);
        if (audioUrl && sourceEl && audioEl) {
            sourceEl.setAttribute('src', audioUrl);
            audioEl.load();
        }
    } catch (err) {
        // Mantém o episódio padrão já presente no HTML.
        console.warn('Não foi possível atualizar o episódio mais recente do podcast automaticamente:', err);
    }
}
