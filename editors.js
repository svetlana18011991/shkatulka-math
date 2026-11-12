/* Обучение и инструменты — каталог редакторов. Все карточки читаются из editors.json. */
(function () {
  'use strict';
  const grid = document.getElementById('editorsGrid');
  const modal = document.getElementById('editorModal');
  if (!grid || !modal) return;

  const modalWindow = modal.querySelector('.editor-modal__window');
  const cover = document.getElementById('editorModalCover');
  const title = document.getElementById('editorModalTitle');
  const description = document.getElementById('editorModalDescription');
  const priceEl = document.getElementById('editorModalPrice');
  const buy = document.getElementById('editorModalBuy');
  const coming = document.getElementById('editorModalComing');
  const videoSection = document.getElementById('editorModalVideo');
  const videoBody = document.getElementById('editorModalVideoBody');
  let restoreFocus = null;

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value.trim(), location.href);
      return (url.protocol === 'https:' || url.protocol === 'http:') ? url : null;
    } catch (_) { return null; }
  }

  function normalizedPrice(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function priceText(value) {
    const p = normalizedPrice(value);
    if (p === null) return '';
    return p === 0 ? 'Бесплатно' : new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
  }

  function makeImage(src, alt) {
    const url = safeUrl(src);
    if (!url) return null;
    const img = document.createElement('img');
    img.src = url.href;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.replaceWith(makePlaceholder()); }, { once:true });
    return img;
  }

  function makePlaceholder() {
    const span = document.createElement('span');
    span.className = 'editor-card__cover-placeholder';
    const icon = document.createElement('span');
    icon.className = 'editor-card__cover-emoji';
    icon.textContent = '🧩';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('small');
    label.textContent = 'Редактор игры';
    span.append(icon, label);
    return span;
  }

  function makeElement(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }

  function renderCards(items) {
    grid.replaceChildren();
    if (!items.length) {
      grid.append(makeElement('p', 'editors-status', 'Редакторы скоро появятся.'));
      return;
    }
    items.forEach(item => {
      if (!item || typeof item.title !== 'string' || !item.title.trim()) return;
      const article = makeElement('article', 'editor-card');
      const imageBox = makeElement('div', 'editor-card__cover');
      imageBox.append(makeImage(item.image, item.title) || makePlaceholder());
      const body = makeElement('div', 'editor-card__body');
      const tag = makeElement('span','editor-card__eyebrow','Редактор игры');
      const heading = makeElement('h3',null,item.title);
      const short = String(item.description || '').trim();
      const excerpt = short.length > 155 ? short.slice(0,152).trimEnd() + '…' : short;
      const descr = makeElement('p','editor-card__description', excerpt || 'Описание появится здесь.');
      const bottom = makeElement('div','editor-card__bottom');
      const cost = makeElement('span','editor-card__price',priceText(item.price) || 'Цена уточняется');
      if (!priceText(item.price)) cost.classList.add('editor-card__price--unknown');
      const more = makeElement('button','editor-card__more','Подробнее');
      more.type = 'button';
      more.setAttribute('aria-label', `Подробнее о редакторе «${item.title}»`);
      more.addEventListener('click', () => openModal(item));
      bottom.append(cost,more);
      body.append(tag,heading,descr,bottom);
      article.append(imageBox,body);
      grid.append(article);
    });
  }

  function showVideo(item) {
    videoSection.hidden = !window.SiteVideoReviews.render(videoBody, item);
    videoSection.querySelector('h3').textContent =
      window.SiteVideoReviews.collect(item).length > 1 ? 'Видеообзоры' : 'Видеообзор';
  }

  function openModal(item) {
    restoreFocus = document.activeElement;
    title.textContent = item.title;
    description.textContent = String(item.description || '').trim() || 'Описание появится здесь.';
    cover.replaceChildren(makeImage(item.image, item.title) || makePlaceholder());
    priceEl.textContent = priceText(item.price);
    const url = safeUrl(item.buyLink);
    buy.hidden = !url;
    coming.hidden = !!url;
    if (url) buy.href = url.href;
    else buy.removeAttribute('href');
    showVideo(item);
    modal.hidden = false;
    document.body.classList.add('editor-modal-open');
    modalWindow.focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('editor-modal-open');
    videoBody.replaceChildren();
    videoSection.hidden = true;
    if (restoreFocus && typeof restoreFocus.focus === 'function') restoreFocus.focus();
  }

  modal.querySelectorAll('[data-editor-close]').forEach(button => button.addEventListener('click',closeModal));
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    if (e.key === 'Tab') {
      const focusable = [...modalWindow.querySelectorAll('button:not([disabled]),a[href],video[controls],iframe')]
        .filter(el => !el.hidden && el.getClientRects().length);
      if (!focusable.length) { e.preventDefault(); modalWindow.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modalWindow)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  fetch('editors.json?v=2026-11-12', { cache:'no-store' })
    .then(response => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
    .then(data => renderCards(Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []))
    .catch(() => { grid.replaceChildren(makeElement('p','editors-status','Не удалось загрузить редакторы. Обновите страницу позже.')); });
})();
