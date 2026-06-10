const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = './disjob_output';
const BASE_URL   = 'https://www.disjob.com/home.php';
const SAVE_INTERVAL_MS = 5000; // Guardado automático cada 5 segundos
const NAVIGATION_TIMEOUT_MS = 120000;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const timestamp = () => new Date().toISOString();
const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

function isBrowserConnected(browser) {
  return Boolean(browser && typeof browser.isConnected === 'function' && browser.isConnected());
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function saveData(networkTraffic, navigationLog) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  // Siempre sobreescribe el archivo "latest" para tener el estado actual
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'network_traffic_latest.json'),
    JSON.stringify(networkTraffic, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'navigation_log_latest.json'),
    JSON.stringify(navigationLog, null, 2)
  );

  log(`💾 Datos guardados — ${networkTraffic.length} peticiones | ${navigationLog.length} páginas visitadas`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  ensureOutputDir();

  let browser;
  const networkTraffic = [];
  const navigationLog  = [];
  let requestCounter   = 0;
  let saveTimer        = null;

  // Mapa WeakMap para correlación exacta request → entry (sin race conditions)
  const requestMap = new WeakMap();

  try {
    log('🚀 Lanzando navegador — se abrirá una ventana real para que navegues manualmente...');

    browser = await puppeteer.launch({
      headless: false,          // VENTANA VISIBLE para navegación manual
      defaultViewport: null,    // Usa el tamaño real de la ventana
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Evitar bloqueos de CORS en algunos portales
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    });

    const [page] = await browser.pages();

    // ── Interceptar TODAS las peticiones de red ──────────────────────────────
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();

      // Capturamos solo lo relevante (excluimos imágenes, fuentes, media)
      if (['xhr', 'fetch', 'document', 'script'].includes(resourceType)) {
        const entry = {
          id:           `req_${++requestCounter}`,
          url:          request.url(),
          method:       request.method(),
          headers:      request.headers(),
          payload:      request.postData() ?? null,
          resourceType,
          timestamp:    timestamp(),
          response:     null   // Se rellena en el listener de 'response'
        };

        requestMap.set(request, entry);
        networkTraffic.push(entry);
      }

      request.continue();
    });

    page.on('response', async (response) => {
      const request      = response.request();
      const resourceType = request.resourceType();

      if (['xhr', 'fetch', 'document'].includes(resourceType)) {
        const entry = requestMap.get(request);
        if (!entry) return;

        entry.response = {
          status:  response.status(),
          headers: response.headers(),
          body:    null
        };

        try {
          if (response.status() >= 200 && response.status() < 300) {
            const textData = await Promise.race([
              response.text(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 8000)
              )
            ]);

            try {
              entry.response.body = JSON.parse(textData);
            } catch {
              entry.response.body = textData.substring(0, 10000);
            }
          }
        } catch (err) {
          entry.response.body = `[Error leyendo respuesta: ${err.message}]`;
        }
      }
    });

    // ── Registrar cada navegación de página ──────────────────────────────────
    page.on('framenavigated', async (frame) => {
      // Solo el frame principal (no iframes)
      if (frame !== page.mainFrame()) return;

      const url = frame.url();
      if (!url || url === 'about:blank') return;

      // Pequeña pausa para que el DOM esté listo antes de extraer metadatos
      await delay(800);

      let pageInfo = {
        url,
        timestamp: timestamp(),
        title:     null,
        metaDesc:  null,
        headings:  [],
        links:     []
      };

      try {
        pageInfo = await page.evaluate(() => {
          const headings = Array.from(
            document.querySelectorAll('h1, h2, h3')
          ).map(h => ({ tag: h.tagName, text: h.innerText.trim() })).slice(0, 20);

          const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({
              text: a.innerText.trim().substring(0, 80),
              href: a.getAttribute('href')
            }))
            .filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('javascript:'))
            .slice(0, 50);

          return {
            url:      window.location.href,
            title:    document.title,
            metaDesc: document.querySelector('meta[name="description"]')?.content ?? null,
            headings,
            links
          };
        });
      } catch {
        // Si falla la evaluación (ej. página cargando) dejamos lo básico
        pageInfo.url = url;
      }

      navigationLog.push(pageInfo);
      log(`📄 Página registrada: ${pageInfo.title || url}`);
    });

    // ── Guardado automático periódico ────────────────────────────────────────
    saveTimer = setInterval(() => saveData(networkTraffic, navigationLog), SAVE_INTERVAL_MS);

    // ── Navegar a la home de Disjob ──────────────────────────────────────────
    log(`🌐 Abriendo ${BASE_URL}...`);
    try {
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS
      });
    } catch (error) {
      log('⚠️ La carga inicial tardó más de lo esperado; reintentando con una estrategia más flexible...');
      await page.goto(BASE_URL, {
        waitUntil: 'load',
        timeout: NAVIGATION_TIMEOUT_MS
      });
    }

    // ── Instrucciones en consola ─────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('  🖱️  MODO NAVEGACIÓN MANUAL ACTIVO');
    console.log('═'.repeat(60));
    console.log('  Navega libremente en el navegador que se ha abierto.');
    console.log('  Todo el tráfico HTTP y las páginas visitadas se');
    console.log('  irán guardando automáticamente en:');
    console.log(`  📁 ${path.resolve(OUTPUT_DIR)}`);
    console.log('');
    console.log('  Archivos de salida:');
    console.log('  • network_traffic_latest.json  → Todas las peticiones/respuestas');
    console.log('  • navigation_log_latest.json   → Páginas visitadas con metadatos');
    console.log('');
    console.log('  Cuando termines, escribe  GUARDAR  y pulsa Enter para');
    console.log('  hacer un guardado final con timestamp único.');
    console.log('  Escribe  SALIR  para cerrar el navegador y terminar.');
    console.log('═'.repeat(60) + '\n');

    // ── CLI simple para controlar el script mientras navegas ─────────────────
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    rl.prompt();

    rl.on('line', (line) => {
      const cmd = line.trim().toUpperCase();

      if (cmd === 'GUARDAR') {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const trafficFile = path.join(OUTPUT_DIR, `network_traffic_${ts}.json`);
        const navFile     = path.join(OUTPUT_DIR, `navigation_log_${ts}.json`);

        fs.writeFileSync(trafficFile, JSON.stringify(networkTraffic, null, 2));
        fs.writeFileSync(navFile,     JSON.stringify(navigationLog,  null, 2));

        log(`✅ Guardado manual completado:`);
        log(`   → ${trafficFile}`);
        log(`   → ${navFile}`);

      } else if (cmd === 'SALIR' || cmd === 'EXIT') {
        log('👋 Cerrando...');
        rl.close();
        cleanup();

      } else if (cmd === 'STATS') {
        log(`📊 Stats actuales:`);
        log(`   Peticiones capturadas : ${networkTraffic.length}`);
        log(`   Páginas visitadas     : ${navigationLog.length}`);
        navigationLog.forEach((p, i) =>
          console.log(`   ${i + 1}. ${p.title || p.url}`)
        );

      } else if (cmd === 'HELP' || cmd === '?') {
        console.log('  Comandos disponibles:');
        console.log('  GUARDAR  → Guardado manual con timestamp');
        console.log('  STATS    → Ver resumen de lo capturado');
        console.log('  SALIR    → Cerrar y terminar');

      } else if (cmd !== '') {
        console.log(`  Comando no reconocido. Escribe HELP para ver los disponibles.`);
      }

      rl.prompt();
    });

    // Detectar si el usuario cierra el navegador manualmente
    browser.on('disconnected', () => {
      log('🔌 Navegador cerrado manualmente. Guardando datos finales...');
      rl.close();
      cleanup(false); // false = no intentar cerrar browser (ya está cerrado)
    });

    // ── Función de limpieza y guardado final ─────────────────────────────────
    async function cleanup(closeBrowser = true) {
      clearInterval(saveTimer);

      // Guardado final con timestamp
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const trafficFile = path.join(OUTPUT_DIR, `network_traffic_FINAL_${ts}.json`);
      const navFile     = path.join(OUTPUT_DIR, `navigation_log_FINAL_${ts}.json`);

      fs.writeFileSync(trafficFile, JSON.stringify(networkTraffic, null, 2));
      fs.writeFileSync(navFile,     JSON.stringify(navigationLog,  null, 2));
      // También sobreescribir el "latest"
      saveData(networkTraffic, navigationLog);

      console.log('\n' + '═'.repeat(60));
      console.log('  ✅ SESIÓN FINALIZADA');
      console.log('═'.repeat(60));
      console.log(`  Peticiones totales capturadas : ${networkTraffic.length}`);
      console.log(`  Páginas visitadas             : ${navigationLog.length}`);
      console.log(`  Archivos guardados en         : ${path.resolve(OUTPUT_DIR)}`);
      console.log('═'.repeat(60));

      if (closeBrowser && isBrowserConnected(browser)) {
        await browser.close();
      }

      process.exit(0);
    }

    // Capturar Ctrl+C
    process.on('SIGINT', () => {
      log('\n⚠️  Ctrl+C detectado. Guardando y cerrando...');
      cleanup();
    });

  } catch (error) {
    console.error('❌ Error fatal:', error);
    if (isBrowserConnected(browser)) {
      await browser.close();
    }
    process.exit(1);
  }
})();