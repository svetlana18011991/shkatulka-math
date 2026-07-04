// ===========================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ И ПЕРЕМЕННЫЕ
// ===========================
let allProducts = [];
let currentProducts = [];
let activeCatalogFilter = 'all';
let activeCatalogSearch = '';

// Безопасная функция для превращения ссылок в кликабельные
function linkify(text) {
  if (!text) return '';
  var urlRegex = /(https?:\/\/[^\s]+)/g;
  return String(text).replace(urlRegex, function(url) {
    return '<a href="' + url + '" target="_blank" rel="noopener" style="color: #8B2635; text-decoration: underline; font-weight: 600;">' + url + '</a>';
  });
}

// ===========================
// ЗАГРУЗКА И РЕНДЕР ТОВАРОВ
// ===========================
async function loadProducts() {
  try {
    const response = await fetch('products.json?t=' + new Date().getTime(), { cache: 'no-store' });
    if (!response.ok) throw new Error('products.json не загрузился: ' + response.status);

    const data = await response.json();
    const products = data.items || (Array.isArray(data) ? data : []);

    allProducts = products;
    currentProducts = products;

    initFilters();
    initCatalogSearch();
    applyCatalogFilters();
    setTimeout(observeCards, 300);
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
    document.getElementById('productsGrid').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">Ошибка загрузки материалов. Пожалуйста, обновите страницу.</p>';
  }
}

function hasFileForDownload(product) {
  return Boolean(String(product && product.downloadFile ? product.downloadFile : '').trim());
}

function isPaidProduct(product) {
  return Number(product && product.price ? product.price : 0) > 0;
}

function hasGrade(product, gradeToCheck) {
  if (Array.isArray(product.grade)) {
    return product.grade.includes(gradeToCheck);
  }
  return String(product.grade) === gradeToCheck;
}

