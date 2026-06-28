
let allProducts = [];
let currentProducts = [];

async function loadProducts(){
  const res = await fetch('products.json');
  const products = await res.json();
  allProducts = products;
  currentProducts = products;
  renderProducts(products);
  initFilters();
}

function renderProducts(products){
  const grid = document.getElementById('productsGrid');

  grid.innerHTML = products.map((p,i)=>`
    <div class="product-card" data-index="${i}">
      <div class="card-img">
        <img src="${p.image}" alt="${p.title}">
        <span class="card-grade-badge">${p.grade}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${p.title}</h3>
        <div class="card-footer">
          <span class="card-price">${p.price} ₽</span>
          <a class="card-buy-btn" href="${p.buyLink}" target="_blank">Купить</a>
        </div>
      </div>
    </div>
  `).join('');

  currentProducts = products;
}

function initFilters(){
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');

      const f = btn.dataset.filter;

      renderProducts(
        f === 'all'
          ? allProducts
          : allProducts.filter(p => String(p.grade) === f)
      );
    }
  });
}

function openModal(p){
  let modal = document.getElementById('productModal');

  if(!modal){
    modal = document.createElement('div');
    modal.id='productModal';
    modal.style.cssText=`
      position:fixed;inset:0;
      background:rgba(0,0,0,0.6);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
    `;

    modal.innerHTML=`
      <div style="background:#fff;width:92%;max-width:650px;padding:20px;border-radius:16px;position:relative;max-height:90vh;overflow:auto">
        <button id="closeM" style="position:absolute;top:10px;right:10px">✖</button>
        <img id="mImg" style="width:100%;max-height:350px;object-fit:contain">
        <h2 id="mTitle"></h2>
        <p id="mDesc" style="white-space:pre-line;color:#444"></p>
        <strong id="mPrice"></strong>
        <div style="text-align:right;margin-top:15px">
          <a id="mBuy" target="_blank" style="background:#8B2635;color:#fff;padding:10px 18px;border-radius:30px;text-decoration:none">Купить</a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.onclick=(e)=>{ if(e.target===modal) modal.style.display='none'; }
    modal.querySelector('#closeM').onclick=()=>modal.style.display='none';
  }

  modal.querySelector('#mImg').src=p.image;
  modal.querySelector('#mTitle').textContent=p.title;
  modal.querySelector('#mDesc').textContent=p.description;
  modal.querySelector('#mPrice').textContent=p.price+' ₽';
  modal.querySelector('#mBuy').href=p.buyLink;

  modal.style.display='flex';
}

document.addEventListener('click',(e)=>{
  const card=e.target.closest('.product-card');
  if(!card) return;
  if(e.target.closest('.card-buy-btn')) return;

  const p=currentProducts[card.dataset.index];
  if(p) openModal(p);
});

loadProducts();
