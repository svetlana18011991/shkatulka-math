// ===========================

// ЗАГРУЗКА И РЕНДЕР ТОВАРОВ

// ===========================



let allProducts = [];

let currentProducts = [];
let activeCatalogFilter = 'all';
let activeCatalogSearch = '';



async function loadProducts() {

  try {

    // Добавлен сброс кэша, чтобы новые товары появлялись сразу

    const response = await fetch('products.json?t=' + new Date().getTime());

    const data = await response.json();



    // Поддержка формата Sveltia CMS

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

      '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1">Товары пока не добавлены.</p>';

  }

}



function renderProducts(products, hasSearch = false) {

  const grid = document.getElementById('productsGrid');



  if (!products.length) {

    grid.innerHTML = `<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">${hasSearch ? 'По этому запросу пока ничего не найдено. Попробуйте другое слово или выберите «Все».' : 'По этому фильтру пока нет товаров'}</p>`;

    return;

  }



  currentProducts = products;



  grid.innerHTML = products.map((p, index) => `

    <div class="product-card product-card-simple" data-index="${index}" data-grade="${p.grade}" title="${p.title || ''}">

      <div class="card-img">

        ${p.image

          ? `<img src="${p.image}" alt="${p.title}" loading="lazy"/>`

          : `<div class="card-img-placeholder">${p.emoji || '📐'}</div>`

        }

        <span class="card-grade-badge">${gradeLabel(p.grade)}</span>

      </div>



      <div class="card-body card-body-simple">

        <div class="card-footer card-footer-simple">

          <span class="card-price">${p.price > 0 ? p.price + ' ₽' : 'Бесплатно'}</span>



          <div class="card-actions">

            <button type="button" class="card-view-btn">Смотреть</button>

            <a href="${p.price > 0 ? p.buyLink : (p.downloadFile || '#')}" target="_blank" class="card-buy-btn" rel="noopener">

              ${p.price > 0 ? '🛒 Купить' : '📥 Скачать'}

            </a>

          </div>

        </div>

      </div>

    </div>

  `).join('');

}



function gradeLabel(grade) {
  if (grade === 'free') return 'Бесплатно';

  if (grade === 'oge') return 'ОГЭ';

  if (grade === 'ege') return 'ЕГЭ';

  return `${grade} класс`;

}



// ===========================

// ФИЛЬТРЫ

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
    filtered = filtered.filter(p => String(p.grade) === 'free' || Number(p.price) <= 0);
  } else if (activeCatalogFilter === '11') {
    // Всё, что опубликовано в ЕГЭ, автоматически показывается и в 11 классе.
    // При этом материалы только 11 класса не попадают автоматически в ЕГЭ.
    filtered = filtered.filter(p => String(p.grade) === '11' || String(p.grade) === 'ege');
  } else if (activeCatalogFilter === '9') {
    // Всё, что опубликовано в ОГЭ, автоматически показывается и в 9 классе.
    // При этом материалы только 9 класса не попадают автоматически в ОГЭ.
    filtered = filtered.filter(p => String(p.grade) === '9' || String(p.grade) === 'oge');
  } else if (activeCatalogFilter !== 'all') {
    filtered = filtered.filter(p => String(p.grade) === activeCatalogFilter);
  }

  const queryWords = getSearchWords(activeCatalogSearch);
  if (queryWords.length) {
    filtered = filtered.filter(product => productMatchesSearch(product, queryWords));
  }

  renderProducts(filtered, queryWords.length > 0);
  setTimeout(observeCards, 100);
}

