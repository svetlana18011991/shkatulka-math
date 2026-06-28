
async function loadProducts(){
try{
const r=await fetch('products.json');
const p=await r.json();
renderProducts(p);
initFilters(p);
}catch(e){
console.error(e);
}
}

function renderProducts(products){
const grid=document.getElementById('productsGrid');
grid.innerHTML=products.map(p=>`
<div class="product-card">
<div>${p.title}</div>
</div>
`).join('');
}

function initFilters(products){
let all=products;
document.querySelectorAll('.filter-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const f=btn.dataset.filter;
const filtered=f==='all'?all:all.filter(p=>String(p.grade)===f);
renderProducts(filtered);
});
});
}

const burger=document.getElementById('burger');
const mobileNav=document.getElementById('mobileNav');

if(burger){
burger.addEventListener('click',()=>mobileNav.classList.toggle('open'));
}

loadProducts();
