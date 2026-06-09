require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ─── CREDENCIALES (desde .env) ────────────────────────────────────────────────
const CANDIDATO_USUARIO  = process.env.CANDIDATO_USUARIO;
const CANDIDATO_PASSWORD = process.env.CANDIDATO_PASSWORD;
const EMPRESA_USUARIO    = process.env.EMPRESA_USUARIO;
const EMPRESA_PASSWORD   = process.env.EMPRESA_PASSWORD;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR   = './disjob_output';
const START_URL    = 'https://www.disjob.com/home.php';
const MAX_PAGES    = 150;
const NAV_TIMEOUT  = 25000;
const PAGE_WAIT_MS = 1500;

// Solo crawlear el dominio principal autenticado
const ALLOWED_HOST = 'www.disjob.com';

// Páginas a excluir para no romper la sesión ni hacer acciones irreversibles
const SKIP_URLS = ['sortir.php', 'baja_servicio.php', 'logout', 'salir', 'download_cv.php'];

// Guardado automático cada N páginas
const AUTOSAVE_EVERY = 5;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const log   = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('#')) return false;
  if (SKIP_URLS.some(s => href.includes(s))) return false;
  // Solo rutas relativas o URLs del host permitido
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) return true;
  try { return new URL(href).hostname === ALLOWED_HOST; }
  catch { return false; }
}

function normalizeUrl(href, base) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    // Quitar parámetros de cache para evitar duplicados
    u.searchParams.delete('nocache');
    return u.href;
  } catch { return null; }
}

