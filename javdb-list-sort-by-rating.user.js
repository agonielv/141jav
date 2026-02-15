// ==UserScript==
// @name         JavDB 清单按评分排序
// @namespace    https://github.com/
// @version      1.0.0
// @description  在 JavDB 清单详情页（/users/list_detail?id=...）中，按评分对番号卡片排序。
// @author       141jav
// @match        https://javdb.com/users/list_detail*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID = 'javdb-sort-rating-button';
  const SORTED_ATTR = 'data-rating-sorted';

  function getCards() {
    const candidates = Array.from(document.querySelectorAll('a[href^="/v/"]'));
    const cards = candidates
      .map((a) => a.closest('.item, .movie-item, .grid-item, article, .card') || a.parentElement)
      .filter(Boolean);

    // 去重，避免一个卡片里存在多个 /v/ 链接导致重复。
    return Array.from(new Set(cards));
  }

  function getCardContainer(cards) {
    if (!cards.length) return null;

    const byParentCount = new Map();
    for (const card of cards) {
      const parent = card.parentElement;
      if (!parent) continue;
      byParentCount.set(parent, (byParentCount.get(parent) || 0) + 1);
    }

    // 选取持有最多卡片的父容器，通常就是清单网格容器。
    let best = null;
    let max = 0;
    for (const [parent, count] of byParentCount.entries()) {
      if (count > max) {
        best = parent;
        max = count;
      }
    }
    return best;
  }

  function extractRatingText(card) {
    const selectors = [
      '[data-rating]',
      '.score',
      '.scores',
      '.rating',
      '.rate',
      '.video-rating',
      '.meta'
    ];

    for (const selector of selectors) {
      const el = card.querySelector(selector);
      if (!el) continue;
      const value = el.getAttribute('data-rating') || el.textContent;
      if (value) return value;
    }

    return card.textContent || '';
  }

  function parseRating(card) {
    const text = extractRatingText(card).replace(/,/g, '.');
    const matches = text.match(/(?:\d+(?:\.\d+)?)/g);
    if (!matches) return 0;

    // 选择最像评分的值（0~10 优先）。
    const numbers = matches.map((m) => Number.parseFloat(m)).filter((n) => Number.isFinite(n));
    const inRange = numbers.filter((n) => n >= 0 && n <= 10);
    if (inRange.length) return Math.max(...inRange);
    return Math.max(...numbers, 0);
  }

  function sortByRating() {
    const cards = getCards();
    const container = getCardContainer(cards);

    if (!cards.length || !container) {
      console.warn('[JavDB 排序] 未找到可排序的番号卡片。');
      return;
    }

    const withMeta = cards.map((card, idx) => ({
      card,
      rating: parseRating(card),
      idx,
    }));

    withMeta.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.idx - b.idx;
    });

    const fragment = document.createDocumentFragment();
    withMeta.forEach(({ card }) => {
      card.setAttribute(SORTED_ATTR, '1');
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
    console.info('[JavDB 排序] 已按评分从高到低排序。');
  }

  function createSortButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = '按评分排序';
    Object.assign(button.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '99999',
      padding: '10px 14px',
      border: 'none',
      borderRadius: '8px',
      background: '#00d1b2',
      color: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,.2)',
    });

    button.addEventListener('click', sortByRating);
    document.body.appendChild(button);
  }

  function init() {
    createSortButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
