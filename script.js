// ===========================
// ЗАГРУЗКА И РЕНДЕР ТОВАРОВ
// ===========================

let allProducts = [];
let currentProducts = [];

async function loadProducts() {
  try {
    // Добавлен сброс кэша
    const response = await fetch('products.json?t=' + new Date().getTime());
    const data = await response.json();

    // Поддержка формата Sveltia CMS
    const products = data.items || (Array.isArray(data) ? data : []);

    allProducts = products;
    currentProducts = products;

    renderProducts(products);
    initFilters();
    setTimeout(observeCards, 300);
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
    document.getElementById('productsGrid').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1">Товары пока не добавлены.</p>';
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');

  if (!products.length) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">По этому фильтру пока нет товаров</p>';
    return;
  }

  currentProducts = products;

  grid.innerHTML = products.map((p, index) => `
    <div class="product-card" data-index="${index}" data-grade="${p.grade}">
      <div class="card-img">
        ${p.image
          ? `<img src="${p.image}" alt="${p.title}" loading="lazy"/>`
          : `<div class="card-img-placeholder">${p.emoji || '📐'}</div>`
        }
        <span class="card-grade-badge">${gradeLabel(p.grade)}</span>
      </div>

      <div class="card-body">
        <div class="card-tags">
          ${(p.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('')}
        </div>

        <h3 class="card-title">${p.title}</h3>
        <p class="card-desc">${p.cardDescription || p.description || ''}</p>

        <div class="card-footer">
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
  if (grade === 'oge') return 'ОГЭ';
  if (grade === 'ege') return 'ЕГЭ';
  if (!grade) return 'Разное';
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

      const filter = btn.dataset.filter;
      let filtered = allProducts;

      if (filter === 'free') {
        // Фильтр для бесплатных (цена 0 или отсутствует)
        filtered = allProducts.filter(p => !p.price || Number(p.price) === 0);
      } else if (filter !== 'all') {
        filtered = allProducts.filter(p => String(p.grade) === filter);
      }

      renderProducts(filtered);
      setTimeout(observeCards, 100);
    };
  });
}

// ===========================
// МОДАЛЬНЫЕ ОКНА И ОСТАЛЬНАЯ ЛОГИКА
// ===========================
// (Оставляем твой код initMobileMenu, observeCards, initDiplomaModal, initAnimatedCounters и логику галереи без изменений)

// ... [Здесь идет твой код функции openProductModal, closeProductModal, initMobileMenu, observeCards, initDiplomaModal, initAnimatedCounters и логика галереи (IIFE)] ...
