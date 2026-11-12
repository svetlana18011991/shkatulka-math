/* Видеообзоры для товаров и редакторов. Данные загружаются из CMS (JSON). */
(function () {
  'use strict';

  function safeUrl(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    let value = raw.trim();
    if (value.startsWith('<')) {
      // Из HTML-кода вставки используется только адрес, не сам HTML.
      const doc = new DOMParser().parseFromString(value, 'text/html');
      value = doc.querySelector('iframe[src]')?.getAttribute('src') || '';
    }
    if (value.startsWith('//')) value = 'https:' + value;
    try {
      const url = new URL(value, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch (_) { return null; }
  }

  function embedUrl(url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let match;
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (/^[\w-]{11}$/.test(id || '')) return 'https://www.youtube-nocookie.com/embed/' + id;
    }
    if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];
      if (/^[\w-]{11}$/.test(id || '')) return 'https://www.youtube-nocookie.com/embed/' + id;
    }
    if (host === 'rutube.ru') {
      match = url.pathname.match(/^\/(?:video|play\/embed)\/([\w-]+)/);
      if (match) return 'https://rutube.ru/play/embed/' + match[1];
    }
    if (['vk.com', 'vkvideo.ru', 'm.vk.com', 'm.vkvideo.ru'].includes(host)) {
      const oid = url.searchParams.get('oid');
      const id = url.searchParams.get('id');
      const idFromPath = url.pathname.match(/video(-?\d+)_(\d+)/);
      const idFromZ = (url.searchParams.get('z') || '').match(/video(-?\d+)_(\d+)/);
      const pair = /^-?\d+$/.test(oid || '') && /^\d+$/.test(id || '')
        ? [oid, id] : (idFromPath || idFromZ)?.slice(1);
      if (pair) {
        const accessKey = url.searchParams.get('access_key');
        return 'https://vk.com/video_ext.php?oid=' + pair[0] + '&id=' + pair[1]
          + (accessKey && /^[\w-]+$/.test(accessKey) ? '&hash=' + encodeURIComponent(accessKey) : '');
      }
    }
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      match = url.pathname.match(/(?:video\/)?(\d+)/);
      if (match) return 'https://player.vimeo.com/video/' + match[1];
    }
    return null;
  }

  function collect(item) {
    if (!item || typeof item !== 'object') return [];
    const result = [];
    const add = (title, source) => {
      if (typeof source === 'string' && source.trim()) result.push({ title: String(title || '').trim(), source: source.trim() });
    };
    // Совместимость с уже созданными редакторами: одиночный видеообзор.
    add('', item.videoReview || item.videoReviewFile);
    if (Array.isArray(item.videoReviews)) {
      item.videoReviews.forEach(entry => {
        if (typeof entry === 'string') add('', entry);
        else if (entry) add(entry.title, entry.url || entry.file || entry.videoReview || entry.videoReviewFile);
      });
    }
    return result;
  }

  function createVideo(entry, index, multiple) {
    const url = safeUrl(entry.source);
    if (!url) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'site-video-review';
    if (entry.title || multiple) {
      const label = document.createElement('h4');
      label.className = 'site-video-review__title';
      label.textContent = entry.title || 'Видеообзор ' + (index + 1);
      wrapper.append(label);
    }
    const embed = embedUrl(url);
    if (embed) {
      const iframe = document.createElement('iframe');
      iframe.className = 'site-video-review__player';
      iframe.title = entry.title || 'Видеообзор';
      iframe.src = embed;
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      wrapper.append(iframe);
    } else if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
      const video = document.createElement('video');
      video.className = 'site-video-review__player';
      video.src = url.href;
      video.preload = 'metadata';
      video.controls = true;
      video.playsInline = true;
      wrapper.append(video);
    } else {
      const link = document.createElement('a');
      link.className = 'site-video-review__link';
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Смотреть видеообзор ↗';
      wrapper.append(link);
    }
    return wrapper;
  }

  function render(container, item) {
    if (!container) return false;
    // Удаление iframe и video останавливает звук при закрытии модального окна.
    container.replaceChildren();
    const entries = collect(item);
    let count = 0;
    entries.forEach((entry, index) => {
      const node = createVideo(entry, index, entries.length > 1);
      if (node) { container.append(node); count++; }
    });
    return count > 0;
  }

  window.SiteVideoReviews = { render, collect };
})();
