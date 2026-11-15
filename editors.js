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
  const gallery = modal.querySelector('.editor-gallery');
  const zoom = document.getElementById('editorGalleryZoom');
  const previous = document.getElementById('editorGalleryPrev');
  const next = document.getElementById('editorGalleryNext');
  const counter = document.getElementById('editorGalleryCounter');
  const hint = document.getElementById('editorGalleryHint');
  const thumbnails = document.getElementById('editorGalleryThumbs');
  const lightbox = document.getElementById('editorLightbox');
  const lightboxImage = document.getElementById('editorLightboxImage');
  const lightboxPrevious = document.getElementById('editorLightboxPrev');
  const lightboxNext = document.getElementById('editorLightboxNext');
  const lightboxCounter = document.getElementById('editorLightboxCounter');
  const preloadedImages = new Map();
  let galleryImages = [];
  let galleryIndex = 0;
  let galleryTitle = '';
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

  function collectImages(item) {
    const images = [];
    const seen = new Set();
    const sources = [item.image, ...(Array.isArray(item.gallery) ? item.gallery : [])];
    sources.forEach(entry => {
      const source = typeof entry === 'string' ? entry : entry && (entry.media || entry.image || entry.src || entry.url);
      const url = safeUrl(source);
      if (!url || seen.has(url.href)) return;
      seen.add(url.href);
      images.push(url.href);
    });
    return images;
  }

  function updateLightbox() {
    lightboxImage.src = galleryImages[galleryIndex];
    lightboxImage.alt = `${galleryTitle} — изображение ${galleryIndex + 1} из ${galleryImages.length}`;
    lightboxCounter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
    lightboxPrevious.hidden = lightboxNext.hidden = galleryImages.length < 2;
  }

  function showImage(index) {
    if (!galleryImages.length) return;
    galleryIndex = (index + galleryImages.length) % galleryImages.length;
    const src = galleryImages[galleryIndex];
    const image = makeImage(src, `${galleryTitle} — изображение ${galleryIndex + 1} из ${galleryImages.length}`);
    zoom.disabled = true;
    hint.hidden = true;
    image.loading = 'eager';
    image.decoding = 'async';
    image.addEventListener('load', () => {
      if (!cover.contains(image)) return;
      zoom.disabled = false;
      hint.hidden = false;
    }, { once:true });
    cover.replaceChildren(image);
    counter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
    [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === galleryIndex)));
    const selected = thumbnails.children[galleryIndex];
    if (selected) thumbnails.scrollLeft = selected.offsetLeft - thumbnails.offsetLeft - (thumbnails.clientWidth - selected.offsetWidth) / 2;
    if (!lightbox.hidden) updateLightbox();
    // Соседние кадры готовы к следующему нажатию; видео загружает только метаданные.
    [galleryIndex - 1, galleryIndex + 1].forEach(position => {
      const source = galleryImages[(position + galleryImages.length) % galleryImages.length];
      if (preloadedImages.has(source)) return;
      const preload = new Image();
      preload.src = source;
      preloadedImages.set(source, preload);
    });
  }

  function renderGallery(item) {
    galleryImages = collectImages(item);
    galleryTitle = item.title;
    galleryIndex = 0;
    preloadedImages.clear();
    thumbnails.replaceChildren();
    previous.hidden = next.hidden = thumbnails.hidden = counter.hidden = galleryImages.length < 2;
    zoom.setAttribute('aria-label', `Увеличить изображение редактора «${item.title}»`);
    if (!galleryImages.length) {
      cover.replaceChildren(makePlaceholder());
      zoom.disabled = true;
      hint.hidden = true;
      counter.textContent = '';
      return;
    }
    if (galleryImages.length > 1) galleryImages.forEach((src, index) => {
      const button = makeElement('button', 'editor-gallery__thumb');
      button.type = 'button';
      button.setAttribute('aria-label', `Показать изображение ${index + 1} редактора «${item.title}»`);
      button.setAttribute('aria-pressed', 'false');
      button.append(makeImage(src, '') || makePlaceholder());
      button.addEventListener('click', () => showImage(index));
      thumbnails.append(button);
    });
    showImage(0);
  }

  function openLightbox() {
    if (zoom.disabled || !galleryImages.length) return;
    updateLightbox();
    lightbox.hidden = false;
    modalWindow.inert = true;
    lightbox.querySelector('.editor-lightbox__close').focus();
  }

  function closeLightbox(restore = true) {
    lightbox.hidden = true;
    modalWindow.inert = false;
    lightboxImage.removeAttribute('src');
    if (restore) {
      const target = !zoom.disabled ? zoom : thumbnails.querySelector('[aria-pressed="true"]') || modalWindow;
      target.focus({ preventScroll:true });
    }
  }

  function bindSwipe(element) {
    let start = null;
    element.addEventListener('touchstart', event => {
      start = event.touches.length === 1 ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null;
    }, { passive:true });
    element.addEventListener('touchcancel', () => { start = null; }, { passive:true });
    element.addEventListener('touchend', event => {
      if (!start || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      start = null;
      if (galleryImages.length > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        event.preventDefault();
        showImage(galleryIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive:false });
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
      const imageBox = makeElement('button', 'editor-card__cover');
      imageBox.type = 'button';
      imageBox.setAttribute('aria-label', `Подробнее о редакторе «${item.title}»`);
      imageBox.setAttribute('aria-haspopup', 'dialog');
      imageBox.setAttribute('aria-controls', 'editorModal');
      imageBox.addEventListener('click', event => openModal(item, event.currentTarget));
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
      more.addEventListener('click', event => openModal(item, event.currentTarget));
      bottom.append(cost,more);
      body.append(tag,heading,descr,bottom);
      article.append(imageBox,body);
      grid.append(article);
    });
  }

  function showVideo(item) {
    if (!window.SiteVideoReviews) { videoSection.hidden = true; return; }
    videoSection.hidden = !window.SiteVideoReviews.render(videoBody, item);
    videoSection.querySelector('h3').textContent =
      window.SiteVideoReviews.collect(item).length > 1 ? 'Видеообзоры' : 'Видеообзор';
  }

  function openModal(item, opener) {
    restoreFocus = opener || document.activeElement;
    title.textContent = item.title;
    description.textContent = String(item.description || '').trim() || 'Описание появится здесь.';
    renderGallery(item);
    priceEl.textContent = priceText(item.price);
    const url = safeUrl(item.buyLink);
    buy.hidden = !url;
    coming.hidden = !!url;
    if (url) buy.href = url.href;
    else buy.removeAttribute('href');
    showVideo(item);
    modal.hidden = false;
    document.body.classList.add('editor-modal-open');
    modalWindow.scrollTop = 0;
    modalWindow.focus({ preventScroll:true });
  }

  function closeModal() {
    if (modal.hidden) return;
    closeLightbox(false);
    modal.hidden = true;
    document.body.classList.remove('editor-modal-open');
    videoBody.replaceChildren();
    videoSection.hidden = true;
    if (restoreFocus && typeof restoreFocus.focus === 'function') restoreFocus.focus({ preventScroll:true });
  }

  previous.addEventListener('click', () => showImage(galleryIndex - 1));
  next.addEventListener('click', () => showImage(galleryIndex + 1));
  lightboxPrevious.addEventListener('click', () => showImage(galleryIndex - 1));
  lightboxNext.addEventListener('click', () => showImage(galleryIndex + 1));
  zoom.addEventListener('click', openLightbox);
  lightbox.querySelectorAll('[data-editor-zoom-close]').forEach(button => button.addEventListener('click', () => closeLightbox()));
  lightboxImage.addEventListener('error', () => { if (!lightbox.hidden) closeLightbox(); });
  bindSwipe(zoom);
  bindSwipe(lightboxImage);
  modal.querySelectorAll('[data-editor-close]').forEach(button => button.addEventListener('click',closeModal));
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!lightbox.hidden) closeLightbox();
      else closeModal();
      return;
    }
    const activeDialog = lightbox.hidden ? modalWindow : lightbox;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey &&
        (!lightbox.hidden || gallery.contains(e.target)) && !e.target.closest('video,iframe,input,textarea,select,[contenteditable]')) {
      e.preventDefault();
      showImage(galleryIndex + (e.key === 'ArrowRight' ? 1 : -1));
    }
    if (e.key === 'Tab') {
      const focusable = [...activeDialog.querySelectorAll('button:not([disabled]),a[href],video[controls],iframe')]
        .filter(el => !el.hidden && el.tabIndex >= 0 && el.getClientRects().length);
      if (!focusable.length) { e.preventDefault(); activeDialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!activeDialog.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === activeDialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  fetch('editors.json?v=editor-gallery-20261115', { cache:'no-store' })
    .then(response => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
    .then(data => renderCards(Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []))
    .catch(() => { grid.replaceChildren(makeElement('p','editors-status','Не удалось загрузить редакторы. Обновите страницу позже.')); });
})();