function getSearchWords(value) {
  return normalizeText(value)
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length >= 2);
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
    product.title,
    product.description,
    product.cardDescription,
    product.insideTitle,
    product.grade,
    gradeLabel(product.grade),
    Array.isArray(product.tags) ? product.tags.join(' ') : product.tags,
    Array.isArray(product.inside) ? product.inside.join(' ') : product.inside
  ];

  const normalized = normalizeText(parts.filter(Boolean).join(' '));
  const stems = normalized.split(' ').map(makeSearchStem).join(' ');
  return `${normalized} ${stems}`;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSearchStem(word) {
  return String(word || '')
    .replace(/(иями|ями|ами|ого|ему|ими|ыми|ией|иям|иях|ьев|ьям|ьях)$/i, '')
    .replace(/(ая|яя|ое|ее|ые|ие|ой|ей|ую|юю|ого|его|ому|ему|ых|их|ым|им)$/i, '')
    .replace(/(ами|ями|ах|ях|ов|ев|ей|ом|ем|ой|ам|ям|ою|ею)$/i, '')
    .replace(/(а|я|ы|и|у|ю|е|о|ь)$/i, '');
}



// ===========================

// МОДАЛЬНОЕ ОКНО ТОВАРА (Старое, резервное)

// ===========================

function openProductModal(product) {

  let modal = document.getElementById('productModal');

  if (!modal) {

    modal = document.createElement('div');

    modal.id = 'productModal';

    modal.className = 'product-modal';

    modal.innerHTML = `

      <div class="product-modal-window">

        <button type="button" class="product-modal-close" aria-label="Закрыть">×</button>

        <div class="product-modal-image"><img id="productModalImg" alt=""></div>

        <div class="product-modal-info">

          <h2 id="productModalTitle"></h2>

          <p id="productModalDesc" class="product-modal-desc"></p>

          <div class="product-modal-inside">

            <h3 id="productModalInsideTitle"></h3>

            <ul id="productModalList"></ul>

          </div>

          <div class="product-modal-bottom">

            <div id="productModalPrice" class="product-modal-price"></div>

            <a id="productModalBuy" class="product-modal-buy" target="_blank" rel="noopener">Купить</a>

          </div>

        </div>

      </div>

    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', e => { if (e.target === modal) closeProductModal(); });

    modal.querySelector('.product-modal-close').addEventListener('click', closeProductModal);

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProductModal(); });

  }



  modal.querySelector('#productModalImg').src = product.image || '';

  modal.querySelector('#productModalImg').alt = product.title || '';

  modal.querySelector('#productModalTitle').textContent = product.title || '';

  modal.querySelector('#productModalDesc').textContent = product.description || '';

  modal.querySelector('#productModalInsideTitle').textContent = product.insideTitle || 'Что внутри:';

  modal.querySelector('#productModalList').innerHTML = (product.inside || []).map(item => `<li>${item}</li>`).join('');

  modal.querySelector('#productModalPrice').textContent = product.price > 0 ? `${product.price} ₽` : 'Бесплатно';

  modal.querySelector('#productModalBuy').href = product.price > 0 ? (product.buyLink || '#') : (product.downloadFile || '#');

  modal.classList.add('open');

  document.body.classList.add('modal-open');

}



function closeProductModal() {

  const modal = document.getElementById('productModal');

  if (modal) modal.classList.remove('open');

  document.body.classList.remove('modal-open');

}



// ===========================

// БУРГЕР МЕНЮ

// ===========================

function initMobileMenu() {

  const burger = document.getElementById('burger');

  const mobileNav = document.getElementById('mobileNav');

  if (!burger || !mobileNav) return;

  burger.onclick = () => {

    burger.classList.toggle('open');

    mobileNav.classList.toggle('open');

  };

  mobileNav.querySelectorAll('a').forEach(a => {

    a.onclick = () => {

      burger.classList.remove('open');

      mobileNav.classList.remove('open');

    };

  });

}



// ===========================

// АНИМАЦИЯ ПОЯВЛЕНИЯ КАРТОЧЕК

// ===========================

const observer = new IntersectionObserver((entries) => {

  entries.forEach(entry => {

    if (entry.isIntersecting) {

      entry.target.style.opacity = '1';

      entry.target.style.transform = 'translateY(0)';

    }

  });

}, { threshold: 0.1 });



function observeCards() {

  document.querySelectorAll('.product-card, .review-card').forEach(card => {

    card.style.opacity = '0';

    card.style.transform = 'translateY(20px)';

    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    observer.observe(card);

  });

}



// ===========================

// МОДАЛЬНОЕ ОКНО ДИПЛОМОВ

// ===========================

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

// ЗАПУСК И ЭФФЕКТЫ

// ===========================

document.addEventListener('DOMContentLoaded', () => {

  initMobileMenu();

  initDiplomaModal();

  loadProducts();

});



// Анимация чисел

function initAnimatedCounters() {

  const counters = document.querySelectorAll('.stat-num');

  if (!counters.length) return;

  const animateCounter = (el) => {

    if (el.dataset.done === '1') return;

    const original = el.textContent.trim();

    const numberMatch = original.match(/\d+/);

    if (!numberMatch) return;

    const target = Number(numberMatch[0]);

    const prefix = original.slice(0, numberMatch.index);

    const suffix = original.slice(numberMatch.index + numberMatch[0].length);

    if (original.includes('–') || original.includes('-')) return;

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

document.addEventListener('DOMContentLoaded', initAnimatedCounters);



// =========================================================

// ФИНАЛЬНАЯ ЛОГИКА ГАЛЕРЕИ В МОДАЛКЕ

// =========================================================

(function(){

  let gallery = [];

  let idx = 0;

  let cache = [];



  function ready(fn){

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);

    else fn();

  }



  async function getProducts(){

    try{ if(Array.isArray(currentProducts) && currentProducts.length) return currentProducts; }catch(e){}

    try{ if(Array.isArray(allProducts) && allProducts.length) return allProducts; }catch(e){}

    if(cache.length) return cache;

    try{

      // Сброс кэша и поддержка Sveltia

      const r = await fetch('products.json?t=' + new Date().getTime());

      const data = await r.json();

      cache = data.items || (Array.isArray(data) ? data : []);

    }catch(e){

      console.error('products.json не загрузился для модалки', e);

      cache = [];

    }

    return cache;

  }



  function ensureModal(){

    let m = document.getElementById('finalProductModal');

    if(m) return m;



    m = document.createElement('div');

    m.id = 'finalProductModal';

    m.innerHTML = `

      <div class="fpm-window">

        <button class="fpm-close" type="button" aria-label="Закрыть">×</button>

        <div class="fpm-gallery">

          <button class="fpm-arrow fpm-prev" type="button" aria-label="Предыдущее фото">‹</button>

          <img class="fpm-img" alt="">

          <button class="fpm-arrow fpm-next" type="button" aria-label="Следующее фото">›</button>

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



    m.addEventListener('click', function(e){ if(e.target === m) close(); });

    m.querySelector('.fpm-close').addEventListener('click', close);

    m.querySelector('.fpm-prev').addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); show(idx - 1); });

    m.querySelector('.fpm-next').addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); show(idx + 1); });



    return m;

  }



  function open(product){

    const m = ensureModal();

    

    // Формируем галерею

    gallery = Array.isArray(product.gallery) && product.gallery.length 

      ? product.gallery.map(g => g.media ? g.media : g).filter(Boolean)

      : [product.image].filter(Boolean);



    idx = 0;

    m.querySelector('.fpm-title').textContent = product.title || '';

    m.querySelector('.fpm-desc').textContent = product.description || '';

    m.querySelector('.fpm-list').innerHTML = (product.inside || []).map(x => '<li>'+x+'</li>').join('');

    

    m.querySelector('.fpm-price').textContent = product.price > 0 ? `${product.price} ₽` : 'Бесплатно';

    m.querySelector('.fpm-buy').href = product.price > 0 ? (product.buyLink || '#') : (product.downloadFile || '#');

    m.querySelector('.fpm-buy').textContent = product.price > 0 ? 'Купить' : 'Скачать';



    const dots = m.querySelector('.fpm-dots');

    dots.innerHTML = gallery.map((_, i) => '<button type="button" class="fpm-dot" data-i="'+i+'" aria-label="Фото '+(i+1)+'"></button>').join('');

    dots.querySelectorAll('.fpm-dot').forEach(function(d){

      d.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); show(Number(d.dataset.i)); });

    });



    m.querySelectorAll('.fpm-arrow').forEach(a => a.style.display = gallery.length > 1 ? 'flex' : 'none');

    dots.style.display = gallery.length > 1 ? 'flex' : 'none';



    show(0);

    m.classList.add('open');

    document.body.classList.add('modal-open');

    document.body.style.overflow = 'hidden';

  }



  function show(i){

    if(!gallery.length) return;

    if(i < 0) i = gallery.length - 1;

    if(i >= gallery.length) i = 0;

    idx = i;

    const m = document.getElementById('finalProductModal');

    if(!m) return;

    const img = m.querySelector('.fpm-img');

    img.src = gallery[idx];

    img.alt = 'Фото товара ' + (idx + 1);

    m.querySelectorAll('.fpm-dot').forEach((d, n) => d.classList.toggle('active', n === idx));

  }



  function close(){

    const m = document.getElementById('finalProductModal');

    if(m) m.classList.remove('open');

    const old = document.getElementById('productModal');

    if(old) old.classList.remove('open');

    document.body.classList.remove('modal-open');

    document.body.style.overflow = '';

  }



  document.addEventListener('keydown', function(e){

    const m = document.getElementById('finalProductModal');

    if(!m || !m.classList.contains('open')) return;

    if(e.key === 'Escape') close();

    if(e.key === 'ArrowLeft') show(idx - 1);

    if(e.key === 'ArrowRight') show(idx + 1);

  });



  ready(function(){

    document.addEventListener('click', async function(e){

      const btn = e.target.closest('.card-view-btn');

      if(!btn) return;

      e.preventDefault();

      e.stopImmediatePropagation();

      e.stopPropagation();

      const card = btn.closest('.product-card');

      const n = card ? Number(card.dataset.index) : 0;

      const products = await getProducts();

      const product = products[n] || products[0];

      if(product) open(product);

    }, true);

  });

})(); 



