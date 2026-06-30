
// ===========================
// ЗАГРУЗКА И РЕНДЕР ТОВАРОВ
// ===========================

let allProducts = [];
let currentProducts = [];

async function loadProducts() {
  try {
    const response = await fetch('products.json');
    const products = await response.json();

    allProducts = products;
    currentProducts = products;

    renderProducts(products);
    initFilters();
    setTimeout(observeCards, 300);
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
    document.getElementById('productsGrid').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1">Товары загружаются...</p>';
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
          <span class="card-price">${p.price} ₽</span>

          <div class="card-actions">
            <button type="button" class="card-view-btn">Смотреть</button>
            <a href="${p.buyLink}" target="_blank" class="card-buy-btn" rel="noopener">
              🛒 Купить
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
// ФИЛЬТРЫ
// ===========================

function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');

  buttons.forEach(btn => {
    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const filtered = filter === 'all'
        ? allProducts
        : allProducts.filter(p => String(p.grade) === filter);

      renderProducts(filtered);
      setTimeout(observeCards, 100);
    };
  });
}


// ===========================
// МОДАЛЬНОЕ ОКНО ТОВАРА + КАРУСЕЛЬ
// ===========================

let productGalleryImages = [];
let productGalleryIndex = 0;

function openProductModal(product) {
  let modal = document.getElementById('productModal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'productModal';
    modal.className = 'product-modal';

    modal.innerHTML = `
      <div class="product-modal-window">
        <button type="button" class="product-modal-close" aria-label="Закрыть">×</button>

        <div class="product-modal-image">
          <button type="button" class="product-gallery-arrow product-gallery-prev" aria-label="Предыдущее фото">‹</button>
          <img id="productModalImg" alt="">
          <button type="button" class="product-gallery-arrow product-gallery-next" aria-label="Следующее фото">›</button>
          <div class="product-gallery-dots" id="productGalleryDots"></div>
        </div>

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

    modal.addEventListener('click', e => {
      if (e.target === modal) closeProductModal();
    });

    modal.querySelector('.product-modal-close').addEventListener('click', closeProductModal);

    modal.querySelector('.product-gallery-prev').addEventListener('click', e => {
      e.stopPropagation();
      showProductGalleryImage(productGalleryIndex - 1);
    });

    modal.querySelector('.product-gallery-next').addEventListener('click', e => {
      e.stopPropagation();
      showProductGalleryImage(productGalleryIndex + 1);
    });
  }

  productGalleryImages = Array.isArray(product.gallery) && product.gallery.length
    ? product.gallery
    : [product.image].filter(Boolean);

  productGalleryIndex = 0;

  modal.querySelector('#productModalTitle').textContent = product.title || '';
  modal.querySelector('#productModalDesc').textContent = product.description || '';
  modal.querySelector('#productModalInsideTitle').textContent = product.insideTitle || 'Что внутри:';
  modal.querySelector('#productModalList').innerHTML =
    (product.inside || []).map(item => `<li>${item}</li>`).join('');
  modal.querySelector('#productModalPrice').textContent = `${product.price} ₽`;
  modal.querySelector('#productModalBuy').href = product.buyLink || '#';

  const dots = modal.querySelector('#productGalleryDots');
  dots.innerHTML = productGalleryImages.map((_, i) =>
    `<button type="button" class="product-gallery-dot" data-gallery-index="${i}" aria-label="Фото ${i + 1}"></button>`
  ).join('');

  dots.querySelectorAll('.product-gallery-dot').forEach(dot => {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      showProductGalleryImage(Number(dot.dataset.galleryIndex));
    });
  });

  modal.querySelectorAll('.product-gallery-arrow').forEach(arrow => {
    arrow.style.display = productGalleryImages.length > 1 ? 'flex' : 'none';
  });
  dots.style.display = productGalleryImages.length > 1 ? 'flex' : 'none';

  showProductGalleryImage(0);

  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function showProductGalleryImage(index) {
  if (!productGalleryImages.length) return;

  if (index < 0) index = productGalleryImages.length - 1;
  if (index >= productGalleryImages.length) index = 0;

  productGalleryIndex = index;

  const modal = document.getElementById('productModal');
  if (!modal) return;

  const img = modal.querySelector('#productModalImg');
  img.src = productGalleryImages[productGalleryIndex];
  img.alt = `Фото товара ${productGalleryIndex + 1}`;

  modal.querySelectorAll('.product-gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === productGalleryIndex);
  });
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

document.addEventListener('keydown', e => {
  const modal = document.getElementById('productModal');
  if (!modal || !modal.classList.contains('open')) return;

  if (e.key === 'Escape') closeProductModal();
  if (e.key === 'ArrowLeft') showProductGalleryImage(productGalleryIndex - 1);
  if (e.key === 'ArrowRight') showProductGalleryImage(productGalleryIndex + 1);
});

document.addEventListener('click', e => {
  const viewBtn = e.target.closest('.card-view-btn');
  if (!viewBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const card = viewBtn.closest('.product-card');
  const product = currentProducts[Number(card.dataset.index)];

  if (product) openProductModal(product);
});


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
    img.onclick = () => {
      modal.style.display = 'flex';
      modalImg.src = img.src;
    };
  });

  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  modal.onclick = e => {
    if (e.target === modal) modal.style.display = 'none';
  };
}

// ===========================
// ЗАПУСК
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initDiplomaModal();
  loadProducts();
});