function renderProducts(products, hasSearch = false) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">${hasSearch ? 'По этому запросу пока ничего не найдено.' : 'По этому фильтру пока нет товаров.'}</p>`;
    return;
  }

  currentProducts = products;

  grid.innerHTML = products.map((p, index) => {
    const isPaid = isPaidProduct(p);
    const hasDownloadFile = hasFileForDownload(p);
    const dataGrade = Array.isArray(p.grade) ? p.grade.join(',') : p.grade;

    const actionButton = isPaid
      ? `<a href="${p.buyLink || '#'}" target="_blank" class="card-buy-btn" rel="noopener">🛒 Купить</a>`
      : hasDownloadFile
        ? `<a href="${p.downloadFile}" target="_blank" class="card-buy-btn card-download-btn" rel="noopener">📥 Скачать</a>`
        : '';

    return `
      <div class="product-card product-card-simple" data-index="${index}" data-grade="${dataGrade}" title="${p.title || ''}">
        <div class="card-img">
          ${p.image ? `<img src="${p.image}" alt="${p.title || ''}" loading="lazy"/>` : `<div class="card-img-placeholder">${p.emoji || '📐'}</div>`}
          <span class="card-grade-badge">${gradeLabel(p.grade)}</span>
        </div>
        <div class="card-body card-body-simple">
          <h3 class="card-title card-title-simple">${p.title || ''}</h3>
          <div class="card-footer card-footer-simple">
            <span class="card-price">${isPaid ? p.price + ' ₽' : 'Бесплатно'}</span>
            <div class="card-actions ${!isPaid ? 'card-actions-free' : ''} ${!isPaid && !hasDownloadFile ? 'card-actions-free-single' : ''}">
              <button type="button" class="card-view-btn">Смотреть</button>
              ${actionButton}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function gradeLabel(grade) {
  if (!grade) return '';
  let grades = Array.isArray(grade) ? grade : [grade];
  return grades.map(g => {
    if (g === 'free') return 'Бесплатно';
    if (g === 'oge') return 'ОГЭ';
    if (g === 'ege') return 'ЕГЭ';
    return `${g} класс`;
  }).join(', ');
}

// ===========================
// ФИЛЬТРЫ И ПОИСК
// ===========================
function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCatalogFilter = btn.dataset.filter || 'all';
      applyCatalogFilters();
    };
  });
}

function initCatalogSearch() {
  const input = document.getElementById('productSearch');
  const clearBtn = document.getElementById('productSearchClear');
  if (!input) return;

  const runSearch = () => {
    activeCatalogSearch = input.value || '';
    if (clearBtn) clearBtn.classList.toggle('show', activeCatalogSearch.trim().length > 0);
    applyCatalogFilters();
  };

  input.addEventListener('input', runSearch);
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      runSearch();
    });
  }
}

function applyCatalogFilters() {
  let filtered = allProducts.slice();

  if (activeCatalogFilter === 'free') {
    filtered = filtered.filter(p => hasGrade(p, 'free') || Number(p.price) <= 0);
  } else if (activeCatalogFilter === '11') {
    filtered = filtered.filter(p => hasGrade(p, '11') || hasGrade(p, 'ege'));
  } else if (activeCatalogFilter === '9') {
    filtered = filtered.filter(p => hasGrade(p, '9') || hasGrade(p, 'oge'));
  } else if (activeCatalogFilter !== 'all') {
    filtered = filtered.filter(p => hasGrade(p, activeCatalogFilter));
  }

  const queryWords = getSearchWords(activeCatalogSearch);
  if (queryWords.length) {
    filtered = filtered.filter(product => productMatchesSearch(product, queryWords));
  }

  renderProducts(filtered, queryWords.length > 0);
}

function getSearchWords(value) {
  return normalizeText(value).split(' ').map(w => w.trim()).filter(w => w.length >= 2);
}

function productMatchesSearch(product, queryWords) {
  const haystack = productSearchText(product);
  return queryWords.every(word => {
    const stem = makeSearchStem(word);
    return haystack.includes(word) || (stem.length >= 3 && haystack.includes(stem));
  });
}

function productSearchText(product) {
  const parts = [
    product.title, product.description, product.cardDescription, product.insideTitle,
    Array.isArray(product.grade) ? product.grade.join(' ') : product.grade,
    gradeLabel(product.grade),
    Array.isArray(product.tags) ? product.tags.join(' ') : product.tags,
    Array.isArray(product.inside) ? product.inside.join(' ') : product.inside
  ];
  const normalized = normalizeText(parts.filter(Boolean).join(' '));
  return `${normalized} ${normalized.split(' ').map(makeSearchStem).join(' ')}`;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Упрощенный стемминг
function makeSearchStem(word) {
  return String(word || '')
    .replace(/(иями|ями|ами|ого|ему|ими|ыми|ией|иям|иях|ьев|ьям|ьях)$/i, '')
    .replace(/(ая|яя|ое|ее|ые|ие|ой|ей|ую|юю|ого|его|ому|ему|ых|их|ым|им)$/i, '')
    .replace(/(ами|ями|ах|ях|ов|ев|ей|ом|ем|ой|ам|ям|ою|ею)$/i, '')
    .replace(/(а|я|ы|и|у|ю|е|о|ь)$/i, '');
}

// ===========================
// МЕНЮ И ДРУГИЕ ИНИЦИАЛИЗАЦИИ
// ===========================
function initMobileMenu() {
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');
  if (!burger || !mobileNav) return;
  burger.onclick = () => { burger.classList.toggle('open'); mobileNav.classList.toggle('open'); };
  mobileNav.querySelectorAll('a').forEach(a => { a.onclick = () => { burger.classList.remove('open'); mobileNav.classList.remove('open'); }; });
}

function initDiplomaModal() {
  const modal = document.getElementById('imgModal');
  const modalImg = document.getElementById('modalImg');
  const closeBtn = document.querySelector('#imgModal div');
  if (!modal || !modalImg || !closeBtn) return;
  document.querySelectorAll('.diploma-img').forEach(img => { img.onclick = () => { modal.style.display = 'flex'; modalImg.src = img.src; }; });
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
}

function initDownloadButtonLayoutCss() {
  if (document.getElementById('downloadButtonLayoutCss')) return;
  const style = document.createElement('style');
  style.id = 'downloadButtonLayoutCss';
  style.textContent = `.card-actions-free{gap:8px!important;display:flex!important;justify-content:flex-end!important;align-items:center!important;flex-wrap:nowrap!important;}.card-actions-free .card-view-btn,.card-actions-free .card-download-btn{padding-left:14px!important;padding-right:14px!important;white-space:nowrap!important;min-width:auto!important;}.card-actions-free-single{justify-content:flex-end!important;}@media(max-width:520px){.card-actions-free{gap:7px!important;}.card-actions-free .card-view-btn,.card-actions-free .card-download-btn{padding-left:12px!important;padding-right:12px!important;font-size:0.9rem!important;}}`;
  document.head.appendChild(style);
}

let observer = null;
if ('IntersectionObserver' in window) {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; } });
  }, { threshold: 0.1 });
}

function observeCards() {
  document.querySelectorAll('.product-card, .review-card').forEach(card => {
    card.style.opacity = '0'; card.style.transform = 'translateY(20px)'; card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    if (observer) observer.observe(card); else { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }
  });
}

// =========================================================
// ФИНАЛЬНАЯ ЛОГИКА ГАЛЕРЕИ В МОДАЛКЕ
// =========================================================
(function () {
  let gallery = [];
  let idx = 0;
  let cache = [];

  async function getProducts() {
    if (window.currentProducts && window.currentProducts.length) return window.currentProducts;
    if (window.allProducts && window.allProducts.length) return window.allProducts;
    if (cache.length) return cache;
    try {
      const r = await fetch('products.json?t=' + new Date().getTime());
      const data = await r.json();
      cache = data.items || (Array.isArray(data) ? data : []);
    } catch (e) { cache = []; }
    return cache;
  }

  function ensureModal() {
    let m = document.getElementById('finalProductModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'finalProductModal';
    m.innerHTML = `<div class="fpm-window"><button class="fpm-close" type="button">×</button><div class="fpm-gallery"><button class="fpm-arrow fpm-prev" type="button">‹</button><img class="fpm-img" alt=""><button class="fpm-arrow fpm-next" type="button">›</button><div class="fpm-dots"></div></div><div class="fpm-info"><h2 class="fpm-title"></h2><p class="fpm-desc"></p><div class="fpm-inside"><h3>Что внутри:</h3><ul class="fpm-list"></ul></div><div class="fpm-bottom"><div class="fpm-price"></div><a class="fpm-buy" target="_blank" rel="noopener">Купить</a></div></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) close(); });
    m.querySelector('.fpm-close').addEventListener('click', close);
    m.querySelector('.fpm-prev').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(idx - 1); });
    m.querySelector('.fpm-next').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(idx + 1); });
    return m;
  }

  function open(product) {
    const m = ensureModal();
    gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery.map(g => g.media ? g.media : g).filter(Boolean) : [product.image].filter(Boolean);
    idx = 0;

    m.querySelector('.fpm-title').textContent = product.title || '';
    m.querySelector('.fpm-desc').innerHTML = window.linkify ? window.linkify(product.description || '') : (product.description || '');
    m.querySelector('.fpm-list').innerHTML = (product.inside || []).map(x => '<li>' + (window.linkify ? window.linkify(x) : x) + '</li>').join('');

    const isPaid = Number(product.price) > 0;
    const hasDownload = Boolean(String(product.downloadFile || '').trim());
    const modalBuy = m.querySelector('.fpm-buy');

    m.querySelector('.fpm-price').textContent = isPaid ? `${product.price} ₽` : 'Бесплатно';
    if (isPaid) { modalBuy.style.display = ''; modalBuy.href = product.buyLink || '#'; modalBuy.textContent = 'Купить'; }
    else if (hasDownload) { modalBuy.style.display = ''; modalBuy.href = product.downloadFile; modalBuy.textContent = 'Скачать'; }
    else { modalBuy.style.display = 'none'; }

    const dots = m.querySelector('.fpm-dots');
    dots.innerHTML = gallery.map((_, i) => `<button type="button" class="fpm-dot" data-i="${i}"></button>`).join('');
    dots.querySelectorAll('.fpm-dot').forEach(d => { d.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(Number(d.dataset.i)); }); });
    m.querySelectorAll('.fpm-arrow').forEach(a => a.style.display = gallery.length > 1 ? 'flex' : 'none');
    dots.style.display = gallery.length > 1 ? 'flex' : 'none';

    show(0);
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function show(i) {
    if (!gallery.length) return;
    if (i < 0) i = gallery.length - 1;
    if (i >= gallery.length) i = 0;
    idx = i;
    const m = document.getElementById('finalProductModal');
    if (!m) return;
    m.querySelector('.fpm-img').src = gallery[idx];
    m.querySelectorAll('.fpm-dot').forEach((d, n) => d.classList.toggle('active', n === idx));
  }

  function close() {
    const m = document.getElementById('finalProductModal');
    if (m) m.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', e => {
    const m = document.getElementById('finalProductModal');
    if (!m || !m.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', async function (e) {
      const btn = e.target.closest('.card-view-btn');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      const card = btn.closest('.product-card');
      const n = card ? Number(card.dataset.index) : 0;
      const products = await getProducts();
      const product = products[n] || products[0];
      if (product) open(product);
    }, true);
  });
})();

// Запуск
document.addEventListener('DOMContentLoaded', () => {
  initDownloadButtonLayoutCss();
  initMobileMenu();
  initDiplomaModal();
  loadProducts();
});