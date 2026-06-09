const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.resolve('./disjob.png');
const logoB64 = fs.existsSync(LOGO_PATH)
  ? `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`
  : '';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  :root {
    --verde:    #7CB829;
    --gris:     #B4B2A9;
    --verde-cl: #EAF3DE;
    --oscuro:   #2C2C2A;
    --blanco:   #FFFFFF;
    --borde:    #D8DDD0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    color: var(--oscuro);
    background: var(--blanco);
    line-height: 1.65;
  }
  .cover {
    background: var(--oscuro);
    width: 794px; height: 1123px;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 60px 64px 52px; color: var(--blanco);
  }
  .cover-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-badge { background: var(--verde); color: var(--blanco); font-size: 8pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; padding: 6px 14px; border-radius: 3px; }
  .cover-date { color: var(--gris); font-size: 9pt; text-align: right; line-height: 1.5; }
  .cover-center { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 0 30px; }
  .cover-label { color: var(--verde); font-size: 9pt; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 18px; }
  .cover-title { font-size: 34pt; font-weight: 700; line-height: 1.15; color: var(--blanco); margin-bottom: 20px; }
  .cover-title span { color: var(--verde); }
  .cover-subtitle { font-size: 13pt; font-weight: 300; color: var(--gris); max-width: 480px; line-height: 1.5; }
  .cover-divider { width: 60px; height: 3px; background: var(--verde); margin: 28px 0; }
  .cover-meta { display: flex; gap: 36px; color: var(--gris); font-size: 8pt; padding-top: 28px; border-top: 1px solid #44443f; flex-wrap: wrap; }
  .cover-meta strong { display: block; color: var(--blanco); font-weight: 500; margin-bottom: 2px; font-size: 8.5pt; }

  .page { padding: 44px 64px 60px; width: 794px; min-height: 1123px; position: relative; }
  .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--verde); padding-bottom: 10px; margin-bottom: 28px; }
  .page-header-title { font-size: 8pt; font-weight: 600; color: var(--gris); letter-spacing: 0.12em; text-transform: uppercase; }
  .page-num { font-size: 8pt; color: var(--gris); }

  .section { margin-bottom: 28px; }
  .section-title { font-size: 13pt; font-weight: 700; color: var(--oscuro); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .section-title .num { background: var(--verde); color: var(--blanco); width: 26px; height: 26px; border-radius: 50%; font-size: 9pt; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .section-sub { font-size: 10pt; font-weight: 600; color: var(--verde); margin: 36px 0 20px; padding-bottom: 4px; border-bottom: 1px solid var(--borde); }

  p { margin-bottom: 8px; font-size: 10pt; }

  .exec-highlight { background: var(--verde-cl); border-left: 4px solid var(--verde); border-radius: 0 6px 6px 0; padding: 14px 18px; margin-bottom: 14px; font-size: 10.5pt; line-height: 1.6; }
  .exec-highlight strong { color: var(--verde); }

  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .stat-card { background: var(--oscuro); border-radius: 8px; padding: 16px 12px; text-align: center; color: var(--blanco); }
  .stat-card .val { font-size: 22pt; font-weight: 700; color: var(--verde); line-height: 1; display: block; margin-bottom: 6px; }
  .stat-card .lbl { font-size: 7pt; color: var(--gris); line-height: 1.35; }

  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 9pt; }
  thead tr { background: var(--oscuro); color: var(--blanco); }
  thead th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 8pt; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid var(--borde); }
  tbody tr:nth-child(even) { background: var(--verde-cl); }
  tbody td { padding: 7px 10px; vertical-align: top; font-size: 8.5pt; }
  tbody td:first-child { font-weight: 500; }

  .check-list { list-style: none; margin: 8px 0; }
  .check-list li { padding: 5px 0 5px 26px; position: relative; border-bottom: 1px solid var(--borde); font-size: 9.5pt; }
  .check-list li:last-child { border-bottom: none; }
  .check-list li::before { content: '✓'; position: absolute; left: 0; color: var(--verde); font-weight: 700; font-size: 10pt; }

  .flow { display: flex; gap: 6px; margin: 14px 0 30px; }
  .flow-step { flex: 1; background: var(--verde-cl); border: 1.5px solid var(--verde); border-radius: 6px; padding: 16px 10px; text-align: center; }
  .flow-step .step-num { background: var(--verde); color: var(--blanco); width: 18px; height: 18px; border-radius: 50%; font-size: 7.5pt; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 5px; }
  .flow-step .step-title { font-weight: 600; font-size: 8.5pt; color: var(--oscuro); }
  .flow-step .step-desc { font-size: 7.5pt; color: #555; margin-top: 2px; line-height: 1.35; }

  .risk-card { border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 10px; }
  .risk-card.critical { background: #fde8e8; border-left: 4px solid #d32f2f; }
  .risk-card.high { background: #fff3e0; border-left: 4px solid #f57c00; }
  .risk-card.medium { background: #fffde7; border-left: 4px solid #f9a825; }
  .risk-card .risk-icon { font-size: 14pt; flex-shrink: 0; line-height: 1.2; }
  .risk-card .risk-title { font-weight: 600; font-size: 9.5pt; margin-bottom: 2px; }
  .risk-card .risk-desc { font-size: 8.5pt; color: #555; line-height: 1.4; }

  .opp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
  .opp-card { background: var(--verde-cl); border-radius: 8px; padding: 14px; }
  .opp-card .opp-icon { font-size: 16pt; margin-bottom: 4px; }
  .opp-card .opp-title { font-weight: 700; font-size: 9.5pt; color: var(--oscuro); margin-bottom: 4px; }
  .opp-card .opp-text { font-size: 8.5pt; color: #555; line-height: 1.4; }

  .back-cover { background: var(--verde-cl); width: 794px; height: 1123px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 80px 64px; }
  .back-cover img { max-width: 260px; }
  .back-cover .tagline { font-size: 11.5pt; color: var(--oscuro); font-weight: 300; letter-spacing: 0.04em; text-align: center; }
  .back-cover .tagline strong { color: var(--verde); font-weight: 700; }
  .back-cover .doc-ref { font-size: 8pt; color: var(--gris); text-align: center; line-height: 1.7; }

  .text-small { font-size: 8.5pt; }
  .text-gris { color: var(--gris); }
  .mt-4 { margin-top: 14px; }
</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover" id="p1">
  <div class="cover-top">
    <div class="cover-badge">Informe Ejecutivo</div>
    <div class="cover-date">Junio 2026<br/>Versión 1.0</div>
  </div>
  <div class="cover-center">
    <div class="cover-label">Análisis de Plataforma</div>
    <div class="cover-title">Auditoría de<br/><span>DisJob</span></div>
    <div class="cover-divider"></div>
    <div class="cover-subtitle">Diagnóstico del estado actual, flujos de negocio y oportunidades de evolución de la plataforma de empleo inclusivo.</div>
  </div>
  <div class="cover-meta">
    <div><strong>Plataforma analizada</strong>disjob.com · empresas.disjob.com</div>
    <div><strong>Método</strong>Análisis técnico y funcional</div>
    <div><strong>Destinatario</strong>Dirección / Management</div>
    <div><strong>Clasificación</strong>Confidencial — uso interno</div>
  </div>
</div>

<!-- PÁG 2 -->
<div class="page" id="p2">
  <div class="page-header"><span class="page-header-title">Resumen Ejecutivo</span><span class="page-num">02</span></div>
  <div class="section">
    <div class="exec-highlight">DisJob es un <strong>portal de empleo especializado en personas con discapacidad</strong>, operativo en España. La plataforma conecta candidatos con certificado de discapacidad ≥ 33% con empresas que publican ofertas de trabajo inclusivas.</div>
    <p>Este informe recoge los resultados del análisis técnico y funcional realizado sobre la plataforma DisJob. El objetivo es proporcionar una visión clara del <strong>estado actual del sistema</strong>, sus flujos de negocio y las oportunidades de mejora más relevantes para la dirección.</p>
    <p>El análisis se realizó mediante la exploración sistemática de la plataforma, captura del tráfico de red y revisión de todos los formularios e interacciones disponibles. <strong>No se tuvo acceso al código fuente</strong>; todo lo documentado se obtuvo a partir del comportamiento observable de la aplicación.</p>
  </div>
  <div class="stats-row">
    <div class="stat-card"><span class="val">3</span><span class="lbl">Dominios / marcas operativas</span></div>
    <div class="stat-card"><span class="val">2</span><span class="lbl">Tipos de usuario: candidato y empresa</span></div>
    <div class="stat-card"><span class="val">23</span><span class="lbl">Formularios identificados y documentados</span></div>
  </div>
  <div class="section">
    <div class="section-title"><span class="num">1</span>¿Qué hace DisJob?</div>
    <p>DisJob opera como <strong>intermediario de empleo inclusivo</strong>. Su propuesta de valor se articula en dos frentes:</p>
    <ul class="check-list">
      <li><strong>Para candidatos:</strong> permite registrarse, construir un perfil/CV completo, buscar ofertas filtradas por sector y provincia, postularse a puestos internos y hacer seguimiento de sus candidaturas.</li>
      <li><strong>Para empresas:</strong> disponen de un portal separado (empresas.disjob.com) desde donde pueden registrarse, publicar ofertas y gestionar sus procesos de selección inclusivos.</li>
      <li><strong>VadEmpleo</strong> (vadempleo.disjob.com) es una segunda marca dentro del mismo sistema, orientada a empleo general sin el foco exclusivo en discapacidad.</li>
      <li>Algunas ofertas son <strong>externas</strong>: DisJob actúa como escaparate y redirige al candidato al portal de la empresa contratante.</li>
    </ul>
  </div>
  <div class="section">
    <div class="section-title"><span class="num">2</span>Alcance del análisis</div>
    <table>
      <thead><tr><th>Qué se analizó</th><th>Cantidad</th><th>Detalle</th></tr></thead>
      <tbody>
        <tr><td>Páginas visitadas</td><td>74 únicas</td><td>Portal candidato, empresa y público</td></tr>
        <tr><td>Peticiones de red capturadas</td><td>437+</td><td>Formularios, sesiones, redirecciones</td></tr>
        <tr><td>Formularios documentados</td><td>23</td><td>Con todos sus campos, tipos y validaciones</td></tr>
        <tr><td>Flujos de negocio mapeados</td><td>8</td><td>Registro, login, búsqueda, postulación, CV…</td></tr>
        <tr><td>Sesiones de usuario simuladas</td><td>3</td><td>Candidato autenticado, público, multi-sesión</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- PÁG 3 -->
<div class="page" id="p3">
  <div class="page-header"><span class="page-header-title">Cómo funciona la plataforma</span><span class="page-num">03</span></div>
  <div class="section">
    <div class="section-title"><span class="num">3</span>Flujos principales de negocio</div>
    <p>La plataforma soporta cuatro grandes recorridos de usuario:</p>
    <div class="section-sub">A · Registro y alta de candidato</div>
    <div class="flow">
      <div class="flow-step"><div class="step-num">1</div><div class="step-title">Acceso</div><div class="step-desc">El candidato entra en la página de alta</div></div>
      <div class="flow-step"><div class="step-num">2</div><div class="step-title">Datos básicos</div><div class="step-desc">Nombre, email, contraseña</div></div>
      <div class="flow-step"><div class="step-num">3</div><div class="step-title">Consentimiento</div><div class="step-desc">Certificado discapacidad + LOPD</div></div>
      <div class="flow-step"><div class="step-num">4</div><div class="step-title">Panel propio</div><div class="step-desc">Redirige al dashboard del candidato</div></div>
    </div>
    <p class="text-small text-gris">El sistema exige confirmar la posesión del certificado de discapacidad (≥ 33% vigente) como requisito de registro.</p>
    <div class="section-sub">B · Búsqueda y postulación</div>
    <div class="flow">
      <div class="flow-step"><div class="step-num">1</div><div class="step-title">Búsqueda</div><div class="step-desc">Por sector, provincia, teletrabajo</div></div>
      <div class="flow-step"><div class="step-num">2</div><div class="step-title">Ficha de oferta</div><div class="step-desc">Descripción detallada del puesto</div></div>
      <div class="flow-step"><div class="step-num">3</div><div class="step-title">Confirmación</div><div class="step-desc">Ventana de confirmación</div></div>
      <div class="flow-step"><div class="step-num">4</div><div class="step-title">Inscripción</div><div class="step-desc">Candidatura registrada</div></div>
      <div class="flow-step"><div class="step-num">5</div><div class="step-title">Seguimiento</div><div class="step-desc">Visible en "Tus candidaturas"</div></div>
    </div>
    <p class="text-small text-gris">Las ofertas se clasifican en <strong>internas</strong> (postulación dentro de DisJob) y <strong>externas</strong> (redirigen al portal de la empresa contratante).</p>
    <div class="section-sub">C · Construcción del CV en 5 pasos</div>
    <table>
      <thead><tr><th>Paso</th><th>Qué se completa</th><th>Tipo de información</th></tr></thead>
      <tbody>
        <tr><td>Paso 1</td><td>Datos personales</td><td>Nombre, dirección, teléfono, documento, LinkedIn, vehículo…</td></tr>
        <tr><td>Paso 2</td><td>Estudios</td><td>Nivel educativo, especialidad, centro (se pueden añadir varios)</td></tr>
        <tr><td>Paso 3</td><td>Experiencia laboral</td><td>Empresa, cargo, fechas, sector, personas a cargo (múltiples)</td></tr>
        <tr><td>Paso 4</td><td>Puesto deseado</td><td>Título buscado, tipo de contrato, jornada, rango salarial</td></tr>
        <tr><td>Paso 5</td><td>Idiomas / Habilidades</td><td>Datos complementarios del perfil profesional</td></tr>
      </tbody>
    </table>
    <p class="text-small text-gris">El candidato puede subir un CV en PDF/Word. El sistema ofrece <strong>reconocimiento automático de texto (OCR)</strong> para extraer el contenido del archivo.</p>
    <div class="section-sub">D · Portal de empresa</div>
    <p>Las empresas acceden desde <strong>empresas.disjob.com</strong> con credenciales propias. La plataforma gestiona el registro de nuevas empresas y dispone de un portal de precios. El área privada de empresa no fue analizada en detalle por no disponer de credenciales.</p>
  </div>
</div>

<!-- PÁG 4 -->
<div class="page" id="p4">
  <div class="page-header"><span class="page-header-title">Estado técnico actual</span><span class="page-num">04</span></div>
  <div class="section">
    <div class="section-title"><span class="num">4</span>Tecnología en uso</div>
    <p>La plataforma fue construida con tecnologías que en su momento eran estándar. A continuación se describe el estado actual:</p>
    <table>
      <thead><tr><th>Componente</th><th>Qué es</th><th>Estado</th></tr></thead>
      <tbody>
        <tr><td>Servidor web (nginx 1.10.3)</td><td>Software que recibe las visitas</td><td>⚠ Sin actualizaciones desde 2017</td></tr>
        <tr><td>Lenguaje de programación (PHP 5.6)</td><td>Lenguaje en que está escrita la aplicación</td><td>🔴 Sin soporte desde dic. 2018</td></tr>
        <tr><td>Base de datos</td><td>Donde se guardan candidatos, empresas y ofertas</td><td>✅ Operativa (MySQL inferido)</td></tr>
        <tr><td>Diseño web (Bootstrap + jQuery)</td><td>El "motor" visual de la web</td><td>⚠ Versiones del año 2013</td></tr>
        <tr><td>Sesiones de usuario</td><td>Cómo el sistema recuerda que estás conectado</td><td>✅ Funcional</td></tr>
        <tr><td>Protección de formularios (CSRF)</td><td>Previene envíos maliciosos</td><td>✅ Implementada correctamente</td></tr>
        <tr><td>Google Analytics</td><td>Medición de visitas y comportamiento</td><td>✅ Activo (UA legacy + GA4)</td></tr>
      </tbody>
    </table>
    <p class="mt-4"><strong>La plataforma funciona y está en producción</strong>, pero está construida sobre una base tecnológica con varios años de deuda técnica. Cualquier mejora o integración nueva es significativamente más costosa que sobre tecnología moderna.</p>
  </div>
  <div class="section">
    <div class="section-title"><span class="num">5</span>Riesgos identificados</div>
    <div class="risk-card critical">
      <div class="risk-icon">🔴</div>
      <div><div class="risk-title">PHP 5.6 sin soporte de seguridad — Crítico</div><div class="risk-desc">El lenguaje de programación lleva más de 7 años sin recibir actualizaciones de seguridad. Expone el sistema a vulnerabilidades conocidas. Es el riesgo más urgente a abordar.</div></div>
    </div>
    <div class="risk-card critical">
      <div class="risk-icon">🔴</div>
      <div><div class="risk-title">Servidor web sin actualizaciones desde 2017 — Crítico</div><div class="risk-desc">El servidor nginx tampoco tiene soporte activo. Una actualización de infraestructura es prioritaria para garantizar la continuidad del servicio.</div></div>
    </div>
    <div class="risk-card high">
      <div class="risk-icon">🟠</div>
      <div><div class="risk-title">Sin aplicación móvil ni API — Alto</div><div class="risk-desc">La arquitectura actual no permite crear una app móvil ni integrarse con otros sistemas sin un rediseño técnico significativo. Toda la interacción depende del navegador web.</div></div>
    </div>
    <div class="risk-card high">
      <div class="risk-icon">🟠</div>
      <div><div class="risk-title">Tráfico "fugado" a portales externos — Alto (negocio)</div><div class="risk-desc">Una parte de las postulaciones redirige a webs externas. DisJob pierde el control del proceso y no puede medir conversiones reales en esos casos.</div></div>
    </div>
    <div class="risk-card medium">
      <div class="risk-icon">🟡</div>
      <div><div class="risk-title">Sin notificaciones ni comunicación interna — Medio</div><div class="risk-desc">No se detectó ningún sistema de alertas, emails de seguimiento ni mensajería entre candidato y empresa. Los candidatos no reciben feedback sobre el estado de sus candidaturas.</div></div>
    </div>
  </div>
</div>

<!-- PÁG 5 -->
<div class="page" id="p5">
  <div class="page-header"><span class="page-header-title">Oportunidades y recomendaciones</span><span class="page-num">05</span></div>
  <div class="section">
    <div class="section-title"><span class="num">6</span>Oportunidades de evolución</div>
    <p>Se identifican cuatro líneas de trabajo con distinto nivel de urgencia e impacto:</p>
    <div class="opp-grid">
      <div class="opp-card"><div class="opp-icon">🛡</div><div class="opp-title">1. Actualización de infraestructura</div><div class="opp-text">Migrar el servidor y el lenguaje de programación a versiones con soporte activo. Es la acción más urgente. No implica cambios visibles para el usuario final.</div></div>
      <div class="opp-card"><div class="opp-icon">📱</div><div class="opp-title">2. API y app móvil</div><div class="opp-text">Diseñar una capa de servicios que permita construir una app móvil y conectar la plataforma con herramientas del ecosistema de RRHH. La búsqueda de empleo es cada vez más móvil.</div></div>
      <div class="opp-card"><div class="opp-icon">🔔</div><div class="opp-title">3. Comunicación candidato–empresa</div><div class="opp-text">Incorporar notificaciones, emails automáticos y/o mensajería interna. Mejoraría sustancialmente la experiencia del candidato y el valor percibido por las empresas.</div></div>
      <div class="opp-card"><div class="opp-icon">📊</div><div class="opp-title">4. Panel de analítica y reporting</div><div class="opp-text">Aunque Google Analytics está activo, no hay panel de reporting interno para empresas ni para gestión de la plataforma. Una visión de datos propia añadiría valor diferencial.</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title"><span class="num">7</span>Funcionalidad actual operativa</div>
    <ul class="check-list">
      <li>Registro de candidatos con consentimiento específico para personas con discapacidad</li>
      <li>Inicio de sesión seguro con protección anti-falsificación de formularios</li>
      <li>Búsqueda de ofertas por palabra clave, sector (23 categorías), provincia (53) y teletrabajo</li>
      <li>Ficha detallada de oferta con postulación interna o redirección a web externa</li>
      <li>Ventana de confirmación antes de postularse (evita candidaturas accidentales)</li>
      <li>Panel "Tus candidaturas" para seguimiento de postulaciones activas</li>
      <li>Edición de CV completo en 5 pasos con gestión dinámica de estudios y experiencias</li>
      <li>Upload de CV en PDF/Word con opción de lectura automática de texto (OCR)</li>
      <li>Cambio de contraseña y recuperación por email</li>
      <li>Portal de empresa con login separado, alta de empresas y tarifas</li>
      <li>Marca secundaria VadEmpleo con infraestructura compartida</li>
      <li>Formulario de contacto para candidatos y para empresas</li>
    </ul>
  </div>
  <div class="section">
    <div class="section-title"><span class="num">8</span>Conclusión y próximos pasos</div>
    <div class="exec-highlight">DisJob cuenta con un <strong>modelo de negocio sólido y funcional</strong>. La plataforma cubre los flujos esenciales del ciclo de empleo inclusivo. El principal desafío no es funcional sino tecnológico: la infraestructura requiere actualización urgente para garantizar seguridad y permitir la evolución del producto.</div>
    <table>
      <thead><tr><th>Prioridad</th><th>Acción sugerida</th><th>Horizonte</th></tr></thead>
      <tbody>
        <tr><td>🔴 Inmediata</td><td>Actualizar servidor y lenguaje de programación a versiones con soporte</td><td>0–3 meses</td></tr>
        <tr><td>🟠 Alta</td><td>Diseñar arquitectura de servicios (API) para integraciones y app móvil</td><td>3–9 meses</td></tr>
        <tr><td>🟡 Media</td><td>Implementar notificaciones y comunicación candidato–empresa</td><td>6–12 meses</td></tr>
        <tr><td>🟢 Estratégica</td><td>Panel de analítica y reporting interno para empresas y plataforma</td><td>12–18 meses</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- BACK COVER -->
<div class="back-cover" id="p6">
  ${logoB64 ? `<img src="${logoB64}" alt="DisJob logo"/>` : '<div style="font-size:28pt;font-weight:700;color:#2C2C2A;">dis<span style="color:#7CB829;">Job</span></div>'}
  <div class="tagline"><strong>Descubre el Talento con disCapacidad</strong><br/>El portal de empleo inclusivo líder en España</div>
  <div class="doc-ref">Informe Ejecutivo · Análisis de Plataforma · Junio 2026<br/>Documento confidencial — elaborado para uso interno de dirección<br/>Basado en análisis técnico y funcional de disjob.com · empresas.disjob.com · vadempleo.disjob.com</div>
</div>

</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // A4 @ 96dpi = 794x1123px
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pages = ['p1','p2','p3','p4','p5','p6'];
  for (const id of pages) {
    const el = await page.$(`#${id}`);
    if (el) {
      await el.screenshot({ path: `./tmp_shot_${id}.png` });
      console.log(`Shot: tmp_shot_${id}.png`);
    }
  }

  // Generate PDF
  await page.pdf({
    path: './Informe_DisJob_Ejecutivo_2026.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
  });
  console.log('PDF: Informe_DisJob_Ejecutivo_2026.pdf');

  await browser.close();
})();
