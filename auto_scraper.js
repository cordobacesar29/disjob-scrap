const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR   = './disjob_output';
const BASE_URL     = 'https://www.disjob.com';
const START_URL    = 'https://www.disjob.com/home.php';
const MAX_PAGES    = 120;
const NAV_TIMEOUT  = 20000;
const PAGE_WAIT_MS = 1200;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const log   = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('#')) return false;
  if (href.startsWith('/')) return true;
  try {
    return new URL(href).hostname.includes('disjob.com');
  } catch { return false; }
}

function normalizeUrl(href, base) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    return u.href;
  } catch { return null; }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  ensureOutputDir();

  const networkTraffic = [];
  const navigationLog  = [];
  const visited        = new Set();
  const queue          = [START_URL];
  let   requestCounter = 0;

  log('🚀 Iniciando navegación automática de Disjob...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox',
           '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });

  const [page] = await browser.pages();
  const requestMap = new WeakMap();

  // ── Interceptar tráfico ───────────────────────────────────────────────────
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const rt = req.resourceType();
    if (['xhr', 'fetch', 'document', 'script'].includes(rt)) {
      const entry = {
        id: `req_${++requestCounter}`,
        url: req.url(),
        method: req.method(),
        headers: req.headers(),
        payload: req.postData() ?? null,
        resourceType: rt,
        timestamp: new Date().toISOString(),
        response: null
      };
      requestMap.set(req, entry);
      networkTraffic.push(entry);
    }
    req.continue();
  });

  page.on('response', async (res) => {
    const req = res.request();
    const rt  = req.resourceType();
    if (!['xhr', 'fetch', 'document'].includes(rt)) return;
    const entry = requestMap.get(req);
    if (!entry) return;

    entry.response = { status: res.status(), headers: res.headers(), body: null };
    try {
      if (res.status() >= 200 && res.status() < 300) {
        const text = await Promise.race([
          res.text(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        try { entry.response.body = JSON.parse(text); }
        catch { entry.response.body = text.substring(0, 10000); }
      }
    } catch (e) {
      entry.response.body = `[Error: ${e.message}]`;
    }
  });

  // ── Crawl BFS ─────────────────────────────────────────────────────────────
  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    log(`🌐 [${visited.size}/${MAX_PAGES}] Navegando: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
      await delay(PAGE_WAIT_MS);

      const pageInfo = await page.evaluate((currentUrl) => {
        const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
          .map(h => ({ tag: h.tagName, text: h.innerText.trim() })).slice(0, 20);

        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim().substring(0, 80), href: a.getAttribute('href') }))
          .filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('javascript:'))
          .slice(0, 60);

        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.getAttribute('action'),
          method: f.getAttribute('method') || 'GET',
          fields: Array.from(f.querySelectorAll('input,select,textarea')).map(el => ({
            name: el.getAttribute('name'),
            type: el.getAttribute('type') || el.tagName.toLowerCase(),
            id:   el.getAttribute('id')
          }))
        }));

        return {
          url:      window.location.href,
          title:    document.title,
          metaDesc: document.querySelector('meta[name="description"]')?.content ?? null,
          headings,
          links,
          forms
        };
      }, url);

      navigationLog.push(pageInfo);
      log(`   ✅ "${pageInfo.title || url}" — ${pageInfo.links.length} links, ${pageInfo.forms.length} forms`);

      // Encolar links internos no visitados
      for (const { href } of pageInfo.links) {
        if (!isInternal(href)) continue;
        const normalized = normalizeUrl(href, url);
        if (normalized && !visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized);
        }
      }

    } catch (err) {
      log(`   ⚠️  Error en ${url}: ${err.message}`);
      navigationLog.push({ url, error: err.message, timestamp: new Date().toISOString() });
    }
  }

  // ── Guardado final ────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const trafficFile = path.join(OUTPUT_DIR, `network_traffic_AUTO_${ts}.json`);
  const navFile     = path.join(OUTPUT_DIR, `navigation_log_AUTO_${ts}.json`);

  fs.writeFileSync(trafficFile, JSON.stringify(networkTraffic, null, 2));
  fs.writeFileSync(navFile,     JSON.stringify(navigationLog,  null, 2));
  // También latest
  fs.writeFileSync(path.join(OUTPUT_DIR, 'network_traffic_latest.json'), JSON.stringify(networkTraffic, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'navigation_log_latest.json'),  JSON.stringify(navigationLog,  null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ CRAWL AUTOMÁTICO FINALIZADO');
  console.log('═'.repeat(60));
  console.log(`  Páginas visitadas        : ${navigationLog.length}`);
  console.log(`  Peticiones capturadas    : ${networkTraffic.length}`);
  console.log(`  Archivos guardados en    : ${path.resolve(OUTPUT_DIR)}`);
  console.log(`  → ${trafficFile}`);
  console.log(`  → ${navFile}`);
  console.log('═'.repeat(60));

  await browser.close();
  process.exit(0);
})();
