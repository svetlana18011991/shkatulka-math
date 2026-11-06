/* Материалы методической копилки. Данные: methodical-materials.json */
(function () {
  'use strict';
  var safeLink = function (value) {
    if (typeof value !== 'string') return '';
    var v = value.trim();
    if (!v || /^(?:[a-z]+:)?\/\//i.test(v) || v.startsWith('/') || /^(?:javascript|data|vbscript):/i.test(v)) return '';
    return v;
  };
  function el(tag, cls, content) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (content != null) x.textContent = content;
    return x;
  }
  function appendIcon(parent, name) {
    var i=el('i','fa-solid fa-'+name); i.setAttribute('aria-hidden','true'); parent.appendChild(i);
  }
  function makeCard(m) {
    var card=el('article','kopilka-material-card');
    var icon=el('div','kopilka-material-card__icon'); appendIcon(icon,'file-zipper');card.appendChild(icon);
    var body=el('div','kopilka-material-card__body');
    var badge=el('span','kopilka-pill',m.category==='varianty'?'ОГЭ · Тренировочный вариант · Бесплатно':'ОГЭ · Алгебра · Бесплатно');body.appendChild(badge);
    var title=el('h3'),link=el('a',null,m.title||'Материал');
    var detail=safeLink(m.pageUrl)||('material.html?id='+encodeURIComponent(m.id||''));
    link.href=detail;title.appendChild(link);body.appendChild(title);
    body.appendChild(el('p',null,m.description||''));
    var info=el('div','kopilka-file-info');
    var comps=Array.isArray(m.composition)?m.composition:[];
    comps.forEach(function(v){ info.appendChild(el('span',null,typeof v==='string'?v:(v && v.entry)||'')); });
    body.appendChild(info);card.appendChild(body);
    var actions=el('div','kopilka-material-card__actions');
    var infoButton=el('a','btn btn-outline','Подробнее');infoButton.href=detail;actions.appendChild(infoButton);
    var download=safeLink(m.downloadFile);
    if (download) {
      var btn=el('a','btn btn-primary');btn.href=download;btn.download='';appendIcon(btn,'download');btn.appendChild(document.createTextNode(' Скачать архив'));actions.appendChild(btn);
    }
    card.appendChild(actions);return card;
  }
  function renderLists(items) {
    ['pyatiminutki','varianty'].forEach(function(cat){
      var list=document.querySelector('[data-material-list="'+cat+'"]');if(!list) return;
      var matches=items.filter(function(x){return x && x.category===cat;});
      list.replaceChildren();
      if (!matches.length){list.appendChild(el('p','kopilka-empty','Раздел готов к пополнению. Материалы появятся здесь после публикации.'));return;}
      matches.forEach(function(x){list.appendChild(makeCard(x));});
    });
  }
  function renderDetail(items) {
    var root=document.getElementById('methodical-detail');if(!root) return;
    var id=new URLSearchParams(window.location.search).get('id');
    var m=items.find(function(x){return x&&x.id===id;});
    if(!m){root.replaceChildren(el('h1',null,'Материал не найден'));var a=el('a','btn btn-primary','Вернуться в копилку');a.href='kopilka.html';root.appendChild(a);return;}
    root.replaceChildren();
    root.appendChild(el('span','kopilka-pill',m.category==='varianty'?'Тренировочный вариант ОГЭ':'Пятиминутка ОГЭ'));
    root.appendChild(el('h1',null,m.title||'Материал'));
    root.appendChild(el('p','kopilka-detail-lead',m.description||''));
    var comp=Array.isArray(m.composition)?m.composition:[];
    if(comp.length){root.appendChild(el('h2','kopilka-detail-subheading','В архиве'));var ul=el('ul','kopilka-composition');comp.forEach(function(t){ul.appendChild(el('li',null,typeof t==='string'?t:(t&&t.entry)||''));});root.appendChild(ul);}
    var btns=el('div','kopilka-detail-actions'),file=safeLink(m.downloadFile);
    if(file){var a=el('a','btn btn-primary','Скачать архив бесплатно');a.href=file;a.download='';btns.appendChild(a);}
    var back=el('a','btn btn-outline','Все материалы');back.href='kopilka.html';btns.appendChild(back);root.appendChild(btns);
    document.title=(m.title||'Материал')+' — Методическая копилка | Шкатулка';
    var desc=document.querySelector('meta[name="description"]');if(desc)desc.content=m.description||'';
    var canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href='https://shkatulka.sistema-math.ru/material.html?id='+encodeURIComponent(m.id);
  }
  fetch('methodical-materials.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Materials unavailable');return r.json();}).then(function(payload){
    var items=Array.isArray(payload.items)?payload.items:[];
    renderLists(items);renderDetail(items);
  }).catch(function(err){console.warn('Методическая копилка: '+err.message);});
})();