// ─── ANÁLISIS PROFUNDO DE PÁGINA ─────────────────────────────────────────────
async function deepAnalyzePage(page, url) {
  return await page.evaluate(() => {
    // Headings
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
      .map(h => ({ tag: h.tagName, text: h.innerText.trim() })).slice(0, 30);

    // Links completos con atributos
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => ({
        text:    a.innerText.trim().substring(0, 100),
        href:    a.getAttribute('href'),
        title:   a.getAttribute('title'),
        target:  a.getAttribute('target'),
        onclick: a.getAttribute('onclick'),
        classes: a.className,
        dataAttrs: Object.fromEntries(
          Array.from(a.attributes)
            .filter(at => at.name.startsWith('data-'))
            .map(at => [at.name, at.value])
        )
      }))
      .filter(l => l.href || l.onclick)
      .slice(0, 80);

    // Formularios con análisis completo
    const forms = Array.from(document.querySelectorAll('form')).map(f => {
      // Encontrar label de cada campo
      const getLabel = (el) => {
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) return lbl.innerText.trim();
        }
        const parent = el.closest('label') || el.parentElement?.closest('label');
        if (parent) return parent.innerText.trim().substring(0, 60);
        const prevSibling = el.previousElementSibling;
        if (prevSibling?.tagName === 'LABEL') return prevSibling.innerText.trim();
        return null;
      };

      const fields = Array.from(f.querySelectorAll('input,select,textarea,button[type]')).map(el => {
        const base = {
          tag:         el.tagName,
          name:        el.getAttribute('name'),
          id:          el.getAttribute('id'),
          type:        el.getAttribute('type') || el.tagName.toLowerCase(),
          placeholder: el.getAttribute('placeholder'),
          label:       getLabel(el),
          required:    el.hasAttribute('required'),
          readonly:    el.hasAttribute('readonly'),
          disabled:    el.hasAttribute('disabled'),
          maxlength:   el.getAttribute('maxlength'),
          pattern:     el.getAttribute('pattern'),
          value:       el.getAttribute('type') === 'password' ? '***' : (el.getAttribute('value') || ''),
          onchange:    el.getAttribute('onchange'),
          onclick:     el.getAttribute('onclick'),
          classes:     el.className,
          dataAttrs:   Object.fromEntries(
            Array.from(el.attributes)
              .filter(at => at.name.startsWith('data-'))
              .map(at => [at.name, at.value])
          )
        };
        // Opciones de select
        if (el.tagName === 'SELECT') {
          base.options = Array.from(el.options).map(o => ({
            value: o.value, text: o.text.trim(), selected: o.defaultSelected
          }));
        }
        return base;
      });

      // Botones fuera del form que apunten a él
      const submitBtns = Array.from(document.querySelectorAll(`button[form="${f.id}"]`)).map(b => ({
        text: b.innerText.trim(), type: b.type, name: b.name, value: b.value,
        onclick: b.getAttribute('onclick'), classes: b.className
      }));

      return {
        id:       f.getAttribute('id'),
        name:     f.getAttribute('name'),
        action:   f.getAttribute('action'),
        method:   (f.getAttribute('method') || 'GET').toUpperCase(),
        enctype:  f.getAttribute('enctype'),
        onsubmit: f.getAttribute('onsubmit'),
        classes:  f.className,
        fields,
        externalSubmitBtns: submitBtns
      };
    });

    // Botones standalone (fuera de form o con onclick relevante)
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn, a[class*="button"]'))
      .map(b => ({
        tag:     b.tagName,
        text:    b.innerText?.trim() || b.getAttribute('value') || '',
        type:    b.getAttribute('type'),
        name:    b.getAttribute('name'),
        onclick: b.getAttribute('onclick'),
        classes: b.className,
        href:    b.getAttribute('href'),
        dataAttrs: Object.fromEntries(
          Array.from(b.attributes)
            .filter(at => at.name.startsWith('data-'))
            .map(at => [at.name, at.value])
        )
      }))
      .filter(b => b.text || b.onclick || b.dataAttrs)
      .slice(0, 40);

    // Scripts inline que contengan fetch/ajax/XMLHttpRequest
    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent.trim())
      .filter(t => /fetch|XMLHttpRequest|\.ajax|\.post|\.get\(|url\s*:/i.test(t))
      .map(t => t.substring(0, 2000));

    // Scripts externos cargados
    const externalScripts = Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.getAttribute('src'))
      .filter(Boolean);

    // Meta y estructura general
    const metas = Array.from(document.querySelectorAll('meta[name],meta[property]')).map(m => ({
      name: m.getAttribute('name') || m.getAttribute('property'),
      content: m.getAttribute('content')
    }));

    // Secciones / nav items visibles para entender la estructura de menú
    const navItems = Array.from(document.querySelectorAll('nav a, .nav a, .menu a, .navbar a'))
      .map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') }))
      .filter(a => a.text || a.href).slice(0, 30);

    // Mensajes de error / alerta visibles en el DOM
    const alerts = Array.from(document.querySelectorAll('.alert, .error, .warning, .success, .message, [class*="alert"], [class*="error"], [class*="msg"]'))
      .map(el => ({ classes: el.className, text: el.innerText.trim().substring(0, 200) }))
      .filter(el => el.text).slice(0, 10);

    return {
      url:            window.location.href,
      title:          document.title,
      metaDesc:       document.querySelector('meta[name="description"]')?.content ?? null,
      metas,
      headings,
      navItems,
      links,
      forms,
      buttons,
      inlineScripts,
      externalScripts,
      alerts,
      bodyClasses:    document.body?.className || ''
    };
  });
}

