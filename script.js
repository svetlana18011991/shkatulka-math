// ===========================
// ЗАГРУЗКА И РЕНДЕР ТОВАРОВ
// ===========================

async function loadProducts() {
  try {
    const response = await fetch('products.json');
    const products = await response.json();
    renderProducts(products);
    initFilters(products);
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

  grid.innerHTML = products.map(p => `
    <div class="product-card" data-grade="${p.grade}">
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
        <p class="card-desc">${p.description}</p>
        <div class="card-footer">
          <span class="card-price">${p.price} ₽</span>
          <a href="${p.buyLink}" target="_blank" class="card-buy-btn">
            🛒 Купить
          </a>
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

let allProducts = [];

function initFilters(products) {
  allProducts = products;
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const filtered = filter === 'all'
        ? allProducts
        : allProducts.filter(p => String(p.grade) === filter);
      renderProducts(filtered);
    });
  });
}

// ===========================
// БУРГЕР МЕНЮ
// ===========================

const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobileNav');

burger.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});

// Закрываем при клике на ссылку
mobileNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileNav.classList.remove('open'));
});

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
// ЗАПУСК
// ===========================
loadProducts();
setTimeout(observeCards, 300);

const modal = document.getElementById('imgModal');
const modalImg = document.getElementById('modalImg');
const closeBtn = document.querySelector('#imgModal div');

document.querySelectorAll('.diploma-img').forEach(img=>{
  img.addEventListener('click', ()=>{
    modal.style.display='flex';
    modalImg.src=img.src;
  });
});

closeBtn.addEventListener('click', ()=>{
  modal.style.display='none';
});

modal.addEventListener('click',(e)=>{
  if(e.target===modal) modal.style.display='none';
});
