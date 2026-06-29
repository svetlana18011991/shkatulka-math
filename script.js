
let productsData=[];

async function loadProducts(){
  const r=await fetch('products.json');
  productsData=await r.json();
  render(productsData);
  initFilters();
}

function render(products){
  const grid=document.getElementById('productsGrid');

  grid.innerHTML=products.map((p,i)=>`
    <div class="product-card" data-i="${i}">
      <div class="card-img">
        <img src="${p.image}">
      </div>
      <div class="card-body">
        <h3>${p.title}</h3>
        <div class="price">${p.price} ₽</div>
        <button class="open-btn">Смотреть</button>
        <a class="buy" href="${p.buyLink}" target="_blank">Купить</a>
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
      render(f==="all"?productsData:productsData.filter(p=>String(p.grade)===f));
    }
  });
}

document.addEventListener('click',(e)=>{
  const card=e.target.closest('.product-card');
  if(!card) return;

  const p=productsData[card.dataset.i];
  if(!p) return;

  openModal(p);
});

function formatDesc(d){
  return d.split('\n').filter(x=>x.trim()).map(x=>`<li>${x}</li>`).join('');
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

        <div style="flex:1;background:#fff;display:flex;align-items:center;justify-content:center;padding:20px">
          <img id="mimg" style="max-width:100%;max-height:400px;object-fit:contain">
        </div>

        <div style="flex:1;padding:20px">
          <h2 id="mtitle"></h2>
          <ul id="mdesc"></ul>
          <div style="margin-top:20px;font-size:22px;font-weight:700;color:#8B2635" id="mprice"></div>
          <a id="mbuy" target="_blank"
            style="display:inline-block;margin-top:15px;padding:12px 18px;background:#8B2635;color:#fff;border-radius:30px">
            Купить
          </a>
        </div>

      </div>
    `;

    document.body.appendChild(m);

    m.onclick=(e)=>{ if(e.target===m) m.style.display='none'; };
  }

  m.querySelector('#mimg').src=p.image;
  m.querySelector('#mtitle').textContent=p.title;
  m.querySelector('#mdesc').innerHTML=formatDesc(p.description);
  m.querySelector('#mprice').textContent=p.price+' ₽';
  m.querySelector('#mbuy').href=p.buyLink;

  m.style.display='flex';
}

loadProducts();
