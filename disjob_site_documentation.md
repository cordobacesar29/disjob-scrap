# Documentación técnica de disjob.com

## 1. Resumen

Este documento describe la estructura, los flujos principales y las reglas de negocio inferidas de los registros de navegación y tráfico de red:
- `disjob_output/navigation_log_FINAL_2026-06-08T17-44-30-035Z.json`
- `disjob_output/network_traffic_FINAL_2026-06-08T17-44-30-035Z.json`

El sitio principal es `https://www.disjob.com` y la plataforma de empresas está en `https://empresas.disjob.com`.

## 2. Arquitectura general

- La aplicación está construida sobre páginas PHP server-side rendered.
- El contenido se devuelve principalmente como HTML completo, con muy poco uso de APIs JSON públicas.
- La interacción clave se gestiona a través de formularios HTML y redirecciones.
- Se observa un backend PHP antiguo (`PHP/5.6.38`) y servidor `nginx/1.10.3`.
- Se utiliza `PHPSESSID` para mantener sesión de usuario.

## 3. Páginas públicas principales

### 3.1 Home y navegación
- `GET /home.php`
  - Página de inicio.
  - Contiene navegación para candidatos y empresas.

- `GET /ofertas_cerca.php`
  - Página de búsqueda de ofertas.
  - Formulario de búsqueda con campos:
    - `palabra_clave`
    - `idSector`
    - `idProvincia`
  - Paginación y filtros en URL con parámetros como `pagina` y `accio`.

- `GET /ofertas.php`
  - Listado de ofertas.

- `GET /noticias.php`
  - Noticias corporativas.

- `GET /quienes_somos.php`
  - Página “Quiénes somos”.

- `GET /contacta.php`
  - Página de contacto.

- `GET /unete.php`
  - Registro y alta de candidatos.

- `GET /politica_cookies.php`
  - Política de cookies.

- `GET /politica_privacidad.php`
  - Política de privacidad.

- `GET /colaboradores.php`
  - Página de colaboradores y partners.

## 4. Páginas de ofertas y procesos de postulación

### 4.1 Ficha de oferta
- `GET /ofertas_fitxa.php?Up=<ID>`
  - Muestra la oferta específica.
  - `Up` es el identificador único de la oferta.
  - Ejemplos: `EJLLH`, `EJFIH`.

### 4.2 Búsqueda y paginação
- Formulario en `/ofertas_cerca.php` usa `POST /ofertas_cerca.php`
  - Payload observado:
    - `palabra_clave=` (cadena)
    - `idSector=0`
    - `idProvincia=0`
  - El resultado se devuelve como HTML renderizado.

- Paginación en URL con parámetros de query:
  - `&uzuou=E`
  - `&ru=ED`
  - `&pagina=11`
  - `&accio=1`

### 4.3 Inscripción / login para aplicar
- `GET /login_inscripcion.php?Up=<ID>&externa=0`
  - Página de acceso/inscripción para una oferta.
  - Se usa para que el candidato aplique a la oferta interna o externa.

- La ficha de oferta genera una función JavaScript `apuntarse()` que redirige a esta URL.
- Si la oferta es externa, `externa` puede incluir URL codificada.

- El formulario de inscripción incluye campos ocultos críticos:
  - `formulari=candidat`
  - `idoferta=<ID numérico>`
  - `token=<hash>`

- Después de enviar, hay una redirección hacia:
  - `GET /candidaturas.php`

## 5. Páginas de candidato autenticado

- `GET /candidaturas.php`
  - Panel de candidaturas del usuario.

- `GET /cv_completo.php`
  - Editor de CV completo.
  - Soporta flujo por secciones usando `Pes=<0..4>`.
  - Ejemplos: `cv_completo.php?Pes=0`, `?Pes=1`, `?Pes=2`, `?Pes=3`, `?Pes=4`.

- `GET /cambio_pwd.php`
  - Gestión de datos de acceso / contraseña.

- `GET /baja_servicio.php`
  - Baja del servicio del candidato.

- `GET /sortir.php`
  - Cierre de sesión.

- Menú de candidato incluye accesos directos a:
  - `candidaturas.php`
  - `cv_completo.php`
  - `cambio_pwd.php`
  - `baja_servicio.php`

## 6. Portal de empresas

- `GET https://empresas.disjob.com/empresa_disjob.php`
  - Información corporativa para empresas.

- `GET https://empresas.disjob.com/empresa_alta.php`
  - Alta de empresa.

- `GET https://empresas.disjob.com/contacta.php`
  - Contacto empresarial.

