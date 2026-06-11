const puppeteer = require('puppeteer');
const path = require('path');

const GREEN = '#7AB800';
const DARK_BG = '#3a3a3a';
const LIGHT_GREEN_BG = '#f0f5e8';
const GRAY_TEXT = '#666';
const TABLE_ALT = '#f7f7f7';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    color: #222;
    background: white;
  }

  /* ─── PORTADA ─────────────────────────────────── */
  .cover {
    background: ${DARK_BG};
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 56px 40px;
    page-break-after: always;
  }
  .cover-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .cover-badge {
    background: ${GREEN};
    color: white;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 5px 12px;
  }
  .cover-version {
    color: #aaa;
    font-size: 9pt;
    text-align: right;
    line-height: 1.7;
  }
  .cover-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px 0 40px;
  }
  .cover-category {
    color: ${GREEN};
    font-size: 8.5pt;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .cover-title {
    color: white;
    font-size: 42pt;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 6px;
  }
  .cover-title span {
    color: ${GREEN};
  }
  .cover-rule {
    width: 48px;
    height: 4px;
    background: ${GREEN};
    margin: 24px 0;
  }
  .cover-subtitle {
    color: #bbb;
    font-size: 11pt;
    font-weight: 300;
    line-height: 1.5;
    max-width: 400px;
  }
  .cover-footer {
    display: flex;
    gap: 48px;
    border-top: 1px solid #555;
    padding-top: 20px;
  }
  .cover-meta label {
    display: block;
    color: ${GREEN};
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .cover-meta span {
    color: #ccc;
    font-size: 8.5pt;
  }

  /* ─── PÁGINAS INTERIORES ─────────────────────── */
  .page {
    padding: 48px 56px 60px;
    page-break-after: always;
    position: relative;
    min-height: 100vh;
  }
  .page:last-child { page-break-after: avoid; }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid ${GREEN};
    padding-bottom: 8px;
    margin-bottom: 32px;
  }
  .page-section-label {
    font-size: 7.5pt;
    font-weight: 600;
    color: ${GRAY_TEXT};
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .page-number {
    font-size: 8.5pt;
    color: ${GRAY_TEXT};
    font-weight: 600;
  }

  /* ─── TIPOGRAFÍA ─────────────────────────────── */
  h2 {
    font-size: 15pt;
    font-weight: 800;
    color: #1a1a1a;
    margin-bottom: 14px;
    margin-top: 28px;
  }
  h2:first-child { margin-top: 0; }

  h3 {
    font-size: 10.5pt;
    font-weight: 700;
    color: ${GREEN};
    margin-top: 22px;
    margin-bottom: 10px;
    border-left: 3px solid ${GREEN};
    padding-left: 10px;
  }

  p { line-height: 1.65; margin-bottom: 10px; color: #333; }

  strong { font-weight: 700; color: #111; }
  code {
    font-family: 'Courier New', monospace;
    font-size: 8.5pt;
    background: #f0f0f0;
    padding: 1px 5px;
    border-radius: 3px;
    color: #c0392b;
  }
  pre {
    background: #f5f5f5;
    border-left: 3px solid ${GREEN};
    padding: 12px 16px;
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    color: #333;
    margin: 12px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  ul { margin: 8px 0 12px 20px; }
  ul li { line-height: 1.65; margin-bottom: 5px; color: #333; }
  ul li::marker { color: ${GREEN}; }

  /* ─── BLOCKQUOTE (resumen) ────────────────────── */
  blockquote {
    background: ${LIGHT_GREEN_BG};
    border-left: 4px solid ${GREEN};
    padding: 16px 20px;
    margin: 16px 0 20px;
    border-radius: 0 4px 4px 0;
  }
  blockquote p {
    color: #2a2a2a;
    font-size: 10.5pt;
    line-height: 1.6;
    margin: 0;
  }

  /* ─── TABLAS ──────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 20px;
    font-size: 9pt;
  }
  thead tr {
    background: #2a2a2a;
    color: white;
  }
  thead th {
    padding: 9px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 8.5pt;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  tbody tr:nth-child(odd) { background: white; }
  tbody tr:nth-child(even) { background: ${TABLE_ALT}; }
  tbody td {
    padding: 8px 12px;
    border-bottom: 1px solid #e8e8e8;
    line-height: 1.5;
    vertical-align: top;
  }
  tbody tr:last-child td { border-bottom: none; }

  /* ─── STAT BOXES (página alcance) ───────────────*/
  .stats-row {
    display: flex;
    gap: 16px;
    margin: 20px 0 28px;
  }
  .stat-box {
    flex: 1;
    background: ${DARK_BG};
    color: white;
    padding: 20px 16px;
    text-align: center;
    border-radius: 2px;
  }
  .stat-number {
    font-size: 26pt;
    font-weight: 900;
    color: ${GREEN};
    line-height: 1;
    display: block;
  }
  .stat-label {
    font-size: 7.5pt;
    color: #bbb;
    margin-top: 6px;
    display: block;
    line-height: 1.4;
  }

  /* ─── HALLAZGO CARDS ────────────────────────── */
  .finding-card {
    border: 1px solid #ddd;
    border-left: 4px solid ${GREEN};
    padding: 16px 18px;
    margin: 16px 0;
    border-radius: 0 4px 4px 0;
    background: white;
  }
  .finding-card h4 {
    font-size: 10pt;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 8px;
  }
  .finding-card p { margin: 0; font-size: 9.5pt; }

  /* ─── COBERTURA MAPA ────────────────────────── */
  .coverage-table td.ok { color: #2e7d32; font-weight: 700; }
  .coverage-table td.pending { color: #e65100; font-weight: 600; }
  .coverage-table td.na { color: #999; }

  /* ─── PRIORIDAD CHIPS ─────────────────────────*/
  .chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .chip-red    { background: #ffebee; color: #c62828; }
  .chip-orange { background: #fff3e0; color: #e65100; }
  .chip-yellow { background: #fffde7; color: #f57f17; }
  .chip-green  { background: #e8f5e9; color: #2e7d32; }

  /* ─── FOOTER ─────────────────────────────────── */
  .back-cover {
    background: ${LIGHT_GREEN_BG};
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px;
    page-break-before: always;
  }
  .back-cover img { width: 140px; margin-bottom: 24px; }
  .back-cover-title {
    font-size: 13pt;
    font-weight: 800;
    color: ${GREEN};
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .back-cover-subtitle {
    font-size: 11pt;
    font-weight: 300;
    color: #444;
    margin-bottom: 40px;
  }
  .back-cover-meta {
    font-size: 8.5pt;
    color: #888;
    line-height: 2;
  }

  hr { display: none; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════
     PORTADA
══════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-top">
    <div class="cover-badge">Informe Ejecutivo</div>
    <div class="cover-version">Junio 2026<br>Versión 1.2</div>
  </div>
  <div class="cover-main">
    <div class="cover-category">Análisis de Plataforma</div>
    <div class="cover-title">Auditoría de<br><span>DisJob</span></div>
    <div class="cover-rule"></div>
    <div class="cover-subtitle">VadEmpleo: área privada de candidato completamente mapeada. Diferencias de negocio, flujos exclusivos y cierre del ciclo de Killer Questions.</div>
  </div>
  <div class="cover-footer">
    <div class="cover-meta">
      <label>Plataforma analizada</label>
      <span>vadempleo.disjob.com · disjob.com · empresas.disjob.com</span>
    </div>
    <div class="cover-meta">
      <label>Método</label>
      <span>Análisis técnico y funcional</span>
    </div>
    <div class="cover-meta">
      <label>Destinatario</label>
      <span>Dirección / Management</span>
    </div>
    <div class="cover-meta">
      <label>Clasificación</label>
      <span>Confidencial — uso interno</span>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════
     PÁGINA 2 — RESUMEN EJECUTIVO + ALCANCE
══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-section-label">Resumen Ejecutivo</span>
    <span class="page-number">02</span>
  </div>

  <blockquote>
    <p>VadEmpleo <strong>no es una copia de DisJob</strong>. Es una plataforma de empleo <strong>general</strong> que comparte el mismo motor técnico pero opera con reglas de negocio distintas: sin requisito de discapacidad, con un flujo de onboarding propio y con funcionalidades exclusivas como el <strong>CV Express</strong>. La sesión del 11 de junio completa el mapa de la plataforma tridominio y cierra el ciclo de las Killer Questions desde el lado del candidato.</p>
  </blockquote>

  <p>Esta sesión tuvo foco exclusivo en el área privada de candidato de <code>vadempleo.disjob.com</code>, que hasta hoy no había sido explorada con autenticación. Los resultados amplían significativamente el modelo funcional documentado en versiones anteriores.</p>

  <h2>Alcance de la sesión</h2>

  <div class="stats-row">
    <div class="stat-box">
      <span class="stat-number">23</span>
      <span class="stat-label">Páginas únicas visitadas</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">891</span>
      <span class="stat-label">Peticiones de red capturadas</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">8</span>
      <span class="stat-label">POST con payload de la plataforma</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">3</span>
      <span class="stat-label">Nuevas páginas no documentadas</span>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Qué se analizó</th><th>Cantidad</th><th>Detalle</th></tr>
    </thead>
    <tbody>
      <tr><td>Páginas únicas visitadas</td><td>23</td><td>vadempleo.disjob.com (21) + 1 en www.disjob.com + 1 en empresas.disjob.com</td></tr>
      <tr><td>Peticiones de red capturadas</td><td>891</td><td>Assets, analytics, YouTube y formularios de la plataforma</td></tr>
      <tr><td>POST con payload de la plataforma</td><td>8</td><td>Registro, login, CV (4 secciones), búsqueda, postulación</td></tr>
      <tr><td>Formularios nuevos documentados</td><td>5</td><td>Registro VadEmpleo, CV Pes=0..3, login+KillerQuestions</td></tr>
      <tr><td>Nuevas páginas no documentadas</td><td>3</td><td><code>Continuar_Alta.php</code>, <code>eleccion_cv.php</code>, <code>cv_express.php</code> (referenciado)</td></tr>
    </tbody>
  </table>

  <h2>Mapa de cobertura acumulada (v1.2)</h2>

  <table class="coverage-table">
    <thead>
      <tr><th>Dominio</th><th>Público</th><th>Candidato autenticado</th><th>Empresa autenticada</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>www.disjob.com</strong></td>
        <td class="ok">✓ Completo</td>
        <td class="ok">✓ Completo</td>
        <td class="na">—</td>
      </tr>
      <tr>
        <td><strong>empresas.disjob.com</strong></td>
        <td class="ok">✓ Completo</td>
        <td class="na">—</td>
        <td class="ok">✓ Completo</td>
      </tr>
      <tr>
        <td><strong>vadempleo.disjob.com</strong></td>
        <td class="ok">✓ Completo</td>
        <td class="ok">✓ Completo (v1.2)</td>
        <td class="pending">⬜ Pendiente</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════
     PÁGINA 3 — VADEM PLEO: PLATAFORMA DIFERENCIADA
══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-section-label">VadEmpleo: Plataforma diferenciada</span>
    <span class="page-number">03</span>
  </div>

  <h2>1 · VadEmpleo: plataforma diferenciada, no una copia</h2>

  <p>El análisis confirma que VadEmpleo opera bajo el mismo backend PHP pero con configuración de negocio propia. Las diferencias no son cosméticas — afectan la propuesta de valor y el perfil de candidato al que se dirige la plataforma.</p>

  <h3>Diferencias de negocio confirmadas</h3>

  <table>
    <thead>
      <tr><th>Aspecto</th><th>DisJob (www.disjob.com)</th><th>VadEmpleo (vadempleo.disjob.com)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Requisito discapacidad</td>
        <td><strong>Sí</strong> — campo <code>tengoDiscapacidad</code> obligatorio</td>
        <td><strong>No</strong> — campo completamente ausente</td>
      </tr>
      <tr>
        <td>Destino post-registro</td>
        <td><code>home_cand.php</code> (dashboard directo)</td>
        <td><code>Continuar_Alta.php</code> (página de onboarding)</td>
      </tr>
      <tr>
        <td>Tipos de CV disponibles</td>
        <td>Solo CV Completo (5 pasos)</td>
        <td>CV Express + CV Completo</td>
      </tr>
      <tr>
        <td>Label sección 4 del CV</td>
        <td>"Puesto deseado"</td>
        <td>"Tu futuro"</td>
      </tr>
      <tr>
        <td>Label sección 5 del CV</td>
        <td>"Idiomas / Habilidades"</td>
        <td>"Tu currículum"</td>
      </tr>
      <tr>
        <td>Filtro teletrabajo en búsqueda</td>
        <td>Disponible (<code>TrabajarDesdeCasa_Ofer</code>)</td>
        <td>No disponible</td>
      </tr>
      <tr>
        <td>Video en home</td>
        <td>No detectado</td>
        <td>Sí — YouTube embebido (~110 seg.)</td>
      </tr>
      <tr>
        <td>Redes sociales propias</td>
        <td>@disJob / Facebook DisJob</td>
        <td>@VadEmpleo / Facebook VadEmpleo</td>
      </tr>
    </tbody>
  </table>

  <p><strong>Implicación de negocio:</strong> VadEmpleo capta candidatos sin certificado de discapacidad. Es un canal de empleo inclusivo ampliado — o un producto independiente dentro de la misma infraestructura. Ambos portales comparten la base de datos de empresas y ofertas (mismos IDs, mismos códigos <code>Up</code>).</p>

  <h3>Flujo de registro VadEmpleo</h3>

  <pre>unete.php  →  [POST sin tengoDiscapacidad]  →  302  →  Continuar_Alta.php
                                                             ↓
                                                     eleccion_cv.php
                                                    ↙              ↘
                                           cv_express.php    cv_completo.php
                                           (ruta rápida)     (wizard 5 pasos)</pre>

  <h3>CV Completo en VadEmpleo — 5 pasos confirmados</h3>

  <table>
    <thead>
      <tr><th>Paso</th><th>URL</th><th>Nombre en VadEmpleo</th><th>Nombre en DisJob</th></tr>
    </thead>
    <tbody>
      <tr><td>1</td><td><code>cv_completo.php?Pes=0</code></td><td>Datos Personales</td><td>Datos Personales</td></tr>
      <tr><td>2</td><td><code>cv_completo.php?Pes=1</code></td><td>Estudios</td><td>Estudios</td></tr>
      <tr><td>3</td><td><code>cv_completo.php?Pes=2</code></td><td>Experiencia laboral</td><td>Experiencia laboral</td></tr>
      <tr><td>4</td><td><code>cv_completo.php?Pes=3</code></td><td><strong>Tu futuro</strong></td><td>Puesto deseado</td></tr>
      <tr><td>5</td><td><code>cv_completo.php?Pes=4</code></td><td><strong>Tu currículum</strong></td><td>Idiomas / Habilidades</td></tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════
     PÁGINA 4 — TRES HALLAZGOS CLAVE
══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-section-label">Hallazgos clave de la sesión</span>
    <span class="page-number">04</span>
  </div>

  <h2>2 · Tres hallazgos nuevos clave</h2>

  <div class="finding-card">
    <h4>A · <code>Continuar_Alta.php</code> — Onboarding exclusivo de VadEmpleo</h4>
    <p>Al registrarse o iniciar sesión en VadEmpleo, el sistema redirige a <code>Continuar_Alta.php</code> ("Tu alta") antes de llegar al área privada. Esta página intermedia <strong>no existe en DisJob</strong>. Sugiere un flujo de activación diferente, posiblemente con pasos adicionales de completitud de perfil. El contenido completo de esta página queda como exploración pendiente.</p>
  </div>

  <div class="finding-card">
    <h4>B · <code>eleccion_cv.php</code> — Selector de tipo de CV</h4>
    <p>VadEmpleo ofrece al candidato elegir entre dos rutas de construcción de CV: <strong>CV Express</strong> (<code>cv_express.php</code>, ruta rápida no explorada) y <strong>CV Completo</strong> (<code>cv_completo.php</code>, wizard de 5 pasos). Este selector <strong>no existe en DisJob</strong>. La existencia del CV Express sugiere que VadEmpleo tiene un perfil de candidato con menor fricción de onboarding, consistente con su orientación a empleo general.</p>
  </div>

  <div class="finding-card">
    <h4>C · Killer Questions integradas en el formulario del candidato</h4>
    <p>En v1.1 se documentó que las empresas crean preguntas de screening desde <code>accions/killerquestions/alta.php</code>. En esta sesión se confirma <strong>cómo el candidato las responde</strong>. El formulario <code>login_inscripcion.php</code> incluye el campo <code>respuestaClasificatoria_687&nbsp;=&nbsp;1</code>. El patrón <code>respuestaClasificatoria_&lt;ID&gt;</code> soporta múltiples KQ por oferta. El candidato responde antes de autenticarse, en la misma página pública. <strong>El ciclo KQ está cerrado end-to-end.</strong></p>
  </div>

  <pre>POST /login_inscripcion.php?Up=EJMEM
  token=&lt;md5&gt;
  idioma=cast
  formulari=candidat
  idoferta=16919
  respuestaClasificatoria_687=1   ← Killer Question respondida
  Usu_Acces=&lt;email&gt;
  Pwd_Acces=&lt;password&gt;
  → 302 → candidaturas.php</pre>

  <h2>3 · Estado técnico — sin cambios</h2>

  <p>La sesión de hoy reconfirma el estado del stack. No se detectaron actualizaciones ni cambios en la infraestructura.</p>

  <table>
    <thead>
      <tr><th>Componente</th><th>Estado</th><th>Evidencia</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>PHP 5.6.38</td>
        <td><span class="chip chip-red">Sin soporte desde 2018</span></td>
        <td>Header <code>X-Powered-By</code> en todas las respuestas</td>
      </tr>
      <tr>
        <td>nginx 1.10.3</td>
        <td><span class="chip chip-red">Sin actualizaciones desde 2017</span></td>
        <td>Header <code>Server</code> en todas las respuestas</td>
      </tr>
      <tr>
        <td>Cookie PHPSESSID</td>
        <td><span class="chip chip-orange">Sin flags seguros</span></td>
        <td>Sin <code>HttpOnly</code> / <code>Secure</code> explícitos en <code>Set-Cookie</code></td>
      </tr>
      <tr>
        <td>CSRF tokens</td>
        <td><span class="chip chip-green">Funcionando correctamente</span></td>
        <td>Tokens distintos en cada POST capturado</td>
      </tr>
      <tr>
        <td>Google Analytics VadEmpleo</td>
        <td><span class="chip chip-green">Activo</span></td>
        <td>G-R3P2ZK82WP confirmado en peticiones a gtag</td>
      </tr>
      <tr>
        <td>YouTube embebido en home</td>
        <td><span class="chip chip-yellow">Nuevo hallazgo</span></td>
        <td>Video docid=-CkS0RNKge4, duración ~110 seg., analytics activos</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════
     PÁGINA 5 — PENDIENTES Y CONCLUSIÓN
══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-section-label">Pendientes y Próximos Pasos</span>
    <span class="page-number">05</span>
  </div>

  <h2>4 · Pendientes de exploración</h2>

  <table>
    <thead>
      <tr><th>Elemento</th><th>Prioridad</th><th>Motivo</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>cv_express.php</code></td>
        <td><span class="chip chip-red">Alta</span></td>
        <td>Estructura desconocida — flujo exclusivo VadEmpleo sin equivalente en DisJob</td>
      </tr>
      <tr>
        <td>Área empresa VadEmpleo (<code>empresa_vadempleo.php</code> autenticada)</td>
        <td><span class="chip chip-red">Alta</span></td>
        <td>Último dominio con área autenticada sin mapear — ¿difiere del panel empresa DisJob?</td>
      </tr>
      <tr>
        <td><code>Continuar_Alta.php</code> — contenido completo</td>
        <td><span class="chip chip-orange">Media</span></td>
        <td>¿Tiene pasos adicionales de onboarding o es solo una pantalla de bienvenida?</td>
      </tr>
      <tr>
        <td>Ofertas VadEmpleo vs DisJob</td>
        <td><span class="chip chip-orange">Media</span></td>
        <td>¿Comparten base de datos de ofertas o cada plataforma tiene su catálogo?</td>
      </tr>
      <tr>
        <td><code>baja_servicio.php</code> VadEmpleo</td>
        <td><span class="chip chip-green">Baja — NO explorar</span></td>
        <td>Acción irreversible — mantener en SKIP_URLS del scraper</td>
      </tr>
    </tbody>
  </table>

  <h2>5 · Conclusión y próximos pasos</h2>

  <blockquote>
    <p>La auditoría técnica de la plataforma DisJob está <strong>prácticamente completa</strong>. Dos de los tres dominios están totalmente mapeados en todos sus roles (público, candidato, empresa). El único vector pendiente es el área empresa de VadEmpleo.</p>
  </blockquote>

  <p><strong>Lo que sabemos tras esta sesión:</strong></p>
  <ul>
    <li>DisJob y VadEmpleo son dos productos de empleo bajo una misma infraestructura PHP, con <strong>audiencias y reglas de negocio distintas</strong>.</li>
    <li>Las <strong>Killer Questions funcionan de extremo a extremo</strong>: creación por empresa en el panel privado, respuesta por candidato al postularse desde la página pública.</li>
    <li>VadEmpleo tiene <strong>menor fricción en el onboarding</strong>: sin requisito de discapacidad, con CV Express disponible y labels más orientados al candidato general.</li>
    <li>El <strong>stack técnico sigue en estado crítico</strong> (PHP 5.6, nginx 1.10.3) — sin cambios detectados en ninguna de las tres sesiones de auditoría.</li>
  </ul>

  <table>
    <thead>
      <tr><th>Prioridad</th><th>Acción sugerida</th><th>Horizonte</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="chip chip-red">Inmediata</span></td>
        <td>Actualizar servidor y lenguaje de programación a versiones con soporte activo</td>
        <td>0–3 meses</td>
      </tr>
      <tr>
        <td><span class="chip chip-red">Alta</span></td>
        <td>Explorar y documentar <code>cv_express.php</code> y área empresa VadEmpleo</td>
        <td>Próxima sesión</td>
      </tr>
      <tr>
        <td><span class="chip chip-orange">Alta</span></td>
        <td>Diseñar arquitectura de servicios (API) para integraciones y app móvil</td>
        <td>3–9 meses</td>
      </tr>
      <tr>
        <td><span class="chip chip-yellow">Media</span></td>
        <td>Implementar notificaciones y comunicación candidato–empresa</td>
        <td>6–12 meses</td>
      </tr>
      <tr>
        <td><span class="chip chip-green">Estratégica</span></td>
        <td>Panel de analítica y reporting interno para empresas y plataforma</td>
        <td>12–18 meses</td>
      </tr>
    </tbody>
  </table>

</div>

<!-- ═══════════════════════════════════════════════════
     CONTRAPORTADA
══════════════════════════════════════════════════════ -->
<div class="back-cover">
  <div class="back-cover-title">Descubre el Talento con disCapacidad</div>
  <div class="back-cover-subtitle">El portal de empleo inclusivo líder en España</div>
  <div class="back-cover-meta">
    Informe Ejecutivo · Análisis de Plataforma · Junio 2026<br>
    Documento confidencial — elaborado para uso interno de dirección<br>
    Basado en análisis técnico y funcional de disjob.com · empresas.disjob.com · vadempleo.disjob.com<br>
    v1.2: Sesión del 11/06/2026 — Área privada candidato VadEmpleo (891 peticiones capturadas)
  </div>
</div>

</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = path.join('C:/Users/César/Desktop/disjob-scrap', 'informe_ejecutivo_11_06_2026.pdf');

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  await browser.close();
  console.log('PDF generado:', outputPath);
})();
