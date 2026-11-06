/* Методическая копилка: загрузка публикаций из methodical-materials.json.
   ОГЭ: category=pyatiminutki | varianty, section=algebra|geometry|other.
   ЕГЭ: category=pyatiminutki-ege | varianty-ege, level=profile|basic,
        taskNumbers=["5","6","7"] (для пятиминуток), variantNumber=1,2...
*/
(function () {
  'use strict';
  function safeLink(value){
    if(typeof value!=='string')return '';
    var v=value.trim();
    if(!v || /^(?:[a-z]+:)?\/\//i.test(v) || v[0]==='/' || /^(?:javascript|data|vbscript):/i.test(v) || /[<>"']/.test(v) || /(?:^|\/)\.\.(?:\/|$)/.test(v))return '';
    return v;
  }
  function el(tag,cls,content){var x=document.createElement(tag);if(cls)x.className=cls;if(content!=null)x.textContent=String(content);return x;}
  function icon(parent,name){var i=el('i','fa-solid fa-'+name);i.setAttribute('aria-hidden','true');parent.appendChild(i);}
  function sectionFor(m){return ['algebra','geometry','other'].includes(m.section)?m.section:'algebra';}
  function numberFor(m){var n=Number(m.variantNumber);if(Number.isSafeInteger(n)&&n>0)return n;var id=String(m.id||''),match=id.match(/(?:variant|вариант)[-_ ]?(\d+)/i);return match?Number(match[1]):null;}
  function levelFor(m){return m.level==='basic'?'basic':m.level==='profile'?'profile':'unknown';}
  function levelLabel(level){return level==='profile'?'Профильный':level==='basic'?'Базовый':'Уровень не указан';}
  function taskNumbersFor(m){
    if(!Array.isArray(m.taskNumbers))return [];
    var out=[];
    m.taskNumbers.forEach(function(x){var n=Number(x);if(Number.isSafeInteger(n)&&n>=1&&n<=21&&!out.includes(n))out.push(n);});
    return out.sort(function(a,b){return a-b;});
  }
  function detailLink(m){return safeLink(m.pageUrl)||('material.html?id='+encodeURIComponent(m.id||''));}
  function makeRow(m,kind){
    var category=kind==='oge'?'ОГЭ':'ЕГЭ';
    var level=levelFor(m),section=sectionFor(m),number=numberFor(m),label=number?'Вариант '+number:(m.title||'Без номера');
    var row=el('article','oge-list-row');row.setAttribute('role','listitem');
    var titleBlock=el('div','oge-list-row__title');
    titleBlock.appendChild(el('strong',null,label));
    var sub=kind==='oge'?({'algebra':'Алгебра','geometry':'Геометрия','other':'Разное'})[section]+' · ОГЭ':'ЕГЭ · '+levelLabel(level);
    titleBlock.appendChild(el('small',null,sub));row.appendChild(titleBlock);
    var text=el('div','ege-row-content');
    text.appendChild(el('p','oge-list-row__description',m.description||'Тренировочный материал по математике.'));
    if(kind==='ege-five'){
      var nums=taskNumbersFor(m);
      if(nums.length){var tags=el('div','ege-result-tags');tags.setAttribute('aria-label','Номера заданий');nums.forEach(function(n){tags.appendChild(el('span',null,'№ '+n));});text.appendChild(tags);}
    }
    row.appendChild(text);
    var actions=el('div','oge-list-row__actions'),file=safeLink(m.downloadFile);
    if(file){var btn=el('a','oge-list-row__download');btn.href=file;btn.download='';btn.setAttribute('aria-label','Скачать архив: '+category+', '+label+', '+(kind==='oge'?sub:levelLabel(level)));icon(btn,'download');btn.appendChild(document.createTextNode(' Скачать архив'));actions.appendChild(btn);}
    row.appendChild(actions);return row;
  }
  function replaceList(node,rows,emptyText){
    if(!node)return;
    if(!rows.length){node.replaceChildren(el('p','oge-list-empty',emptyText));return;}
    node.replaceChildren.apply(node,rows);
  }
  function renderFiveminutes(items){
    ['algebra','geometry','other'].forEach(function(section){
      var node=document.querySelector('[data-material-group="'+section+'"]');if(!node)return;
      var chosen=items.filter(function(m){return m&&m.category==='pyatiminutki'&&sectionFor(m)===section;});
      chosen.sort(function(a,b){return (numberFor(a)||Number.MAX_SAFE_INTEGER)-(numberFor(b)||Number.MAX_SAFE_INTEGER);});
      replaceList(node,chosen.map(function(m){return makeRow(m,'oge');}),'Пока нет опубликованных вариантов. Скоро здесь появятся материалы для скачивания.');
    });
  }
  function makeCard(m){
    var card=el('article','kopilka-material-card');card.appendChild(el('span','kopilka-pill','ОГЭ · Тренировочный вариант · Бесплатно'));
    var body=el('div','kopilka-material-card__body'),heading=el('h3'),link=el('a',null,m.title||'Материал');link.href=detailLink(m);heading.appendChild(link);body.appendChild(heading);body.appendChild(el('p',null,m.description||''));card.appendChild(body);
    var actions=el('div','kopilka-material-card__actions'),btn=el('a','btn btn-outline','Подробнее');btn.href=detailLink(m);actions.appendChild(btn);
    var file=safeLink(m.downloadFile);if(file){var dl=el('a','btn btn-primary');dl.href=file;dl.download='';icon(dl,'download');dl.appendChild(document.createTextNode(' Скачать архив'));actions.appendChild(dl);}
    card.appendChild(actions);return card;
  }
  function renderFullVariants(items){var list=document.querySelector('[data-material-list="varianty"]');if(!list)return;var selected=items.filter(function(m){return m&&m.category==='varianty';});if(!selected.length)return;list.replaceChildren.apply(list,selected.map(makeCard));}
  function renderDetail(items){
    var root=document.getElementById('methodical-detail');if(!root)return;
    var id=new URLSearchParams(window.location.search).get('id');var m=items.find(function(x){return x&&x.id===id;});
    if(!m){root.replaceChildren(el('h1',null,'Материал не найден'));var back=el('a','btn btn-primary','Вернуться в копилку');back.href='kopilka.html';root.appendChild(back);return;}
    root.replaceChildren();
    var isEge=String(m.category||'').includes('ege');
    root.appendChild(el('span','kopilka-pill',isEge?'ЕГЭ · '+levelLabel(levelFor(m)):(m.category==='varianty'?'Вариант ОГЭ':'Пятиминутка ОГЭ · '+({'algebra':'Алгебра','geometry':'Геометрия','other':'Разное'})[sectionFor(m)])));
    root.appendChild(el('h1',null,m.title||'Материал'));root.appendChild(el('p','kopilka-detail-lead',m.description||''));
    var comp=Array.isArray(m.composition)?m.composition:[];
    if(comp.length){root.appendChild(el('h2','kopilka-detail-subheading','В архиве'));var ul=el('ul','kopilka-composition');comp.forEach(function(t){ul.appendChild(el('li',null,typeof t==='string'?t:(t&&t.entry)||''));});root.appendChild(ul);}
    var actions=el('div','kopilka-detail-actions'),file=safeLink(m.downloadFile);
    if(file){var dl=el('a','btn btn-primary','Скачать архив бесплатно');dl.href=file;dl.download='';actions.appendChild(dl);}
    var back=el('a','btn btn-outline','К списку материалов');back.href=m.category==='varianty'?'kopilka.html#varianty':m.category==='pyatiminutki-ege'?'pyatiminutki-ege.html':m.category==='varianty-ege'?'varianty-ege.html':'pyatiminutki-oge.html#'+sectionFor(m);actions.appendChild(back);root.appendChild(actions);
    document.title=(m.title||'Материал')+' — Методическая копилка | Шкатулка';var desc=document.querySelector('meta[name="description"]');if(desc)desc.content=m.description||'';
    var canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href='https://shkatulka.sistema-math.ru/material.html?id='+encodeURIComponent(m.id);
  }
  function bindChoiceButtons(selector,callback){
    var elements=Array.from(document.querySelectorAll(selector));
    elements.forEach(function(btn){btn.addEventListener('click',function(){elements.forEach(function(b){b.classList.toggle('is-active',b===btn);b.setAttribute('aria-pressed',b===btn?'true':'false');});callback(btn);});});
  }
  function egeFiveMinutes(items){
    var node=document.getElementById('ege-five-list');if(!node)return;
    var all=items.filter(function(m){return m&&m.category==='pyatiminutki-ege';});
    var buttons=Array.from(document.querySelectorAll('[data-task]'));
    var chosen=[],level='all',match='contains';
    var count=document.getElementById('ege-count'),selected=document.getElementById('ege-selected');
    var search=new URLSearchParams(location.search);
    var initialTasks=(search.get('tasks')||'').split(',').map(Number).filter(function(n){return Number.isSafeInteger(n)&&n>=1&&n<=21;});
    chosen=Array.from(new Set(initialTasks)).sort(function(a,b){return a-b;});
    level=['profile','basic'].includes(search.get('level'))?search.get('level'):'all';
    match=search.get('match')==='exact'?'exact':'contains';
    function syncButtons(){
      document.querySelectorAll('[data-ege-level]').forEach(function(b){var on=b.dataset.egeLevel===level;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false');});
      document.querySelectorAll('[data-ege-match]').forEach(function(b){var on=b.dataset.egeMatch===match;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false');});
      buttons.forEach(function(b){var n=Number(b.dataset.task);var disabled=(level==='profile'&&n>19);b.disabled=disabled;var on=chosen.includes(n);b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false');});
    }
    function updateUrl(){
      if(!window.history||!window.history.replaceState)return;
      var qs=new URLSearchParams();
      if(level!=='all')qs.set('level',level);
      if(chosen.length)qs.set('tasks',chosen.join(','));
      if(chosen.length&&match==='exact')qs.set('match','exact');
      try{window.history.replaceState(null,'',location.pathname+(qs.toString()?'?'+qs.toString():'')+location.hash);}catch(e){/* file:// and embedded previews may block history changes */}
    }
    function render(){
      var filtered=all.filter(function(m){
        if(level!=='all'&&levelFor(m)!==level)return false;
        var nums=taskNumbersFor(m);
        if(!chosen.length)return true;
        if(match==='exact')return chosen.length===nums.length&&chosen.every(function(n){return nums.includes(n);});
        return chosen.every(function(n){return nums.includes(n);});
      });
      filtered.sort(function(a,b){var lA=levelFor(a),lB=levelFor(b);return lA.localeCompare(lB)||(numberFor(a)||Number.MAX_SAFE_INTEGER)-(numberFor(b)||Number.MAX_SAFE_INTEGER);});
      replaceList(node,filtered.map(function(m){return makeRow(m,'ege-five');}),!all.length?'Пока нет опубликованных пятиминуток ЕГЭ. Здесь появятся первые архивы после добавления.':'По выбранным условиям материалов нет. Попробуйте другие номера заданий или нажмите «Сбросить».');
      if(count)count.textContent='Найдено: '+filtered.length;
      if(selected)selected.textContent=chosen.length?'Задания: '+chosen.map(function(n){return '№ '+n;}).join(', '):'Задания не выбраны — показаны все материалы';
      syncButtons();
      updateUrl();
    }
    buttons.forEach(function(b){b.addEventListener('click',function(){var n=Number(b.dataset.task);if(chosen.includes(n))chosen=chosen.filter(function(x){return x!==n;});else chosen.push(n);chosen.sort(function(a,b){return a-b;});render();});});
    bindChoiceButtons('[data-ege-level]',function(b){level=b.dataset.egeLevel; if(level==='profile')chosen=chosen.filter(function(n){return n<=19;});render();});
    bindChoiceButtons('[data-ege-match]',function(b){match=b.dataset.egeMatch;render();});
    var reset=document.getElementById('ege-reset');if(reset)reset.addEventListener('click',function(){level='all';match='contains';chosen=[];render();});
    if(level==='profile')chosen=chosen.filter(function(n){return n<=19;});
    render();
  }
  function egeVariants(items){
    var node=document.getElementById('ege-variants-list');if(!node)return;
    var all=items.filter(function(m){return m&&m.category==='varianty-ege';}),level='all';
    function render(){var filtered=all.filter(function(m){return level==='all'||levelFor(m)===level;});filtered.sort(function(a,b){return levelFor(a).localeCompare(levelFor(b))||(numberFor(a)||Number.MAX_SAFE_INTEGER)-(numberFor(b)||Number.MAX_SAFE_INTEGER);});replaceList(node,filtered.map(function(m){return makeRow(m,'ege-variant');}),!all.length?'Пока нет опубликованных вариантов ЕГЭ. Раздел готов к первым материалам.':'Пока нет вариантов для выбранного уровня. Попробуйте выбрать другой.');}
    bindChoiceButtons('[data-ege-variant-level]',function(b){level=b.dataset.egeVariantLevel;render();});render();
  }
  fetch('methodical-materials.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Materials unavailable');return r.json();}).then(function(payload){
    var items=Array.isArray(payload.items)?payload.items:[];
    renderFiveminutes(items);renderFullVariants(items);renderDetail(items);egeFiveMinutes(items);egeVariants(items);
  }).catch(function(err){console.warn('Методическая копилка: '+err.message);});
})();
