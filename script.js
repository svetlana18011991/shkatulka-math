// ===========================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ И ПЕРЕМЕННЫЕ
// ===========================
let allProducts = [];
let currentProducts = [];
let activeCatalogFilter = 'all';
let activeCatalogSearch = '';
let activeCatalogSort = 'default';


// ===========================
// ЯНДЕКС.МЕТРИКА + СОБЫТИЯ ТОВАРОВ
// ===========================
// Вставим номер счётчика сюда отдельным маленьким патчем, когда он будет создан в Яндекс.Метрике.
window.SHKT_METRIKA_ID = window.SHKT_METRIKA_ID || '110517614';

function getShkatulkaMetrikaId() {
  const id = String(window.SHKT_METRIKA_ID || '').trim();
  return /^\d+$/.test(id) ? id : '';
}

function initShkatulkaMetrika() {
  const id = getShkatulkaMetrikaId();
  if (!id || window.__shkatulkaMetrikaInitialized) return;
  window.__shkatulkaMetrikaInitialized = true;

  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    k=e.createElement(t);
    a=e.getElementsByTagName(t)[0];
    k.async=1;
    k.src=r;
    a.parentNode.insertBefore(k,a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

  window.ym(Number(id), 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
}

function productPriceValue(product) {
  const raw = String(product && product.price !== undefined ? product.price : '0').replace(',', '.').replace(/[^\d.]+/g, '');
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function productAnalyticsPayload(product) {
  if (!product) return {};
  const originalIndex = Number.isFinite(Number(product._shktOriginalIndex)) ? Number(product._shktOriginalIndex) : 0;
  const grade = Array.isArray(product.grade) ? product.grade.join(', ') : String(product.grade || '');
  const tags = Array.isArray(product.tags) ? product.tags.join(', ') : String(product.tags || '');

  return {
    id: productSlug(product, originalIndex),
    title: String(product.title || ''),
    price: productPriceValue(product),
    grade: grade,
    tags: tags,
    type: productPriceValue(product) > 0 ? 'paid' : 'free'
  };
}

function trackProductEvent(goal, product, extra) {
  initShkatulkaMetrika();

  const id = getShkatulkaMetrikaId();
  if (!id || typeof window.ym !== 'function') return;

  const payload = Object.assign({
    product: productAnalyticsPayload(product)
  }, extra || {});

  window.ym(Number(id), 'reachGoal', goal, payload);
}

window.shkatulkaTrackProductEvent = trackProductEvent;
initShkatulkaMetrika();


function initCatalogFilterFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter');
  if (!filter) return;
  activeCatalogFilter = filter;
  const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  if (btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

// Функция для поиска ссылок и превращения их в кликабельные (с вашим цветом)
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
    
    // ЖЕЛЕЗНАЯ ПРОВЕРКА ДЛЯ SVELTIA CMS: вытаскиваем массив из ключа items
    const products = data.items || (Array.isArray(data) ? data : []);

    const normalizedProducts = products.map((product, index) => Object.assign({}, product, { _shktOriginalIndex: index }));

    allProducts = normalizedProducts;
    currentProducts = normalizedProducts;
    renderHomePopularProducts(normalizedProducts);

    initFilters();
    initCatalogSearch();
    initCatalogSort();
    initCatalogFilterFromUrl();
    applyCatalogFilters();
    setTimeout(observeCards, 300);
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML =
      '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">Материалы скоро появятся. Если они уже добавлены в админке, подождите минуту и обновите страницу.</p>';
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


function renderHomePopularProducts(products) {
  const grid = document.getElementById('homePopularGrid');
  if (!grid) return;

  const popular = (products || []).slice(0, 3);
  if (!popular.length) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:30px">Популярные материалы скоро появятся.</p>';
    return;
  }

  grid.innerHTML = popular.map((p, index) => {
    const isPaid = isPaidProduct(p);
    const hasDownloadFile = hasFileForDownload(p);
    const dataGrade = Array.isArray(p.grade) ? p.grade.join(',') : p.grade;
    const productUrl = productPageUrl(p, index);

    const actionButton = isPaid
      ? `<a href="${p.buyLink || '#'}" target="_blank" class="card-buy-btn" rel="noopener" data-track-goal="product_buy_click" data-track-index="${index}">🛒 Купить</a>`
      : hasDownloadFile
        ? `<a href="${p.downloadFile}" target="_blank" class="card-buy-btn card-download-btn" rel="noopener" data-track-goal="product_download_click" data-track-index="${index}">📥 Скачать</a>`
        : '';

    return `
      <div class="product-card product-card-simple" data-index="${index}" data-grade="${dataGrade}" title="${p.title || ''}">
        <a class="card-img card-img-link" href="${productUrl}" aria-label="Открыть страницу материала ${p.title || ''}" data-track-goal="product_card_open_click" data-track-index="${index}">
          ${p.image
            ? `<img src="${p.image}" alt="${p.title || ''}" loading="lazy"/>`
            : `<div class="card-img-placeholder">${p.emoji || '📐'}</div>`
          }
          <span class="card-grade-badge">${gradeLabel(p.grade)}</span>
        </a>
        <div class="card-body card-body-simple">
          <h3 class="card-title card-title-simple"><a class="card-title-link" href="${productUrl}" data-track-goal="product_card_open_click" data-track-index="${index}">${p.title || ''}</a></h3>
          <div class="card-footer card-footer-simple">
            <span class="card-price">${isPaid ? p.price + ' ₽' : 'Бесплатно'}</span>
            <div class="card-actions ${!isPaid ? 'card-actions-free' : ''} ${!isPaid && !hasDownloadFile ? 'card-actions-free-single' : ''}">
              <a href="${productUrl}" class="card-details-btn" data-track-goal="product_detail_click" data-track-index="${index}">Подробнее</a>
              ${actionButton}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  initCatalogProductAnalytics(products);
}



function productSlug(product, index) {
  const raw = String(product && product.title ? product.title : 'material').trim().toLowerCase();
  const map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
  let slug = raw.split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
  slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug || ('material-' + (index + 1));
}

function productPageUrl(product, index) {
  return 'product.html?id=' + encodeURIComponent(productSlug(product, index));
}

function renderDonateSection() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  currentProducts = [];
  grid.innerHTML = `
    <div class="donate-catalog-panel">
      <div class="donate-catalog-intro">
        <p class="section-label">Закрытые подписки</p>
        <h2 class="section-title">Поддержать проект и получить больше материалов</h2>
        <p>В «Шкатулке математических интерактивов» есть закрытые подписки для учителей и репетиторов. Внутри я делюсь материалами, которые помогают быстрее готовиться к урокам и делать занятия математики живыми, понятными и методически продуманными.</p>
        <p>В подписке вы получаете готовые разработки, разминки, интерактивы, карточки, текстовые материалы, редактируемые шаблоны и обучающие видео по работе с Genially. Всё это можно использовать на уроках, индивидуальных занятиях, в классе, на онлайн-занятиях и при подготовке к ОГЭ/ЕГЭ.</p>
        <p><strong>Выберите удобный формат подписки: через Telegram или VK Donut.</strong></p>
        <p class="donate-thanks">Спасибо за вашу поддержку 💛 Благодаря ей я продолжаю создавать новые материалы, интерактивы и полезные разработки для коллег.</p>
      </div>

      <div class="donate-options">
        <article class="donate-option-card">
          <div class="donate-option-img">
            <img src="images/тг.png" alt="Telegram-подписка «Гениальные уроки»" loading="lazy">
          </div>
          <div class="donate-option-body">
            <h3>Telegram-подписка</h3>
            <p>Удобный формат для тех, кто чаще пользуется Telegram.</p>
            <a class="btn btn-primary donate-btn" href="https://t.me/tribute/app?startapp=ssLj" target="_blank" rel="noopener">Подписаться 599 ₽/месяц</a>
          </div>
        </article>

        <article class="donate-option-card">
          <div class="donate-option-img">
            <img src="images/вк.png" alt="VK Donut «Гениальные уроки»" loading="lazy">
          </div>
          <div class="donate-option-body">
            <h3>VK Donut</h3>
            <p>Подписка через сообщество ВКонтакте.</p>
            <a class="btn btn-primary donate-btn" href="https://vk.com/interaktiv_matematika?w=donut_payment-224352105&source=unspecified&levelId=1785" target="_blank" rel="noopener">Подписаться 599 ₽/месяц</a>
          </div>
        </article>
      </div>
    </div>
  `;
}


function renderProducts(products, hasSearch = false) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">${hasSearch ? 'По этому запросу пока ничего не найдено.' : 'По этому фильтру пока нет товаров'}</p>`;
    return;
  }

  currentProducts = products;

  grid.innerHTML = products.map((p, index) => {
    const isPaid = isPaidProduct(p);
    const hasDownloadFile = hasFileForDownload(p);
    const dataGrade = Array.isArray(p.grade) ? p.grade.join(',') : p.grade;
    const productUrl = productPageUrl(p, index);

    const actionButton = isPaid
      ? `<a href="${p.buyLink || '#'}" target="_blank" class="card-buy-btn" rel="noopener">🛒 Купить</a>`
      : hasDownloadFile
        ? `<a href="${p.downloadFile}" target="_blank" class="card-buy-btn card-download-btn" rel="noopener">📥 Скачать</a>`
        : '';

    return `
      <div class="product-card product-card-simple" data-index="${index}" data-grade="${dataGrade}" title="${p.title || ''}">
        <a class="card-img card-img-link" href="${productUrl}" aria-label="Открыть страницу материала ${p.title || ''}">
          ${p.image
            ? `<img src="${p.image}" alt="${p.title || ''}" loading="lazy"/>`
            : `<div class="card-img-placeholder">${p.emoji || '📐'}</div>`
          }
          <span class="card-grade-badge">${gradeLabel(p.grade)}</span>
        </a>
        <div class="card-body card-body-simple">
          <h3 class="card-title card-title-simple"><a class="card-title-link" href="${productUrl}">${p.title || ''}</a></h3>
          <div class="card-footer card-footer-simple">
            <span class="card-price">${isPaid ? p.price + ' ₽' : 'Бесплатно'}</span>
            <div class="card-actions ${!isPaid ? 'card-actions-free' : ''} ${!isPaid && !hasDownloadFile ? 'card-actions-free-single' : ''}">
              <a href="${productUrl}" class="card-details-btn">Подробнее</a>
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


function initCatalogSort() {
  const select = document.getElementById('catalogSort');
  if (!select) return;

  const params = new URLSearchParams(window.location.search);
  const sortFromUrl = params.get('sort');
  if (sortFromUrl && select.querySelector(`option[value="${sortFromUrl}"]`)) {
    activeCatalogSort = sortFromUrl;
  }

  select.value = activeCatalogSort;
  select.addEventListener('change', () => {
    activeCatalogSort = select.value || 'default';
    applyCatalogFilters();
  });
}

function sortCatalogProducts(products) {
  const sorted = (products || []).slice();

  if (activeCatalogSort === 'new') {
    return sorted.sort((a, b) => Number(b._shktOriginalIndex || 0) - Number(a._shktOriginalIndex || 0));
  }

  if (activeCatalogSort === 'cheap') {
    return sorted.sort((a, b) => productPriceValue(a) - productPriceValue(b));
  }

  if (activeCatalogSort === 'expensive') {
    return sorted.sort((a, b) => productPriceValue(b) - productPriceValue(a));
  }

  if (activeCatalogSort === 'free-first') {
    return sorted.sort((a, b) => {
      const af = productPriceValue(a) <= 0 ? 0 : 1;
      const bf = productPriceValue(b) <= 0 ? 0 : 1;
      return af - bf || Number(a._shktOriginalIndex || 0) - Number(b._shktOriginalIndex || 0);
    });
  }

  if (activeCatalogSort === 'paid-first') {
    return sorted.sort((a, b) => {
      const ap = productPriceValue(a) > 0 ? 0 : 1;
      const bp = productPriceValue(b) > 0 ? 0 : 1;
      return ap - bp || Number(a._shktOriginalIndex || 0) - Number(b._shktOriginalIndex || 0);
    });
  }

  if (activeCatalogSort === 'title') {
    return sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'));
  }

  return sorted.sort((a, b) => Number(a._shktOriginalIndex || 0) - Number(b._shktOriginalIndex || 0));
}

function initCatalogProductAnalytics(renderedProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.querySelectorAll('[data-track-goal][data-track-index]').forEach(link => {
    link.addEventListener('click', () => {
      const index = Number(link.dataset.trackIndex);
      const product = renderedProducts[index];
      if (!product) return;

      trackProductEvent(link.dataset.trackGoal, product, {
        location: 'catalog'
      });
    });
  });
}



function applyCatalogFilters() {
  if (activeCatalogFilter === 'donate') {
    renderDonateSection();
    return;
  }

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

  filtered = sortCatalogProducts(filtered);

  renderProducts(filtered, queryWords.length > 0);
  setTimeout(observeCards, 100);
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

function makeSearchStem(word) {
  return String(word || '')
    .replace(/(иями|ями|ами|ого|ему|ими|ыми|ией|иям|иях|ьев|ьям|ьях)$/i, '')
    .replace(/(ая|яя|ое|ее|ые|ие|ой|ей|ую|юю|ого|его|ому|ему|ых|их|ым|им)$/i, '')
    .replace(/(ами|ями|ах|ях|ов|ев|ей|ом|ем|ой|ам|ям|ою|ею)$/i, '')
    .replace(/(а|я|ы|и|у|ю|е|о|ь)$/i, '');
}

// ===========================
// МОБИЛЬНОЕ МЕНЮ И ДИПЛОМЫ
// ===========================
function initMobileMenu() {
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');
  if (!burger || !mobileNav) return;
  burger.onclick = () => { burger.classList.toggle('open'); mobileNav.classList.toggle('open'); };
  mobileNav.querySelectorAll('a').forEach(a => {
    a.onclick = () => { burger.classList.remove('open'); mobileNav.classList.remove('open'); };
  });
}

function initDiplomaModal() {
  const modal = document.getElementById('imgModal');
  const modalImg = document.getElementById('modalImg');
  const closeBtn = document.querySelector('#imgModal div');
  if (!modal || !modalImg || !closeBtn) return;

  document.querySelectorAll('.diploma-img').forEach(img => {
    img.onclick = () => { modal.style.display = 'flex'; modalImg.src = img.src; };
  });
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
}

// ===========================
// СТИЛИ И АНИМАЦИИ
// ===========================
function initDownloadButtonLayoutCss() {
  if (document.getElementById('downloadButtonLayoutCss')) return;
  const style = document.createElement('style');
  style.id = 'downloadButtonLayoutCss';
  style.textContent = `
    .card-actions-free { gap: 8px !important; display: flex !important; justify-content: flex-end !important; align-items: center !important; flex-wrap: nowrap !important; }
    .card-actions-free .card-view-btn, .card-actions-free .card-download-btn { padding-left: 14px !important; padding-right: 14px !important; white-space: nowrap !important; min-width: auto !important; }
    .card-actions-free-single { justify-content: flex-end !important; }
    @media (max-width: 520px) { .card-actions-free { gap: 7px !important; } .card-actions-free .card-view-btn, .card-actions-free .card-download-btn { padding-left: 12px !important; padding-right: 12px !important; font-size: 0.9rem !important; } }
  `;
  document.head.appendChild(style);
}

let observer = null;
if ('IntersectionObserver' in window) {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; }
    });
  }, { threshold: 0.1 });
}

function observeCards() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.opacity = '0'; card.style.transform = 'translateY(20px)'; card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    if (observer) observer.observe(card);
    else { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }
  });
}

function initAnimatedCounters() {
  const counters = document.querySelectorAll('.stat-num');
  if (!counters.length) return;

  const animateCounter = (el) => {
    if (el.dataset.done === '1') return;
    const original = el.textContent.trim();
    const numberMatch = original.match(/\d+/);
    if (!numberMatch || original.includes('–') || original.includes('-')) return;

    const target = Number(numberMatch[0]);
    const prefix = original.slice(0, numberMatch.index);
    const suffix = original.slice(numberMatch.index + numberMatch[0].length);

    el.dataset.done = '1';
    el.classList.add('counting');

    const duration = 3900;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${prefix}${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
      else { el.textContent = original; el.classList.remove('counting'); }
    };
    requestAnimationFrame(tick);
  };

  const observerCounters = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) animateCounter(entry.target); });
  }, { threshold: 0.55 });
  counters.forEach(el => observerCounters.observe(el));
}

// =========================================================
// ФИНАЛЬНАЯ ЛОГИКА ГАЛЕРЕИ В МОДАЛКЕ
// =========================================================
(function () {
  let gallery = [];
  let idx = 0;
  let cache = [];

  async function getProducts() {
    try { if (Array.isArray(currentProducts) && currentProducts.length) return currentProducts; } catch (e) {}
    try { if (Array.isArray(allProducts) && allProducts.length) return allProducts; } catch (e) {}
    if (cache.length) return cache;
    try {
      const r = await fetch('products.json?t=' + new Date().getTime());
      const data = await r.json();
      // Вытягиваем массив, независимо от того, как сохранила Sveltia
      cache = data.items || (Array.isArray(data) ? data : []); 
    } catch (e) {
      cache = [];
    }
    return cache;
  }

  function ensureModal() {
    let m = document.getElementById('finalProductModal');
    if (m) return m;

    m = document.createElement('div');
    m.id = 'finalProductModal';
    m.innerHTML = `
      <div class="fpm-window">
        <button class="fpm-close" type="button" aria-label="Закрыть">×</button>
        <div class="fpm-gallery">
          <button class="fpm-arrow fpm-prev" type="button">‹</button>
          <img class="fpm-img" alt="">
          <button class="fpm-arrow fpm-next" type="button">›</button>
          <div class="fpm-dots"></div>
        </div>
        <div class="fpm-info">
          <h2 class="fpm-title"></h2>
          <p class="fpm-desc"></p>
          <div class="fpm-inside">
            <h3>Что внутри:</h3>
            <ul class="fpm-list"></ul>
          </div>
          <div class="fpm-bottom">
            <div class="fpm-price"></div>
            <a class="fpm-buy" target="_blank" rel="noopener">Купить</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('.fpm-close').addEventListener('click', close);
    m.querySelector('.fpm-prev').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(idx - 1); });
    m.querySelector('.fpm-next').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(idx + 1); });

    return m;
  }

  function open(product) {
    const m = ensureModal();

    gallery = Array.isArray(product.gallery) && product.gallery.length
      ? product.gallery.map(g => g.media ? g.media : g).filter(Boolean)
      : [product.image].filter(Boolean);

    idx = 0;

    m.querySelector('.fpm-title').textContent = product.title || '';
    m.querySelector('.fpm-desc').innerHTML = linkify(product.description || '');
    m.querySelector('.fpm-list').innerHTML = (product.inside || []).map(x => '<li>' + linkify(x) + '</li>').join('');

    const isPaid = isPaidProduct(product);
    const hasDownloadFile = hasFileForDownload(product);
    const modalBuy = m.querySelector('.fpm-buy');

    m.querySelector('.fpm-price').textContent = isPaid ? `${product.price} ₽` : 'Бесплатно';

    if (isPaid) {
      modalBuy.style.display = ''; modalBuy.href = product.buyLink || '#'; modalBuy.textContent = 'Купить';
    } else if (hasDownloadFile) {
      modalBuy.style.display = ''; modalBuy.href = product.downloadFile; modalBuy.textContent = 'Скачать';
    } else {
      modalBuy.style.display = 'none'; modalBuy.removeAttribute('href');
    }

    const dots = m.querySelector('.fpm-dots');
    dots.innerHTML = gallery.map((_, i) => `<button type="button" class="fpm-dot" data-i="${i}"></button>`).join('');
    dots.querySelectorAll('.fpm-dot').forEach(function (d) {
      d.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(Number(d.dataset.i)); });
    });

    m.querySelectorAll('.fpm-arrow').forEach(a => a.style.display = gallery.length > 1 ? 'flex' : 'none');
    dots.style.display = gallery.length > 1 ? 'flex' : 'none';

    show(0);
    m.classList.add('open');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  }

  function show(i) {
    if (!gallery.length) return;
    if (i < 0) i = gallery.length - 1;
    if (i >= gallery.length) i = 0;
    idx = i;
    const m = document.getElementById('finalProductModal');
    if (!m) return;
    const img = m.querySelector('.fpm-img');
    img.src = gallery[idx];
    img.alt = 'Фото товара ' + (idx + 1);
    m.querySelectorAll('.fpm-dot').forEach((d, n) => d.classList.toggle('active', n === idx));
  }

  function close() {
    const m = document.getElementById('finalProductModal');
    if (m) m.classList.remove('open');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    const m = document.getElementById('finalProductModal');
    if (!m || !m.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', async function (e) {
      const btn = e.target.closest('.card-modal-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();

      const card = btn.closest('.product-card');
      const n = card ? Number(card.dataset.index) : 0;
      const products = await getProducts();
      const product = products[n] || products[0];

      if (product) open(product);
    }, true);
  });
})();

