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

  function getEmbedUrl(input) {
    let value = String(input || '').trim();
    // Поддерживается и скопированный код iframe: берётся только src, не HTML.
    if (value.startsWith('<')) {
      const parsed = new DOMParser().parseFromString(value,'text/html');
      value = parsed.querySelector('iframe[src]')?.getAttribute('src') || '';
      if (value.startsWith('//')) value = 'https:' + value;
    }
    const url = safeUrl(value);
    if (!url) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./,'');
    let match;
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (/^[\w-]{11}$/.test(id || '')) return 'https://www.youtube-nocookie.com/embed/' + id;
    }
    if (['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)) {
      let id = url.searchParams.get('v');
      if (!id) {
        match = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
        id = match?.[1];
      }
      if (/^[\w-]{11}$/.test(id || '')) return 'https://www.youtube-nocookie.com/embed/' + id;
    }
    if (host === 'rutube.ru') {
      match = url.pathname.match(/^\/(?:video|play\/embed)\/([\w-]+)/);
      if (match) return 'https://rutube.ru/play/embed/' + match[1];
    }
    if (['vk.com','vkvideo.ru','m.vk.com','m.vkvideo.ru'].includes(host)) {
      const oid = url.searchParams.get('oid');
      const id = url.searchParams.get('id');
      if (/^-?\d+$/.test(oid || '') && /^\d+$/.test(id || ''))
        return 'https://vk.com/video_ext.php?oid=' + oid + '&id=' + id;
      match = url.pathname.match(/video(-?\d+)_(\d+)/);
      if (match) return 'https://vk.com/video_ext.php?oid=' + match[1] + '&id=' + match[2];
    }
    if (host === 'player.vimeo.com' || host === 'vimeo.com') {
      match = url.pathname.match(/(?:video\/)?(\d+)/);
      if (match) return 'https://player.vimeo.com/video/' + match[1];
    }
    return null;
  }

  function showVideo(item) {
    videoBody.replaceChildren(); // останавливает воспроизведение при смене или закрытии
    videoSection.hidden = true;
    const input = String(item.videoReview || '').trim() || String(item.videoReviewFile || '').trim();
    if (!input) return;
    let videoUrl = input;
    if (videoUrl.startsWith('<')) {
      const parsed = new DOMParser().parseFromString(videoUrl,'text/html');
      videoUrl = parsed.querySelector('iframe[src]')?.getAttribute('src') || '';
      if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
    }
    const url = safeUrl(videoUrl);
    const embed = getEmbedUrl(input);
    if (embed) {
      const frame = document.createElement('iframe');
      frame.src = embed;
      frame.title = 'Видеообзор редактора';
      frame.loading = 'lazy';
      frame.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      videoBody.append(frame);
    } else if (url && /\.(mp4|webm|ogg)(?:$|[?#])/i.test(url.pathname)) {
      const player = document.createElement('video');
      player.src = url.href;
      player.controls = true;
      player.preload = 'metadata';
      player.playsInline = true;
      videoBody.append(player);
    } else if (url) {
      const link = makeElement('a',null,'Смотреть видеообзор по ссылке ↗');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      videoBody.append(link);
    } else return;
    videoSection.hidden = false;
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
