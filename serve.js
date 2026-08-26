const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const ROOT=path.join(__dirname,'site'),PORT=4321;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(url.parse(req.url).pathname);
  if(p==='/')p='/index.html';
  const file=path.join(ROOT, path.normalize(p));
  if(!file.startsWith(ROOT)){res.writeHead(403).end('forbidden');return;}
  fs.readFile(file,(e,buf)=>{
    if(e){res.writeHead(404,{'Content-Type':'text/plain'}).end('404 '+p);return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream',
      'Cache-Control':'no-store'});
    res.end(buf);
  });
}).listen(PORT,()=>console.log('Haat dev server → http://localhost:'+PORT));