// ─── LOGIN CANDIDATO ──────────────────────────────────────────────────────────
async function loginCandidato(page) {
  log('🔑 Iniciando sesión como candidato...');
  await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  await delay(1500);

  // Inspeccionar todos los inputs disponibles para elegir los correctos
  const formDiag = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(el => ({
      name:    el.name,
      id:      el.id,
      type:    el.type,
      visible: el.offsetParent !== null,
      rect:    el.getBoundingClientRect().toJSON()
    }));
  });
  log(`   🔍 Inputs en home.php: ${JSON.stringify(formDiag)}`);

  // Rellenar via evaluate (no requiere que el elemento sea clickable)
  const filled = await page.evaluate((user, pass) => {
    // Encontrar el form que contenga un campo password
    const pwdInput = document.querySelector('input[type="password"]');
    if (!pwdInput) return { ok: false, reason: 'No password input found' };

    const form = pwdInput.closest('form');
    if (!form) return { ok: false, reason: 'Password input not inside a form' };

    // Buscar campo de usuario/email (input text o email en el mismo form, antes del password)
    const userInput = form.querySelector('input[type="email"]')
                   || form.querySelector('input[type="text"]')
                   || form.querySelector('input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"])');

    if (!userInput) return { ok: false, reason: 'No user input found in form' };

    // Asignar valores y disparar eventos
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(userInput, user);
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
    userInput.dispatchEvent(new Event('change', { bubbles: true }));

    nativeInputValueSetter.call(pwdInput, pass);
    pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
    pwdInput.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      ok: true,
      userField: { name: userInput.name, id: userInput.id, type: userInput.type },
      pwdField:  { name: pwdInput.name,  id: pwdInput.id  },
      formAction: form.action,
      formMethod: form.method
    };
  }, CANDIDATO_USUARIO, CANDIDATO_PASSWORD);

  log(`   📋 Fill result: ${JSON.stringify(filled)}`);
  if (!filled.ok) {
    log(`   ❌ No se pudo rellenar el form: ${filled.reason}`);
    return false;
  }
  log(`   ✍️  Usuario: ${CANDIDATO_USUARIO} | Contraseña: ***`);

  // Buscar y hacer click al botón submit del form (intentar con JS si no es clickable)
  const submitted = await page.evaluate(() => {
    const pwdInput = document.querySelector('input[type="password"]');
    const form = pwdInput?.closest('form');
    if (!form) return false;
    const btn = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
    if (btn) { btn.click(); return true; }
    form.submit();
    return true;
  });

  log(`   🖱️  Submit: ${submitted}`);

  // Esperar navegación post-login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT }).catch(() => {});
  await delay(1500);

  const currentUrl = page.url();
  const loggedIn = currentUrl.includes('home_cand') || currentUrl.includes('_cand');
  log(loggedIn
    ? `   ✅ Login exitoso → ${currentUrl}`
    : `   ⚠️  Login dudoso — URL actual: ${currentUrl}`
  );
  return loggedIn;
}

// ─── HELPERS BROWSER ─────────────────────────────────────────────────────────
function launchBrowserArgs() {
  return {
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox',
           '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
           '--disable-popup-blocking']
  };
}

