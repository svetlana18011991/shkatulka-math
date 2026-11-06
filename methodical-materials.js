/* Методическая копилка: архивы из methodical-materials.json.
   Новые пятиминутки: category=pyatiminutki, section=algebra|geometry|other, variantNumber=1,2,3... */
(function () {
  'use strict';
  function safeLink(value) {
    if (typeof value !== 'string') return '';
    var v=value.trim();
    if (!v || /^(?:[a-z]+:)?\/\//i.test(v) || v[0]==='/' || /^(?:javascript|data|vbscript):/i.test(v) || /[<>"']/.test(v)) return '';
    return v;
  }
  function el(tag,cls,content) {
    var x=document.createElement(tag);
    if(cls)x.className=cls;
    if(content!=null)x.textContent=String(content);
    return x;
  }
  function icon(parent,name) {
    var i=el('i','fa-solid fa-'+name);
    i.setAttribute('aria-hidden','true');
    parent.appendChild(i);
  }
  function sectionFor(m) { // existing records lacking section retain their former placement
    return ['algebra','geometry','other'].includes(m.section)?m.section:'algebra';
  }
  function numberFor(m) {
    var n=Number(m.variantNumber);
    if(Number.isSafeInteger(n)&&n>0)return n;
    var id=String(m.id||'');
    var match=id.match(/(?:variant|вариант)[-_ ]?(\d+)/i);
    return match?Number(match[1]):null;
  }
  function detailLink(m){return safeLink(m.pageUrl)||('material.html?id='+encodeURIComponent(m.id||''));}
  function makeRow(m){
    var section=sectionFor(m),number=numberFor(m),label=number?'Вариант '+number:(m.title||'Без номера');
    var row=el('article','oge-list-row');row.setAttribute('role','listitem');
    var titleBlock=el('div','oge-list-row__title');
    var title=el('a',null,label);title.href=detailLink(m);titleBlock.appendChild(title);
    titleBlock.appendChild(el('small',null,({'algebra':'Алгебра','geometry':'Геометрия','other':'Разное'})[section]+' · ОГЭ'));
    row.appendChild(titleBlock);
    row.appendChild(el('p','oge-list-row__description',m.description||'Короткая тренировочная работа для подготовки к ОГЭ.'));
    var actions=el('div','oge-list-row__actions');
    var details=el('a','oge-list-row__detail','Подробнее');details.href=detailLink(m);actions.appendChild(details);
    var file=safeLink(m.downloadFile);
    if(file){var btn=el('a','oge-list-row__download');btn.href=file;btn.download='';btn.setAttribute('aria-label','Скачать архив: '+({'algebra':'Алгебра','geometry':'Геометрия','other':'Разное'})[section]+', '+label.toLowerCase());icon(btn,'download');btn.appendChild(document.createTextNode(' Скачать архив'));actions.appendChild(btn);}
    row.appendChild(actions);return row;
  }
  function renderFiveminutes(items){
    ['algebra','geometry','other'].forEach(function(section){
      var list=document.querySelector('[data-material-group="'+section+'"]');if(!list)return;
      var selected=items.filter(function(m){return m && m.category==='pyatiminutki' && sectionFor(m)===section;});
      // Order by independently assigned variant number, not by publication order.
      selected.sort(function(a,b){return (numberFor(a)||Number.MAX_SAFE_INTEGER)-(numberFor(b)||Number.MAX_SAFE_INTEGER);});
      if(!selected.length){if(!list.querySelector('.oge-list-empty'))list.replaceChildren(el('p','oge-list-empty','Пока нет опубликованных вариантов.'));return;}
      var rows=selected.map(makeRow);
      list.replaceChildren.apply(list,rows);
    });
  }
  function makeCard(m){
    var card=el('article','kopilka-material-card');
    var badge=el('span','kopilka-pill','ОГЭ · Тренировочный вариант · Бесплатно');card.appendChild(badge);
    var body=el('div','kopilka-material-card__body');
    var heading=el('h3');var link=el('a',null,m.title||'Материал');link.href=detailLink(m);heading.appendChild(link);body.appendChild(heading);
    body.appendChild(el('p',null,m.description||''));card.appendChild(body);
    var actions=el('div','kopilka-material-card__actions'),btn=el('a','btn btn-outline','Подробнее');btn.href=detailLink(m);actions.appendChild(btn);
    var file=safeLink(m.downloadFile);
    if(file){var dl=el('a','btn btn-primary');dl.href=file;dl.download='';icon(dl,'download');dl.appendChild(document.createTextNode(' Скачать архив'));actions.appendChild(dl);}
    card.appendChild(actions);return card;
  }
  function renderFullVariants(items){
    var list=document.querySelector('[data-material-list="varianty"]');if(!list)return;
    var selected=items.filter(function(m){return m&&m.category==='varianty';});
    if(!selected.length)return;
    list.replaceChildren.apply(list,selected.map(makeCard));
  }
  function renderDetail(items){
    var root=document.getElementById('methodical-detail');if(!root)return;
    var id=new URLSearchParams(window.location.search).get('id');
    var m=items.find(function(x){return x&&x.id===id;});
    if(!m){root.replaceChildren(el('h1',null,'Материал не найден'));var back=el('a','btn btn-primary','Вернуться в копилку');back.href='kopilka.html';root.appendChild(back);return;}
    root.replaceChildren();
    root.appendChild(el('span','kopilka-pill',m.category==='varianty'?'Тренировочный вариант ОГЭ':'Пятиминутка ОГЭ · '+({'algebra':'Алгебра','geometry':'Геометрия','other':'Разное'})[sectionFor(m)]));
    root.appendChild(el('h1',null,m.title||'Материал'));
    root.appendChild(el('p','kopilka-detail-lead',m.description||''));
    var comp=Array.isArray(m.composition)?m.composition:[];
    if(comp.length){root.appendChild(el('h2','kopilka-detail-subheading','В архиве'));var ul=el('ul','kopilka-composition');comp.forEach(function(t){ul.appendChild(el('li',null,typeof t==='string'?t:(t&&t.entry)||''));});root.appendChild(ul);}
    var actions=el('div','kopilka-detail-actions'),file=safeLink(m.downloadFile);
    if(file){var dl=el('a','btn btn-primary','Скачать архив бесплатно');dl.href=file;dl.download='';actions.appendChild(dl);}
    var back=el('a','btn btn-outline','К списку пятиминуток');back.href=m.category==='varianty'?'kopilka.html#varianty':'pyatiminutki-oge.html#'+sectionFor(m);actions.appendChild(back);root.appendChild(actions);
    document.title=(m.title||'Материал')+' — Методическая копилка | Шкатулка';
    var desc=document.querySelector('meta[name="description"]');if(desc)desc.content=m.description||'';
    var canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href='https://shkatulka.sistema-math.ru/material.html?id='+encodeURIComponent(m.id);
  }
  fetch('methodical-materials.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Materials unavailable');return r.json();}).then(function(payload){
    var items=Array.isArray(payload.items)?payload.items:[];
    renderFiveminutes(items);renderFullVariants(items);renderDetail(items);
  }).catch(function(err){console.warn('Методическая копилка: '+err.message);});
})();
