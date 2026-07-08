
(function () {
  function slugify(text) {
    const map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
    let slug = String(text || 'material').trim().toLowerCase().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
    return slug.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'material';
  }

  function isPaidProduct(product) {
    return Number(product && product.price ? product.price : 0) > 0;
  }

  function hasFileForDownload(product) {
    return Boolean(String(product && product.downloadFile ? product.downloadFile : '').trim());
  }

  function linkify(text) {
    const safe = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return safe
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  function gradeLabel(grade) {
    if (!grade) return '';
    const g = Array.isArray(grade) ? grade.join(', ') : String(grade);
    return g.replace('oge', 'ОГЭ').replace('ege', 'ЕГЭ');
  }

  function normalizeGallery(product) {
    if (Array.isArray(product.gallery) && product.gallery.length) {
      return product.gallery.map(item => item && item.media ? item.media : item).filter(Boolean);
    }
    return [product.image].filter(Boolean);
  }

  function updateSeo(product) {
    const title = product.title || 'Материал';
    document.title = title + ' — Шкатулка математических интерактивов';

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const desc = String(product.description || '').replace(/\s+/g, ' ').trim().slice(0, 165);
    meta.setAttribute('content', desc || 'Готовый материал для урока математики из каталога Шкатулки математических интерактивов.');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', location.origin + location.pathname + '?id=' + encodeURIComponent(slugify(title)));
  }


  function productPageUrl(product) {
    return 'product.html?id=' + encodeURIComponent(slugify(product && product.title ? product.title : 'material'));
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
    return String(value || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  }

  function commonCount(a, b) {
    const set = new Set(a);
    return b.filter(x => set.has(x)).length;
  }

  function findRelatedProducts(product, products, limit) {
    const currentSlug = slugify(product.title || '');
    const currentTags = normalizeList(product.tags);
    const currentGrades = normalizeList(product.grade);

    return (products || [])
      .filter(item => item && slugify(item.title || '') !== currentSlug)
      .map(item => {
        const itemTags = normalizeList(item.tags);
        const itemGrades = normalizeList(item.grade);
        const tagMatches = commonCount(currentTags, itemTags);
        const gradeMatches = commonCount(currentGrades, itemGrades);
        return {
          product: item,
          score: tagMatches * 3 + gradeMatches * 2
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit || 3)
      .map(item => item.product);
  }

  function renderRelatedCard(product) {
    const isPaid = isPaidProduct(product);
    const hasDownload = hasFileForDownload(product);
    const priceText = isPaid ? product.price + ' ₽' : 'Бесплатно';
    const img = product.image
      ? `<img src="${product.image}" alt="${product.title || 'Материал'}" loading="lazy">`
      : `<div class="card-img-placeholder">${product.emoji || '📐'}</div>`;
    return `
      <article class="product-card product-card-simple product-related-card">
        <a class="card-img card-img-link" href="${productPageUrl(product)}">
          ${img}
          <span class="card-grade-badge">${gradeLabel(product.grade)}</span>
        </a>
        <div class="card-body card-body-simple">
          <h3 class="card-title card-title-simple"><a class="card-title-link" href="${productPageUrl(product)}">${product.title || ''}</a></h3>
          <div class="card-footer card-footer-simple">
            <span class="card-price">${priceText}</span>
            <div class="card-actions ${!isPaid ? 'card-actions-free' : ''} ${!isPaid && !hasDownload ? 'card-actions-free-single' : ''}">
              <a href="${productPageUrl(product)}" class="card-details-btn">Подробнее</a>
            </div>
          </div>
        </div>
      </article>

      ${related.length ? `
        <section class="product-related-section">
          <div class="section-header product-related-header">
            <p class="section-label">Можно посмотреть ещё</p>
            <h2 class="section-title">Похожие материалы</h2>
          </div>
          <div class="products-grid product-related-grid">
            ${related.map(renderRelatedCard).join('')}
          </div>
        </section>
      ` : ''}
    `;
  }


  function render(product, products) {
    const root = document.getElementById('productPageRoot');
    if (!root) return;

    updateSeo(product);

    const gallery = normalizeGallery(product);
    const isPaid = isPaidProduct(product);
    const hasDownload = hasFileForDownload(product);
    const actionHref = isPaid ? (product.buyLink || '#') : (hasDownload ? product.downloadFile : '');
    const actionText = isPaid ? 'Купить' : (hasDownload ? 'Скачать' : '');
    const inside = Array.isArray(product.inside) ? product.inside : [];
    const related = findRelatedProducts(product, products || [], 3);

    root.innerHTML = `
      <article class="product-page-card">
        <div class="product-page-gallery">
          <div class="product-page-main-img-wrap">
            ${gallery[0] ? `<img id="productPageMainImg" class="product-page-main-img" src="${gallery[0]}" alt="${product.title || 'Материал'}">` : `<div class="product-page-placeholder">📐</div>`}
          </div>
          ${gallery.length > 1 ? `
            <div class="product-page-thumbs">
              ${gallery.map((src, i) => `<button type="button" class="product-page-thumb ${i === 0 ? 'active' : ''}" data-src="${src}"><img src="${src}" alt="Фото материала ${i + 1}"></button>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="product-page-info">
          <p class="section-label">${gradeLabel(product.grade) || 'Материал'}</p>
          <h1 class="section-title product-page-title">${product.title || ''}</h1>
          <div class="product-page-desc">${linkify(product.description || '')}</div>

          ${inside.length ? `
            <div class="product-page-inside">
              <h2>Что внутри</h2>
              <ul>${inside.map(item => `<li>${linkify(item)}</li>`).join('')}</ul>
            </div>
          ` : ''}

          <div class="product-page-bottom">
            <div class="product-page-price">${isPaid ? product.price + ' ₽' : 'Бесплатно'}</div>
            ${actionHref ? `<a class="btn btn-primary product-page-action" href="${actionHref}" target="_blank" rel="noopener">${actionText}</a>` : ''}
          </div>
        </div>
      </article>
    `;

    document.querySelectorAll('.product-page-thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const img = document.getElementById('productPageMainImg');
        if (img) img.src = btn.dataset.src;
        document.querySelectorAll('.product-page-thumb').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function renderNotFound() {
    const root = document.getElementById('productPageRoot');
    if (!root) return;
    root.innerHTML = `
      <div class="product-page-notfound">
        <h1>Материал не найден</h1>
        <p>Возможно, ссылка устарела или материал был переименован.</p>
        <a class="btn btn-primary" href="catalog.html">Вернуться в каталог</a>
      </div>
    `;
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '';
    const indexParam = params.get('index');

    try {
      const response = await fetch('products.json?t=' + Date.now());
      const data = await response.json();
      const products = data.items || (Array.isArray(data) ? data : []);

      let product = null;
      if (indexParam !== null && products[Number(indexParam)]) {
        product = products[Number(indexParam)];
      } else {
        product = products.find(p => slugify(p.title) === id);
      }

      if (!product) {
        const n = Number(id);
        if (!Number.isNaN(n) && products[n]) product = products[n];
      }

      if (product) render(product, products);
      else renderNotFound();
    } catch (e) {
      renderNotFound();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