// ===========================
// УВЕЛИЧЕНИЕ ФОТО (ЗУМ) ИЗ МОДАЛКИ
// ===========================
function initImageZoom() {
  function ensureZoomModal(){
    let modal = document.getElementById('imageZoomModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'imageZoomModal';
    modal.className = 'image-zoom-modal';
    modal.innerHTML = '<button class="image-zoom-close" type="button" aria-label="Закрыть">×</button><img alt="Увеличенное фото">';
    document.body.appendChild(modal);
    
    function close(){ modal.classList.remove('open'); document.body.classList.remove('image-zoom-open'); }
    modal.addEventListener('click', e => { if(e.target === modal || e.target.classList.contains('image-zoom-close')) close(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && modal.classList.contains('open')) close(); });
    return modal;
  }

  document.addEventListener('click', function(e){
    const img = e.target.closest('#finalProductModal .fpm-img');
    if(!img || !img.src) return;
    e.preventDefault(); e.stopPropagation();
    const modal = ensureZoomModal();
    modal.querySelector('img').src = img.src;
    modal.classList.add('open');
    document.body.classList.add('image-zoom-open');
  }, true);
}

function initFreeHeroButton() {
  document.querySelectorAll('[data-scroll-filter="free"]').forEach(link => {
    link.addEventListener('click', () => { setTimeout(() => { const freeFilterBtn = document.querySelector('.filter-btn[data-filter="free"]'); if (freeFilterBtn) freeFilterBtn.click(); }, 150); });
  });
}

function initCookieNotice() {
  const storageKey = 'shkatulkaCookieAccepted';
  try { if (localStorage.getItem(storageKey) === '1') return; } catch (e) {}
  if (document.getElementById('cookieNotice')) return;

  const notice = document.createElement('div');
  notice.id = 'cookieNotice';
  notice.className = 'cookie-notice';
  notice.innerHTML = `<span>Мы используем файлы cookie</span><button type="button" class="cookie-notice-btn">Понятно</button>`;
  document.body.appendChild(notice);
  requestAnimationFrame(() => notice.classList.add('show'));

  notice.querySelector('.cookie-notice-btn').addEventListener('click', () => {
    try { localStorage.setItem(storageKey, '1'); } catch (e) {}
    notice.classList.remove('show');
    setTimeout(() => notice.remove(), 250);
  });
}

// ===========================
// ЗАПУСК ВСЕХ СКРИПТОВ
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initDownloadButtonLayoutCss();
  initMobileMenu();
  initDiplomaModal();
  initAnimatedCounters();
  initImageZoom();
  initFreeHeroButton();
  initCookieNotice();
  loadProducts();
});
