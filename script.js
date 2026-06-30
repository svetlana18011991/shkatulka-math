// ===========================
// ЗАГРУЗКА И РЕНДЕР ТОВАРОВ
// ===========================

let allProducts = [];
let currentProducts = [];

async function loadProducts() {
  try {
    const response = await fetch('products.json');
    const data = await response.json();

    // ПРАВКА: если данные приходят в поле "items" (как делает админка), берем их, 
    // иначе используем данные как есть (для совместимости со старым форматом)
    const products = data.items || (Array.isArray(data) ? data : []);

    allProducts = products;
    currentProducts = products;

    renderProducts(products);
    initFilters();
    setTimeout(observeCards, 300);
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
    document.getElementById('productsGrid').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1">Ошибка при загрузке товаров.</p>';
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
          : `<div class="card-img-placeholder">📐</div>`
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
  return `${grade} класс`;
}

// ===========================
// ФИЛЬТРЫ, БУРГЕР, МОДАЛКИ И ТЕМА (ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ)
// ===========================

// ... (остальной твой код: initFilters, openProductModal, initMobileMenu, initThemeToggle и т.д.)
