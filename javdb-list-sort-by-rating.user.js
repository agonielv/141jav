// ==UserScript==
// @name         JavDB 清单按评分全局排序
// @namespace    https://github.com/
// @version      2.2.0
// @description  在 JavDB 清单详情页（/users/list_detail?id=...）中，抓取清单全部分页并按评分对番号卡片全局排序。
// @author       141jav
// @match        https://javdb.com/users/list_detail*
// @match        https://javdb.com/lists/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID = 'javdb-sort-rating-button';
  const MAX_SCAN_PAGES = 80;

  function getCards(root = document) {
    const candidates = Array.from(root.querySelectorAll('a[href^="/v/"]'));
    const cards = candidates
      .map((a) => a.closest('.item, .movie-item, .grid-item, article, .card') || a.parentElement)
      .filter(Boolean);

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
    const selectors = ['[data-rating]', '.score', '.scores', '.rating', '.rate', '.video-rating', '.meta'];

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

    const numbers = matches.map((m) => Number.parseFloat(m)).filter((n) => Number.isFinite(n));
    const inRange = numbers.filter((n) => n >= 0 && n <= 10);
    if (inRange.length) return Math.max(...inRange);
    return Math.max(...numbers, 0);
  }

  function normalizeUrl(url) {
    const u = new URL(url, location.origin);
    u.hash = '';
    return u.toString();
  }

  function getListContext() {
    const url = new URL(location.href);

    if (url.pathname === '/users/list_detail') {
      const id = url.searchParams.get('id');
      if (!id) return null;
      return { type: 'user', id };
    }

    const listMatch = url.pathname.match(/^\/lists\/([^/]+)/);
    if (listMatch) {
      return { type: 'public', id: listMatch[1] };
    }

    return null;
  }

  function buildListPageUrl(context, page) {
    const u = new URL(location.href);
    u.hash = '';

    if (context.type === 'user') {
      u.pathname = '/users/list_detail';
      u.search = '';
      u.searchParams.set('id', context.id);
      if (page > 1) u.searchParams.set('page', String(page));
      return normalizeUrl(u.toString());
    }

    // public list: /lists/<id>?page=N
    u.pathname = `/lists/${context.id}`;
    u.search = '';
    if (page > 1) u.searchParams.set('page', String(page));
    return normalizeUrl(u.toString());
  }

  function getPageNumber(url) {
    const page = Number.parseInt(new URL(url, location.origin).searchParams.get('page') || '1', 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  function hasNextPage(doc) {
    const links = Array.from(doc.querySelectorAll('.pagination a[href]'));

    return links.some((a) => {
      const text = (a.textContent || '').trim();
      return /下一页|下一頁|next/i.test(text);
    });
  }

  function createDocSignature(doc) {
    const hrefs = Array.from(doc.querySelectorAll('a[href^="/v/"]')).map((a) => a.getAttribute('href') || '');
    if (!hrefs.length) return '';
    const first = hrefs[0];
    const last = hrefs[hrefs.length - 1];
    return `${hrefs.length}:${first}:${last}`;
  }

  async function fetchPageDocument(url) {
    if (normalizeUrl(url) === normalizeUrl(location.href)) return document;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`请求失败：${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function collectAllPageDocs(context, onProgress) {
    const docs = [];
    let previousSignature = '';

    for (let page = 1; page <= MAX_SCAN_PAGES; page += 1) {
      const url = buildListPageUrl(context, page);
      // eslint-disable-next-line no-await-in-loop
      const doc = await fetchPageDocument(url);
      const cards = getCards(doc);
      const signature = createDocSignature(doc);

      if (!cards.length) break;
      if (previousSignature && signature && signature === previousSignature) break;

      docs.push({ url, doc });
      previousSignature = signature;

      if (onProgress) onProgress(page, MAX_SCAN_PAGES);
      if (!hasNextPage(doc)) break;
    }

    return docs;
  }

  async function sortAllPagesByRating() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;

    const context = getListContext();
    if (!context) {
      console.warn('[JavDB 排序] 当前页面不是支持的清单地址。');
      return;
    }

    const localCards = getCards(document);
    const localContainer = getCardContainer(localCards);
    if (!localCards.length || !localContainer) {
      console.warn('[JavDB 排序] 当前页未找到可排序的番号卡片。');
      return;
    }

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = '抓取中 0/?';

    try {
      const pageDocs = await collectAllPageDocs(context, (page) => {
        button.textContent = `抓取中 ${page}/?`;
      });

      const allItems = [];
      pageDocs.forEach(({ url, doc }) => {
        const cards = getCards(doc);
        const pageNo = getPageNumber(url);
        cards.forEach((card, index) => {
          allItems.push({
            rating: parseRating(card),
            order: pageNo * 10000 + index,
            node: card.cloneNode(true),
          });
        });
      });

      if (!allItems.length) {
        throw new Error('全部分页中未找到可排序的番号卡片。');
      }

      allItems.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.order - b.order;
      });

      localContainer.innerHTML = '';
      const fragment = document.createDocumentFragment();
      allItems.forEach(({ node }) => fragment.appendChild(node));
      localContainer.appendChild(fragment);

      button.textContent = `已排序 ${allItems.length} 部`;
      console.info(`[JavDB 排序] 已完成：${pageDocs.length} 页、${allItems.length} 部影片，按评分从高到低排序。`);
    } catch (error) {
      console.error('[JavDB 排序] 失败：', error);
      button.textContent = '排序失败，请重试';
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalLabel;
      }, 1400);
    }
  }

  function createSortButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = '全清单按评分排序';
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

    button.addEventListener('click', sortAllPagesByRating);
    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSortButton, { once: true });
  } else {
    createSortButton();
  }
})();
