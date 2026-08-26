const fs=require('fs'),path=require('path'),https=require('https');
function get(url,n){return new Promise((res,rej)=>{
  https.get(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}},r=>{
    if([301,302,307,308].includes(r.statusCode)&&r.headers.location&&(n||0)<3){
      r.resume();return get(r.headers.location,(n||0)+1).then(res,rej);}
    if(r.statusCode!==200){r.resume();return rej(new Error(r.statusCode));}
    let s='';r.setEncoding('utf8');r.on('data',d=>s+=d);r.on('end',()=>res(s));
  }).on('error',rej);});}

(async()=>{
  const all=[];
  for(let page=1;page<=8;page++){
    const j=JSON.parse(await get('https://happilo.com/products.json?limit=250&page='+page));
    if(!j.products.length)break;
    all.push(...j.products);
    process.stdout.write('\rpage '+page+' → '+all.length+' products');
  }
  console.log('');
  fs.writeFileSync(path.join(__dirname,'happilo-raw.json'),JSON.stringify(all));
  const types={},tagCount={};
  all.forEach(p=>{types[p.product_type||'(none)']=(types[p.product_type||'(none)']||0)+1;
    (p.tags||[]).forEach(t=>tagCount[t]=(tagCount[t]||0)+1);});
  console.log('total:',all.length);
  console.log('\nproduct_type:');
  Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log('  '+String(v).padStart(4),k));
  console.log('\ntop tags:');
  Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([k,v])=>console.log('  '+String(v).padStart(4),k));
  const s=all[0];
  console.log('\nsample variant:',JSON.stringify(s.variants[0]).slice(0,340));
  console.log('sample image:',(s.images[0]||{}).src);
  console.log('available with price>0:',all.filter(p=>p.variants.some(v=>+v.price>0)).length);
})();
