const fs=require('fs'),path=require('path'),https=require('https');
const cat=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
const OUT=path.join(__dirname,'img'); fs.mkdirSync(OUT,{recursive:true});

function get(url,redirects){return new Promise((res,rej)=>{
  https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
    if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&(redirects||0)<3){
      r.resume();return get(r.headers.location,(redirects||0)+1).then(res,rej);}
    if(r.statusCode!==200){r.resume();return rej(new Error(r.statusCode+' '+url));}
    const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res(Buffer.concat(c)));
  }).on('error',rej);});}

const jobs=cat.products.map(p=>({id:p.id,url:p.img.replace(/_1200x\.(jpg|png|webp)/i,'_300x300.$1')}));
let done=0,failed=[];
async function run(){
  for(let i=0;i<jobs.length;i+=6){
    await Promise.all(jobs.slice(i,i+6).map(async j=>{
      const f=path.join(OUT,j.id+'.jpg');
      if(fs.existsSync(f)&&fs.statSync(f).size>2000){done++;return;}
      try{fs.writeFileSync(f,await get(j.url));done++;}
      catch(e){failed.push(j.id+' '+e.message);}
    }));
    process.stdout.write('\r'+done+'/'+jobs.length);
  }
  const total=fs.readdirSync(OUT).reduce((n,f)=>n+fs.statSync(path.join(OUT,f)).size,0);
  console.log('\ndownloaded',done,'of',jobs.length,'· total',(total/1048576).toFixed(2),'MB',
    '· base64 approx',(total*1.34/1048576).toFixed(2),'MB');
  if(failed.length)console.log('FAILED:\n'+failed.join('\n'));
}
run();
