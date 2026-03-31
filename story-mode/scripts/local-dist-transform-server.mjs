import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBuildStatusSnapshot } from './dist-build-meta.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const host = '127.0.0.1';
const port = 4174;
const basePath = '/garden-os/story-mode-live';
const buildStatusPath = `${basePath}/__build`;

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

let cachedBuildStatus = null;
let cachedBuildStatusAt = 0;

async function getBuildStatusCached(force = false) {
  const now = Date.now();
  if (!force && cachedBuildStatus && now - cachedBuildStatusAt < 1500) {
    return cachedBuildStatus;
  }
  cachedBuildStatus = await getBuildStatusSnapshot();
  cachedBuildStatusAt = now;
  return cachedBuildStatus;
}

function createBuildHeaders(contentType, buildStatus) {
  return {
    'cache-control': 'no-store',
    'content-type': contentType,
    'x-story-mode-dist-status': buildStatus.state,
    'x-story-mode-dist-built-at': buildStatus.builtAt ?? 'missing',
    'x-story-mode-dist-source-latest': buildStatus.latestSourceMtime ?? 'missing',
  };
}

function injectBuildBadge(source, buildStatus) {
  const payload = JSON.stringify({
    state: buildStatus.state,
    label: buildStatus.label,
    builtAt: buildStatus.builtAt,
    latestSourceMtime: buildStatus.latestSourceMtime,
    version: buildStatus.meta?.version ?? null,
  });
  const snippet = `
<script>
(() => {
  const build = ${payload};
  const badge = document.createElement('div');
  const stateLabel = build.state === 'fresh' ? 'dist fresh' : build.state === 'stale' ? 'dist stale' : 'dist meta missing';
  const timeLabel = build.builtAt ? 'built ' + build.builtAt : 'build time unknown';
  const latestLabel = build.state === 'stale' && build.latestSourceMtime
    ? 'src ' + build.latestSourceMtime
    : build.label;
  badge.textContent = stateLabel + ' | ' + timeLabel + ' | ' + latestLabel;
  badge.style.position = 'fixed';
  badge.style.right = '14px';
  badge.style.bottom = '14px';
  badge.style.zIndex = '999999';
  badge.style.maxWidth = 'min(460px, calc(100vw - 28px))';
  badge.style.padding = '10px 12px';
  badge.style.borderRadius = '12px';
  badge.style.font = '12px/1.35 monospace';
  badge.style.whiteSpace = 'normal';
  badge.style.color = '#f7f2ea';
  badge.style.background = build.state === 'fresh' ? 'rgba(16, 74, 48, 0.92)' : 'rgba(119, 52, 22, 0.95)';
  badge.style.border = build.state === 'fresh' ? '1px solid rgba(118, 227, 178, 0.5)' : '1px solid rgba(255, 179, 102, 0.5)';
  badge.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.35)';
  document.body.appendChild(badge);
})();
</script>`;
  return source.includes('dist fresh') || source.includes('dist stale') || source.includes('dist meta missing')
    ? source
    : source.replace('</body>', `${snippet}\n</body>`);
}

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
    if (url.pathname === buildStatusPath) {
      const buildStatus = await getBuildStatusCached(true);
      res.writeHead(200, createBuildHeaders('application/json; charset=utf-8', buildStatus));
      res.end(`${JSON.stringify(buildStatus, null, 2)}\n`);
      return;
    }

    const relativePath = normalizeRequestPath(url.pathname);
    if (!relativePath) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const filePath = join(distDir, relativePath);
    let body = await readFile(filePath);
    let contentType = contentTypeFor(filePath);
    const buildStatus = await getBuildStatusCached();

    if (/\/assets\/garden-scene-.*\.js$/.test(url.pathname)) {
      body = Buffer.from(transformGardenScene(body.toString('utf-8')));
      contentType = 'application/javascript; charset=utf-8';
    }

    if (relativePath === 'index.html') {
      body = Buffer.from(injectBuildBadge(body.toString('utf-8'), buildStatus), 'utf-8');
      contentType = 'text/html; charset=utf-8';
    }

    res.writeHead(200, createBuildHeaders(contentType, buildStatus));
    res.end(body);
  } catch (error) {
    const code = error?.code === 'ENOENT' ? 404 : 500;
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(code === 404 ? 'Not found' : String(error));
  }
});

server.listen(port, host, () => {
  void getBuildStatusCached(true).then((buildStatus) => {
    console.log(`Story Mode dist server listening on http://${host}:${port}${basePath}/`);
    console.log(`Build status: ${buildStatus.state} — ${buildStatus.label}`);
    console.log(`Build endpoint: http://${host}:${port}${buildStatusPath}`);
  });
});
