
let allProducts=[];

async function loadProducts(){
  const r=await fetch('products.json');
  const p=await r.json();
  allProducts=p;
  renderProducts(p);
  initFilters();
}

function renderProducts(products){
  const grid=document.getElementById('productsGrid');

  grid.innerHTML=products.map((p,i)=>`
    <div class="product-card">

      <div class="card-img">
        <img src="${p.image}" alt="${p.title}">
      </div>

      <h3>${p.title}</h3>

      <div class="price">${p.price} ₽</div>

      <div class="actions">
        <div class="btn-watch" data-i="${i}">Смотреть</div>
        <a class="btn-buy" href="${p.buyLink}" target="_blank">Купить</a>
      </div>

    </div>
  `).join('');
}

function initFilters(){
  document.querySelectorAll('.filter-btn').forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');

      const f=b.dataset.filter;

      renderProducts(
        f==="all"
        ? allProducts
        : allProducts.filter(x=>String(x.grade)===f)
      );
    }
  });
}

function openModal(p){
  let m=document.getElementById('modal');

  if(!m){
    m=document.createElement('div');
    m.id='modal';
    m.style.cssText=`
      position:fixed;inset:0;
      background:rgba(0,0,0,.6);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
    `;

    m.innerHTML=`
      <div style="background:#fff;width:900px;max-width:95%;display:flex;border-radius:16px;overflow:hidden">

        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px">
          <img id="mimg" style="max-width:100%;max-height:400px;object-fit:contain">
        </div>

        <div style="flex:1;padding:20px">
          <h2 id="mtitle"></h2>
          <div id="mdesc" style="white-space:pre-line;margin-top:10px"></div>
          <div id="mprice" style="font-size:22px;font-weight:700;color:#8B2635;margin-top:15px"></div>
          <a id="mbuy" target="_blank"
             style="display:inline-block;margin-top:15px;background:#8B2635;color:#fff;padding:10px 18px;border-radius:30px">
            Купить
          </a>
        </div>

      </div>
    `;

    document.body.appendChild(m);

    m.onclick=(e)=>{if(e.target===m)m.style.display='none';};
  }

  m.querySelector('#mimg').src=p.image;
  m.querySelector('#mtitle').textContent=p.title;
  m.querySelector('#mdesc').textContent=p.description||'';
  m.querySelector('#mprice').textContent=p.price+' ₽';
  m.querySelector('#mbuy').href=p.buyLink;

  m.style.display='flex';
}

document.addEventListener('click',(e)=>{
  const b=e.target.closest('.btn-watch');
  if(!b) return;

  const card=b.closest('.product-card');
  const i=[...document.querySelectorAll('.product-card')].indexOf(card);

  openModal(allProducts[i]);
});

loadProducts();
