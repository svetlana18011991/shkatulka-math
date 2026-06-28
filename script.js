
let productsData = [];

async function loadProducts(){
  const res = await fetch('products.json');
  productsData = await res.json();
  render(productsData);
  initFilters();
}

function render(products){
  const grid = document.getElementById('productsGrid');

  grid.innerHTML = products.map((p,i)=>`
    <div class="product-card" data-i="${i}">

      <div class="card-img">
        <img src="${p.image}" alt="${p.title}">
      </div>

      <div class="card-body">
        <h3>${p.title}</h3>

        <ul class="desc">
          ${p.description.split('\n').filter(x=>x).map(x=>`<li>${x}</li>`).join('')}
        </ul>

        <div class="bottom">
          <span class="price">${p.price} ₽</span>
          <a class="buy" href="${p.buyLink}" target="_blank">Купить</a>
        </div>
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

      render(
        f==="all"
          ? productsData
          : productsData.filter(p=>String(p.grade)===f)
      );
    }
  });
}

loadProducts();
