
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
      e.preventDefault();
      e.stopPropagation();
      showProductGalleryImage(productGalleryIndex - 1);
    });

    modal.querySelector('.product-gallery-next').addEventListener('click', e => {
      e.preventDefault();
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
      e.preventDefault();
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
  if (!card) return;

  const product = currentProducts[Number(card.dataset.index)];
  if (product) openProductModal(product);
}, true);


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




// =========================================================
// ОБНОВЛЕНИЯ: счётчики, тёмная тема, плавающая геометрия
// =========================================================

function initThemeToggle() {
  if (document.querySelector('.theme-toggle')) return;

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Переключить тему');

  const savedTheme = localStorage.getItem('site-theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }

  btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    btn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('site-theme', isDark ? 'dark' : 'light');
  });

  document.body.appendChild(btn);
}

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

    // Диапазоны вроде 5–11 не трогаем, чтобы не исказить смысл.
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

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = original;
        el.classList.remove('counting');
      }
    };

    requestAnimationFrame(tick);
  };

  const observerCounters = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) animateCounter(entry.target);
    });
  }, { threshold: 0.55 });

  counters.forEach(el => observerCounters.observe(el));
}

function initFloatingGeometry() {
  if (document.querySelector('.floating-geometry')) return;

  const layer = document.createElement('div');
  layer.className = 'floating-geometry';
  layer.innerHTML = `
    <span class="geo-item">△</span>
    <span class="geo-item">x²</span>
    <span class="geo-item">π</span>
    <span class="geo-item">∑</span>
    <span class="geo-item">√</span>
  `;
  document.body.prepend(layer);

  window.addEventListener('scroll', () => {
    const y = window.scrollY * 0.08;
    layer.style.transform = `translateY(${y}px)`;
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initAnimatedCounters();
  initFloatingGeometry();
});


// FORCE_VISIBLE_EFFECTS_UPDATE_2026
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    // Переключатель темы — создаём принудительно, если его нет
    let themeBtn = document.querySelector('.theme-toggle');
    if (!themeBtn) {
      themeBtn = document.createElement('button');
      themeBtn.className = 'theme-toggle';
      themeBtn.type = 'button';
      themeBtn.setAttribute('aria-label', 'Переключить тему');
      document.body.appendChild(themeBtn);
    }

    const savedTheme = localStorage.getItem('site-theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }

    themeBtn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';

    themeBtn.onclick = function () {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      themeBtn.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('site-theme', isDark ? 'dark' : 'light');
    };

    // Плавающая геометрия — создаём принудительно, если её нет
    let geo = document.querySelector('.floating-geometry');
    if (!geo) {
      geo = document.createElement('div');
      geo.className = 'floating-geometry';
      geo.innerHTML = `
        <span class="geo-item">△</span>
        <span class="geo-item">x²</span>
        <span class="geo-item">π</span>
        <span class="geo-item">∑</span>
        <span class="geo-item">√</span>
      `;
      document.body.prepend(geo);
    }

    window.addEventListener('scroll', function () {
      geo.style.transform = 'translateY(' + (window.scrollY * 0.08) + 'px)';
    }, { passive: true });
  });
})();


// STRONG_DARK_GEO_FIX_2026
(function () {
  function runStrongGeoFix() {
    let geo = document.querySelector('.floating-geometry');

    if (!geo) {
      geo = document.createElement('div');
      geo.className = 'floating-geometry';
      document.body.prepend(geo);
    }

    geo.innerHTML = `
      <span class="geo-item">△</span>
      <span class="geo-item">x²</span>
      <span class="geo-item">π</span>
      <span class="geo-item">∑</span>
      <span class="geo-item">√</span>
      <span class="geo-item">∠</span>
      <span class="geo-item">y=kx+b</span>
    `;

    window.addEventListener('scroll', function () {
      geo.style.transform = 'translateY(' + (window.scrollY * 0.07) + 'px)';
    }, { passive: true });

    // Если тёмная тема уже включена, принудительно убираем фоновую картинку hero инлайном.
    function refreshDarkHero() {
      const hero = document.querySelector('.hero');
      if (!hero) return;

      if (document.body.classList.contains('dark-theme')) {
        hero.style.backgroundImage = 'none';
        hero.style.background = 'radial-gradient(circle at 18% 18%, rgba(255,138,61,0.18), transparent 32%), radial-gradient(circle at 88% 18%, rgba(255,179,92,0.12), transparent 34%), linear-gradient(135deg, #10101a 0%, #171726 55%, #0d0d16 100%)';
      } else {
        hero.style.backgroundImage = '';
        hero.style.background = '';
      }
    }

    refreshDarkHero();

    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        setTimeout(refreshDarkHero, 30);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStrongGeoFix);
  } else {
    runStrongGeoFix();
  }
})();


// =========================================================
// ФИНАЛЬНЫЙ ФИКС: без геометрии, стабильная тёмная тема
// =========================================================
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function applyHeroDarkState() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    if (document.body.classList.contains('dark-theme')) {
      hero.style.backgroundImage = 'none';
      hero.style.background = 'radial-gradient(circle at 20% 20%, rgba(255,138,61,0.16), transparent 34%), radial-gradient(circle at 85% 15%, rgba(255,179,92,0.10), transparent 36%), linear-gradient(135deg, #10101a 0%, #171726 55%, #0d0d16 100%)';
      hero.style.backgroundColor = '#10101a';
    } else {
      hero.style.backgroundImage = '';
      hero.style.background = '';
      hero.style.backgroundColor = '';
    }
  }

  ready(function () {
    // Удаляем геометрию/формулы, если они уже были созданы прежним кодом.
    document.querySelectorAll('.floating-geometry, .geo-item').forEach(el => el.remove());

    // Пересоздаём переключатель темы чисто, чтобы не было старых конфликтующих обработчиков.
    document.querySelectorAll('.theme-toggle').forEach(el => el.remove());

    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Переключить тему');

    const savedTheme = localStorage.getItem('site-theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }

    btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';

    btn.addEventListener('click', function () {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      btn.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('site-theme', isDark ? 'dark' : 'light');
      applyHeroDarkState();
    });

    document.body.appendChild(btn);
    applyHeroDarkState();

    // На всякий случай ещё раз убираем, если старый код создаст геометрию после загрузки.
    setTimeout(function () {
      document.querySelectorAll('.floating-geometry, .geo-item').forEach(el => el.remove());
    }, 200);
  });
})();