## 7. Llamadas de red importantes (limpias)

### 7.1 Cargas de contenido HTML
- `GET https://www.disjob.com/home.php`
- `GET https://www.disjob.com/ofertas_cerca.php`
- `GET https://www.disjob.com/ofertas_cerca.php?&uzuou=E&ru=ED&pagina=11&accio=1`
- `GET https://www.disjob.com/ofertas_fitxa.php?Up=EJLLH`
- `GET https://www.disjob.com/ofertas_fitxa.php?Up=EJFIH`
- `GET https://www.disjob.com/login_inscripcion.php?Up=EJFIH&externa=0`
- `GET https://www.disjob.com/candidaturas.php`
- `GET https://www.disjob.com/cv_completo.php`
- `GET https://www.disjob.com/cv_completo.php?Pes=0`
- `GET https://www.disjob.com/cv_completo.php?Pes=1`
- `GET https://www.disjob.com/cv_completo.php?Pes=2`
- `GET https://www.disjob.com/cv_completo.php?Pes=3`
- `GET https://www.disjob.com/cv_completo.php?Pes=4`
- `GET https://www.disjob.com/cambio_pwd.php`
- `GET https://www.disjob.com/baja_servicio.php`
- `GET https://empresas.disjob.com/empresa_disjob.php`
- `GET https://empresas.disjob.com/empresa_alta.php`
- `GET https://empresas.disjob.com/contacta.php`

### 7.2 Formularios / POST relevantes
- `POST https://www.disjob.com/ofertas_cerca.php`
  - Búsqueda de ofertas.
  - Payload observado: `palabra_clave`, `idSector`, `idProvincia`, token de sesión.

- `POST https://www.disjob.com/login_inscripcion.php?Up=EJFIH`
  - Envío de datos de inscripción para aplicación de candidato.
  - Incluye campos `formulari`, `idoferta`, `token`, `idioma`, y datos de candidato.

## 8. Reglas de negocio deducidas

### 8.1 Modelo de dominio
- Entidades clave:
  - `Oferta` identificada por `Up`.
  - `Candidato` con panel de candidaturas y CV.
  - `Empresa` con portal separado en subdominio.

### 8.2 Flujo principal de candidato
1. El candidato consulta ofertas en `/ofertas_cerca.php`.
2. Si encuentra una oferta, ve el detalle en `/ofertas_fitxa.php?Up=<ID>`.
3. Desde la ficha, `apuntarse()` redirige a `login_inscripcion.php`.
4. El candidato completa el formulario de inscripción y se valida mediante token.
5. Tras el envío, el sistema lo lleva a `candidaturas.php`.

### 8.3 Reglas de postulación
- La aplicación a una oferta depende de:
  - `Up` (ID de oferta)
  - `idoferta` (ID numérico interno)
  - token de formulario para validación.
- Si la oferta es externa, el sistema puede enviar al candidato a un `externa` URL codificado.

### 8.4 Gestión de perfil
- Los candidatos pueden editar su CV completo paso a paso con `Pes=0..4`.
- Pueden revisar sus candidaturas, cambiar contraseña y darse de baja.
- El menú de usuario muestra estos accesos como un bloque fijo.

### 8.5 Portal de empresa
- Está separado en un subdominio propio, con su propio flujo de contacto y alta de empresa.
- No se observa mezcla de candidaturas directas y panel de empresa desde las mismas URLs.

## 9. Observaciones técnicas adicionales

- El sitio usa muchos recursos estáticos:
  - `assets/plugins/...` JavaScript y CSS.
  - `includes/js/galetes.js` para gestión de cookies.
- Hay referencias a Google Analytics, Tag Manager y tracking, pero esos no se consideran reglas de negocio.
- El HTML del sitio incluye scripts de validación de formularios (`includes/js/validaform.js`).
- La búsqueda de ofertas no depende de una API AJAX visible, sino de un POST clásico a la misma página.

## 10. Recomendaciones

- Para un scraping o integración limpia, enfocarse en:
  - las URLs de `/ofertas_cerca.php` y `ofertas_fitxa.php`.
  - el formulario `POST /ofertas_cerca.php` para obtener resultados.
  - el flujo `login_inscripcion.php` para entender la aplicación.
- Evitar el tráfico de terceros (Google Analytics, YouTube, tag manager) al analizar reglas de negocio.

---

**Nota:** esta documentación se ha generado a partir de los registros de red y navegación disponibles. Si se desea, puedo añadir un diagrama de flujo para el proceso de candidatura o una tabla de parámetros más detallada.
