/* Re-encodes every downloaded product photo to a small, uniform JPEG.
   The CDN refuses to transform some PNGs, so we do it locally. */
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const SRC=path.join(__dirname,'img'),OUT=path.join(__dirname,'img-opt');
fs.mkdirSync(OUT,{recursive:true});

(async()=>{
  const files=fs.readdirSync(SRC).filter(f=>/\.jpg$/i.test(f));
  let before=0,after=0,fail=[];
  for(const f of files){
    const s=path.join(SRC,f),d=path.join(OUT,f);
    before+=fs.statSync(s).size;
    try{
      await sharp(s).resize(300,300,{fit:'cover',position:'centre'})
        .flatten({background:'#ffffff'})          // PNG transparency -> white, like the site
        .jpeg({quality:62,mozjpeg:true,progressive:true})
        .toFile(d);
      after+=fs.statSync(d).size;
    }catch(e){fail.push(f+' '+e.message);}
  }
  console.log('files    ',files.length);
  console.log('before   ',(before/1048576).toFixed(2),'MB');
  console.log('after    ',(after/1048576).toFixed(2),'MB');
  console.log('as base64',(after*1.34/1048576).toFixed(2),'MB');
  const sizes=fs.readdirSync(OUT).map(f=>fs.statSync(path.join(OUT,f)).size).sort((a,b)=>b-a);
  console.log('largest  ',(sizes[0]/1024).toFixed(0)+'KB  median',(sizes[Math.floor(sizes.length/2)]/1024).toFixed(0)+'KB');
  if(fail.length)console.log('FAILED:\n'+fail.join('\n'));
})();
