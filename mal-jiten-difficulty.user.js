// ==UserScript==
// @name         MAL Jiten Difficulty Percent
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds dynamically-sized, color-coded Jiten percentage stats to MyAnimeList anime covers (detail pages, lists, top, seasonal, search, etc.)
// @author       You
// @match        https://myanimelist.net/*
// @connect      api.jiten.moe
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    const CHAR_PER_HOUR = 10000;
    const CACHE_KEY = 'jiten_cache_v15';
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
    const JITEN_LINK_TYPE_MAL = 5; // 5 = MyAnimeList

    // ─── Offset Configuration ────────────────────────────────────────────────
    const LARGE_DEFAULT_TOP_OFFSET = '0px';

    let isProcessingLinks = false;

    // Cache
    function getCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
    }

    function saveToCache(id, data) {
        if (!data) return;
        const cache = getCache();
        cache[id] = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }

    function getFromCache(id) {
        const entry = getCache()[id];
        return (entry && (Date.now() - entry.timestamp < CACHE_EXPIRY)) ? entry.data : null;
    }

    function formatMsToTime(ms) {
        if (!ms || ms <= 0) return 'N/A';
        const totalMinutes = Math.floor(ms / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    function getDiffColor(pct) {
        const val = parseFloat(pct);
        if (isNaN(val)) return 'rgba(18, 22, 28, 0.9)';
        if (val < 40)   return 'rgba(33, 150, 243, 0.92)';  // Blue
        if (val < 60)   return 'rgba(76, 175, 80, 0.92)';   // Green
        if (val < 75)   return 'rgba(175, 180, 43, 0.92)';  // Lime/Yellow
        if (val < 85)   return 'rgba(255, 152, 0, 0.92)';   // Orange
        if (val < 95)   return 'rgba(244, 67, 54, 0.92)';   // Red
        return          'rgba(156, 39, 176, 0.92)';         // Purple
    }

    function getBadgeSizeFromElement(element) {
        if (!element) return 'medium';
        const rect = element.getBoundingClientRect();
        const width = rect.width || element.offsetWidth || 0;

        if (width > 180) return 'xlarge';
        if (width > 100) return 'large';
        if (width > 0 && width < 70) return 'tiny';
        return 'medium';
    }

    function extractMalId(href) {
        if (!href) return null;
        const match = href.match(/\/anime\/(\d+)/);
        return match ? match[1] : null;
    }

    // API
    async function fetchJitenData(malId) {
        const cached = getFromCache(malId);
        if (cached) return cached;

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.jiten.moe/api/media-deck/by-link-id/${JITEN_LINK_TYPE_MAL}/${malId}`,
                onload: (res) => {
                    try {
                        const deckIds = JSON.parse(res.responseText);
                        if (!Array.isArray(deckIds) || !deckIds.length) return resolve(null);

                        const deckId = deckIds[0];
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://api.jiten.moe/api/media-deck/${deckId}/detail`,
                            onload: (detailRes) => {
                                try {
                                    const main = JSON.parse(detailRes.responseText)?.data?.mainDeck;
                                    if (!main) return resolve(null);

                                    const rawVal = typeof main.difficultyRaw === 'number'
                                        ? main.difficultyRaw
                                        : (typeof main.difficulty === 'number' ? main.difficulty : null);

                                    let percentage = null;
                                    if (rawVal !== null) {
                                        percentage = Math.round((rawVal / 5.0) * 100);
                                        percentage = Math.max(0, Math.min(100, percentage));
                                    }

                                    const result = {
                                        deckId: deckId,
                                        diff: main.difficulty,
                                        raw: main.difficultyRaw,
                                        percent: percentage,
                                        time: formatMsToTime(main.speechDuration),
                                        count: (main.wordCount || 0).toLocaleString(),
                                        speed: main.speechSpeed ? Math.round(main.speechSpeed) : null,
                                        isAnime: true
                                    };

                                    saveToCache(malId, result);
                                    resolve(result);
                                } catch (err) {
                                    resolve(null);
                                }
                            },
                            onerror: () => resolve(null)
                        });
                    } catch (e) {
                        resolve(null);
                    }
                },
                onerror: () => resolve(null)
            });
        });
    }

    function createBadge(data, size = 'medium') {
        const bgColor = getDiffColor(data.percent);
        const percentText = (data.percent !== null && data.percent !== undefined) ? `${data.percent}%` : 'N/A';

        const badge = document.createElement('a');
        badge.href      = `https://jiten.moe/decks/media/${data.deckId}/detail`;
        badge.target    = '_blank';
        badge.className = `jiten-badge-item jiten-${size}`;
        badge.title     = `Jiten difficulty: ${percentText}` +
                          (data.time && data.time !== 'N/A' ? ` • ${data.time}` : '') +
                          (data.count ? ` • ${data.count} words` : '');

        let padding, fontSize, borderRadius, topOffset;

        if (size === 'xlarge') {
            padding = '5px 7px';
            fontSize = '1.6rem';
            borderRadius = '6px';
            topOffset = LARGE_DEFAULT_TOP_OFFSET;
        } else if (size === 'large') {
            padding = '3px 5px';
            fontSize = '1.35rem';
            borderRadius = '4px';
            topOffset = '0px';
        } else if (size === 'medium') {
            padding = '2px 4px';
            fontSize = '1.15rem';
            borderRadius = '4px';
            topOffset = '0px';
        } else { // tiny
            padding = '1px 3px';
            fontSize = '0.95rem';
            borderRadius = '3px';
            topOffset = '0px';
        }

        badge.style.cssText = `
            position: absolute; top: ${topOffset}; left: 0;
            background: ${bgColor};
            color: #ffffff; padding: ${padding};
            border-bottom-right-radius: ${borderRadius};
            z-index: 10;
            text-decoration: none; display: flex; flex-direction: column; gap: 1px;
            box-shadow: 1px 1px 4px rgba(0,0,0,0.5); font-weight: 800; line-height: 1.1;
            text-shadow: 0 1px 1px rgba(0,0,0,0.5); white-space: nowrap;
            opacity: 0; transition: opacity 0.25s;
            pointer-events: auto;
        `;

        badge.innerHTML = `<div style="font-size: ${fontSize};"><b>${percentText}</b></div>`;

        return badge;
    }

    function attachBadge(container, malId, preferredSize) {
        if (!container || container.querySelector('.jiten-badge-item')) return;
        if (container.dataset.jitenPending) return;
        container.dataset.jitenPending = '1';

        fetchJitenData(malId).then(data => {
            delete container.dataset.jitenPending;
            if (!data || container.querySelector('.jiten-badge-item')) return;

            const style = window.getComputedStyle(container);
            if (style.position === 'static') {
                container.style.position = 'relative';
            }

            const size = preferredSize || getBadgeSizeFromElement(container);
            const badge = createBadge(data, size);
            container.appendChild(badge);
            setTimeout(() => { badge.style.opacity = '1'; }, 40);
        });
    }

    // ─── Handlers

    function handleAnimeDetailPage() {
        const match = window.location.pathname.match(/^\/anime\/(\d+)/);
        if (!match) return;
        const malId = match[1];

        const coverImg = document.querySelector('.leftside img[itemprop="image"], .leftside img.ac');
        if (!coverImg) return;

        let container = coverImg.closest('a') || coverImg.parentElement;
        if (!container) return;

        if (window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
            container.style.display = 'inline-block'; // image
        }

        attachBadge(container, malId, 'xlarge');
    }

    function processLinks() {
        if (isProcessingLinks) return;
        isProcessingLinks = true;

        try {
            const anchors = document.querySelectorAll(
                'a[href*="/anime/"]:not(.jiten-done)'
            );

            for (const a of anchors) {
                const malId = extractMalId(a.getAttribute('href'));
                if (!malId) continue;

                a.classList.add('jiten-done');

                // Skip pure text title links that have no nearby image
                const img = a.querySelector('img') ||
                            (a.previousElementSibling && a.previousElementSibling.querySelector?.('img')) ||
                            a.closest('td, .seasonal-anime, .anime-card, .list-table, .ranking-list, .picSurround')?.querySelector('img');

                if (!img) continue;

                // Choose a good container for the badge
                let container = a.querySelector('img') ? a : img.parentElement;
                if (!container) continue;

                if (container.closest('.leftside') && window.location.pathname.match(/^\/anime\/\d+/)) {
                    continue;
                }

                attachBadge(container, malId);
            }

            const coverImgs = document.querySelectorAll(
                'img[data-src*="/images/anime/"], img[src*="/images/anime/"], img.lazyload[data-src*="anime"]'
            );

            for (const img of coverImgs) {
                if (img.closest('.jiten-done') || img.dataset.jitenDone) continue;

                let link = img.closest('a[href*="/anime/"]') ||
                           img.parentElement?.closest('a[href*="/anime/"]') ||
                           img.closest('td, .seasonal-anime, .anime-card, li')?.querySelector('a[href*="/anime/"]');

                if (!link) continue;
                const malId = extractMalId(link.getAttribute('href'));
                if (!malId) continue;

                img.dataset.jitenDone = '1';
                const container = img.closest('a') || img.parentElement;
                if (!container || container.querySelector('.jiten-badge-item')) continue;

                if (container.closest('.leftside') && window.location.pathname.match(/^\/anime\/\d+/)) {
                    continue;
                }

                attachBadge(container, malId);
            }
        } finally {
            isProcessingLinks = false;
        }
    }

    function run() {
        handleAnimeDetailPage();
        processLinks();
    }

    function onRouteNavigate() {
        document.querySelectorAll('.jiten-badge-item').forEach(el => el.remove());
        document.querySelectorAll('.jiten-done').forEach(el => el.classList.remove('jiten-done'));
        document.querySelectorAll('[data-jiten-done]').forEach(el => delete el.dataset.jitenDone);
        document.querySelectorAll('[data-jiten-pending]').forEach(el => delete el.dataset.jitenPending);
        setTimeout(run, 300);
    }

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        window.dispatchEvent(new Event('jitenStateChange'));
        return result;
    };

    history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        window.dispatchEvent(new Event('jitenStateChange'));
        return result;
    };

    window.addEventListener('jitenStateChange', onRouteNavigate);
    window.addEventListener('popstate', onRouteNavigate);

    const observer = new MutationObserver(() => {
        if (window.__jitenMalTimer) clearTimeout(window.__jitenMalTimer);
        window.__jitenMalTimer = setTimeout(run, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();