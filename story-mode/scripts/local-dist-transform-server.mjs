import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const host = '127.0.0.1';
const port = 4174;
const basePath = '/garden-os/story-mode-live';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const growthFallbackOld = 'function E_(i,t){return w_(`grow-${i}`,t)}';
const growthFallbackNew = 'function E_(i,t){const e=iu.get(`crop-${i}`);return e??w_(`grow-${i}`,t)}';

const accentOld =
  'const $t=[0,.3,.6,1];function Ue(T,I,W){const it=pr(I)==="planner",et=be(I,W),ht=new Set;for(let St=0;St<T.length;St++){const Gt=T[St],bt=`accent-${St}`;if(it||!Gt.cropId||et<0){re.has(bt)&&(s.disposeObject(re.get(bt)),re.delete(bt));continue}const he=E_(Gt.cropId,et);if(!he){re.has(bt)&&(s.disposeObject(re.get(bt)),re.delete(bt));continue}ht.add(bt);const De=`${Gt.cropId}:${et}`;if(re.has(bt)&&re.get(bt).userData.sig===De){const Uu=re.get(bt);Uu.material.opacity=$t[et]??.6;continue}re.has(bt)&&(s.disposeObject(re.get(bt)),re.delete(bt));const zn=new Na({map:he,transparent:!0,opacity:$t[et]??.6,depthWrite:!1,sizeAttenuation:!0}),hn=new Bl(zn);hn.scale.set(.38,.38,1);const ge=Math.floor(St/gn),ze=St%gn,Ns=b.cellSize,Fs=(ze-(gn-1)/2)*Ns,Lu=(ge-(gs-1)/2)*Ns;hn.position.set(Fs,b.soilY+.22,Lu),hn.userData.sig=De,hn.userData.cellIndex=St,s.trackObject(hn),f.add(hn),re.set(bt,hn)}for(const[St,Gt]of re)ht.has(St)||(s.disposeObject(Gt),re.delete(St))}';

const accentNew =
  'const __accentOpacity=[.14,.5,.76,1],__accentScale=[.15,.2,.27,.35],__accentLift=[.1,.145,.19,.235];function __applyAccentState(T,I,W,it){const et=__accentOpacity[I]??.7,ht=__accentScale[I]??.25,St=__accentLift[I]??.18,Gt=T.material;Gt.opacity=et,Gt.color.setHex(16777215),it==="winter"?(Gt.color.setHex(12043088),Gt.opacity*=.82):W&&W!=="none"&&(Gt.color.setHex(W==="critical"?13349272:14791064),Gt.opacity*=W==="critical"?.72:.86),T.scale.set(ht,ht,1),T.position.y=b.soilY+St,T.renderOrder=12}function Ue(T,I,W){const it=pr(I)==="planner",et=be(I,W),ht=new Set;for(let St=0;St<T.length;St++){const Gt=T[St],bt=`accent-${St}`;if(it||!Gt.cropId||et<0){re.has(bt)&&(s.disposeObject(re.get(bt)),re.delete(bt));continue}const he=E_(Gt.cropId,et);if(!he){re.has(bt)&&(s.disposeObject(re.get(bt)),re.delete(bt));continue}ht.add(bt);const De=`${Gt.cropId}:${et}:${Gt.damageState??"none"}:${W}`;if(re.has(bt)&&re.get(bt).userData.sig===De){const Uu=re.get(bt);__applyAccentState(Uu,et,Gt.damageState,W);continue}re.has(bt)&&(s.disposeObject(re.get(bt)),re.delete(bt));const zn=new Na({map:he,transparent:!0,opacity:__accentOpacity[et]??.7,depthWrite:!1,depthTest:!1,sizeAttenuation:!0}),hn=new Bl(zn),ge=Math.floor(St/gn),ze=St%gn,Ns=b.cellSize,Fs=(ze-(gn-1)/2)*Ns,Lu=(ge-(gs-1)/2)*Ns;hn.position.set(Fs,b.soilY+.2,Lu),hn.userData.sig=De,hn.userData.cellIndex=St,__applyAccentState(hn,et,Gt.damageState,W),s.trackObject(hn),f.add(hn),re.set(bt,hn)}for(const[St,Gt]of re)ht.has(St)||(s.disposeObject(Gt),re.delete(St))}';

function contentTypeFor(filePath) {
  return MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';
}

function normalizeRequestPath(urlPath) {
  if (urlPath.startsWith('/assets/')) {
    return urlPath.replace(/^[/\\]+/, '');
  }
  if (!urlPath.startsWith(basePath)) return null;
  const remainder = urlPath.slice(basePath.length) || '/';
  const target = remainder === '/' ? '/index.html' : remainder;
  return normalize(target).replace(/^[/\\]+/, '').replace(/^(\.\.[/\\])+/, '');
}

function transformGardenScene(source) {
  let next = source;
  next = next.replace(growthFallbackOld, growthFallbackNew);
  next = next.replace(accentOld, accentNew);
  return next;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    const relativePath = normalizeRequestPath(url.pathname);
    if (!relativePath) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const filePath = join(distDir, relativePath);
    let body = await readFile(filePath);
    let contentType = contentTypeFor(filePath);

    if (/\/assets\/garden-scene-.*\.js$/.test(url.pathname)) {
      body = Buffer.from(transformGardenScene(body.toString('utf-8')));
      contentType = 'application/javascript; charset=utf-8';
    }

    res.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': contentType,
    });
    res.end(body);
  } catch (error) {
    const code = error?.code === 'ENOENT' ? 404 : 500;
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(code === 404 ? 'Not found' : String(error));
  }
});

server.listen(port, host, () => {
  console.log(`Story Mode dist server listening on http://${host}:${port}${basePath}/`);
});