function setupPageHandlers(page, networkTraffic, requestMap, counter) {
  page.setRequestInterception(true);
  page.on('request', (req) => {
    const rt = req.resourceType();
    if (['xhr', 'fetch', 'document', 'script'].includes(rt)) {
      const entry = {
        id: `req_${++counter.n}`,
        url: req.url(), method: req.method(),
        headers: req.headers(), payload: req.postData() ?? null,
        resourceType: rt, timestamp: new Date().toISOString(), response: null
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
        catch { entry.response.body = text.substring(0, 15000); }
      }
    } catch (e) { entry.response.body = `[Error: ${e.message}]`; }
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  ensureOutputDir();

  const networkTraffic = [];
  const navigationLog  = [];
  const visited        = new Set();
  const requestMap     = new WeakMap();
  const counter        = { n: 0 };

  log('🚀 Iniciando scraper de candidato — Disjob');

  let browser = await puppeteer.launch(launchBrowserArgs());
  let [page]  = await browser.pages();
  setupPageHandlers(page, networkTraffic, requestMap, counter);

  // ── Login ─────────────────────────────────────────────────────────────────
  await loginCandidato(page);

  // Cola inicial: páginas candidato + formularios de acción clave
  const candidatePages = [
    'https://www.disjob.com/home_cand.php',
    'https://www.disjob.com/candidaturas.php',       // baja de postulación
    'https://www.disjob.com/cv_completo.php',         // actualizar perfil
    'https://www.disjob.com/ofertas_cand.php',        // buscar ofertas
    'https://www.disjob.com/cambio_pwd.php',
    'https://www.disjob.com/contacta.php',
    // Páginas de oferta individuales — formulario de postulación
    'https://www.disjob.com/info_oferta.php?Up=EJFMF',
    'https://www.disjob.com/info_oferta.php?Up=EJKDM',
    'https://www.disjob.com/info_oferta.php?Up=EJDLJ',
    'https://www.disjob.com/info_oferta.php?Up=EJEJE',
    'https://www.disjob.com/info_oferta.php?Up=EJKIM',
    'https://www.disjob.com/info_oferta.php?Up=EJKMM',
    // Páginas informativas
    'https://www.disjob.com/noticias.php',
    'https://www.disjob.com/quienes_somos.php',
    'https://www.disjob.com/politica_privacidad.php',
    'https://www.disjob.com/politica_cookies.php',
    'https://www.disjob.com/recordatorio.php',
    'https://www.disjob.com/unete.php',
    'https://www.disjob.com/ofertas.php',
    'https://www.disjob.com/colaboradores.php',
  ];

  const queue = [...new Set(candidatePages.map(u => normalizeUrl(u, START_URL)).filter(Boolean))];

  // ── Crawl BFS ─────────────────────────────────────────────────────────────
  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;

    if (SKIP_URLS.some(s => url.includes(s))) {
      log(`   ⏭️  Saltando (protegida): ${url}`);
      continue;
    }

    visited.add(url);
    log(`🌐 [${visited.size}/${MAX_PAGES}] ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
      await delay(PAGE_WAIT_MS);

      // Verificar sesión activa
      const currentUrl = page.url();
      if (currentUrl.includes('www.disjob.com') && currentUrl.includes('home.php') && !currentUrl.includes('home_cand')) {
        log('   🔄 Sesión expirada — reloginando...');
        await loginCandidato(page);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
        await delay(PAGE_WAIT_MS);
      }

      const pageInfo = await deepAnalyzePage(page, url);
      navigationLog.push(pageInfo);

      log(`   ✅ "${pageInfo.title}" — ${pageInfo.links.length} links | ${pageInfo.forms.length} forms | ${pageInfo.buttons.length} buttons`);

      // Guardado automático cada AUTOSAVE_EVERY páginas
      if (visited.size % AUTOSAVE_EVERY === 0) {
        fs.writeFileSync(path.join(OUTPUT_DIR, 'network_traffic_latest.json'), JSON.stringify(networkTraffic, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'navigation_log_latest.json'),  JSON.stringify(navigationLog,  null, 2));
        log(`   💾 Autosave — ${navigationLog.length} páginas | ${networkTraffic.length} peticiones`);
      }

      // Encolar links internos descubiertos
      for (const { href } of pageInfo.links) {
        if (!href || !isInternal(href)) continue;
        const normalized = normalizeUrl(href, currentUrl);
        if (normalized && !visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized);
        }
      }

    } catch (err) {
      log(`   ⚠️  Error en ${url}: ${err.message}`);
      navigationLog.push({ url, error: err.message, timestamp: new Date().toISOString() });

      // Si el frame/browser se desconectó → restart completo del browser
      const isFatal = err.message.includes('detached') || err.message.includes('Target closed')
                   || err.message.includes('Session closed') || err.message.includes('Protocol error');
      if (isFatal) {
        log('   🔧 Browser comprometido — reiniciando browser completo...');
        try { await browser.close(); } catch {}
        await delay(2000);
        try {
          browser = await puppeteer.launch(launchBrowserArgs());
          [page]  = await browser.pages();
          setupPageHandlers(page, networkTraffic, requestMap, counter);
          await loginCandidato(page);
          log('   ✅ Browser reiniciado y sesión restaurada');
        } catch (restartErr) {
          log(`   ❌ No se pudo reiniciar el browser: ${restartErr.message}`);
          break;
        }
      }
    }
  }

  // ── Guardado final ────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const trafficFile = path.join(OUTPUT_DIR, `network_traffic_CAND_${ts}.json`);
  const navFile     = path.join(OUTPUT_DIR, `navigation_log_CAND_${ts}.json`);

  fs.writeFileSync(trafficFile, JSON.stringify(networkTraffic, null, 2));
  fs.writeFileSync(navFile,     JSON.stringify(navigationLog,  null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'network_traffic_latest.json'), JSON.stringify(networkTraffic, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'navigation_log_latest.json'),  JSON.stringify(navigationLog,  null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ SESIÓN CANDIDATO — CRAWL FINALIZADO');
  console.log('═'.repeat(60));
  console.log(`  Login como          : ${CANDIDATO_USUARIO}`);
  console.log(`  Páginas analizadas  : ${navigationLog.length}`);
  console.log(`  Peticiones red      : ${networkTraffic.length}`);
  console.log(`  Archivos en         : ${path.resolve(OUTPUT_DIR)}`);
  console.log(`  → ${navFile}`);
  console.log(`  → ${trafficFile}`);
  console.log('═'.repeat(60));

  await browser.close();
  process.exit(0);
})();