// ===========================
// КНОПКА "БЕСПЛАТНЫЕ" В ПЕРВОМ ЭКРАНЕ
// ===========================
function initFreeHeroButton() {
  document.querySelectorAll('[data-scroll-filter="free"]').forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(() => {
        const freeFilterBtn = document.querySelector('.filter-btn[data-filter="free"]');
        if (freeFilterBtn) freeFilterBtn.click();
      }, 150);
    });
  });
}

document.addEventListener('DOMContentLoaded', initFreeHeroButton);


// ===========================
// ПЛАШКА COOKIE ПРИ ПЕРВОМ ВХОДЕ
// ===========================
function initCookieNotice() {
  const storageKey = 'shkatulkaCookieAccepted';
  try {
    if (localStorage.getItem(storageKey) === '1') return;
  } catch (e) {}

  if (document.getElementById('cookieNotice')) return;

  const notice = document.createElement('div');
  notice.id = 'cookieNotice';
  notice.className = 'cookie-notice';
  notice.innerHTML = `
    <span>Мы используем файлы cookie</span>
    <button type="button" class="cookie-notice-btn">Понятно</button>
  `;

  document.body.appendChild(notice);

  requestAnimationFrame(() => notice.classList.add('show'));

  const btn = notice.querySelector('.cookie-notice-btn');
  btn.addEventListener('click', () => {
    try { localStorage.setItem(storageKey, '1'); } catch (e) {}
    notice.classList.remove('show');
    setTimeout(() => notice.remove(), 250);
  });
}

document.addEventListener('DOMContentLoaded', initCookieNotice);
