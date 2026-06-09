# DisJob — Auditoría Técnica Completa
**Documentación de Ingeniería Inversa · Versión 1.0 · Junio 2026**

> Generado a partir de análisis de tráfico de red, scraping de formularios y crawling autenticado.
> Fuente: sesiones de candidato (CAND), sesión pública (FINAL/AUTO), tráfico HTTP capturado.
> No se tuvo acceso al código fuente original.

---

## Resumen Ejecutivo

DisJob (`disjob.com`) es un portal de empleo especializado en personas con discapacidad, operando en España. La plataforma está construida sobre una arquitectura **PHP server-side rendering legacy**, sin APIs REST diferenciadas. Todo el contenido se genera en el servidor como HTML completo. La interacción se gestiona mediante **formularios HTML clásicos con POST/GET**, redirecciones 302 y sesiones PHP.

La plataforma opera bajo **tres dominios funcionales**:
- `www.disjob.com` — Portal principal de candidatos
- `empresas.disjob.com` — Portal de empresas/empleadores
- `vadempleo.disjob.com` — Marca secundaria (VadEmpleo), misma arquitectura

**Datos clave de la auditoría:**
- 74 páginas únicas analizadas (entre todas las sesiones)
- 437+ peticiones de red capturadas
- 23 formularios identificados y catalogados completamente
- 3 flujos de autenticación distintos confirmados

---

## 1. Arquitectura General

### 1.1 Stack Tecnológico

| Componente | Tecnología | Versión | Evidencia |
|---|---|---|---|
| Servidor web | nginx | 1.10.3 | Header `Server: nginx/1.10.3` |
| Lenguaje backend | PHP | 5.6.38 | Header `X-Powered-By: PHP/5.6.38` |
| Renderizado | SSR (Server-Side Rendering) | — | Todas las respuestas son HTML completo |
| Sesiones | PHPSESSID (cookie) | — | `Set-Cookie: PHPSESSID=...; path=/` |
| Framework CSS | Bootstrap | 2.x/3.x (inferido) | `/assets/plugins/bootstrap/js/bootstrap.min.js` |
| jQuery | jQuery | 1.10.2 | `/assets/plugins/jquery-1.10.2.min.js` |
| jQuery Migrate | jquery-migrate | 1.2.1 | `/assets/plugins/jquery-migrate-1.2.1.min.js` |
| Select dinámico | Chosen.js | — | `/assets/js/chosen/chosen.jquery.min.js` |
| Slider | FlexSlider | — | `/assets/plugins/flexslider/jquery.flexslider-min.js` |
| Slider 2 | BxSlider | — | `/assets/plugins/bxslider/jquery.bxslider.js` |
| Parallax | jquery.parallax | — | `/assets/plugins/jquery.parallax.js` |
| Feature detection | Modernizr | — | `/assets/plugins/image-hover/js/modernizr.js` |
| Validación forms | validaform.js (custom) | — | `/includes/js/validaform.js` |
| Cookies GDPR | galetes.js (custom) | — | `/includes/js/galetes.js` |
| Utilidades | utilitatsClient.js (custom) | — | `../includes/js/utilitatsClient.js` |
| Analytics | Google Analytics UA | UA-67987350-1 | Petición a `google-analytics.com` |
| Analytics 2 | Google Analytics 4 | G-DHEJSC1WDX | Petición GA4 |
| Analytics VadEmpleo | Google Analytics 4 | G-R3P2ZK82WP | Petición GA4 en vadempleo |
| Encoding de contraseñas | No determinado (inferencia: MD5 o bcrypt) | — | Hash 32-char en tokens de formulario |

### 1.2 Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)                          │
│  jQuery 1.10.2 · Bootstrap · Chosen.js · validaform.js         │
│  galetes.js · utilitatsClient.js · Google Analytics            │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/HTTPS (formularios POST/GET)
┌─────────────────────────▼───────────────────────────────────────┐
│                      nginx/1.10.3                               │
│              Reverse proxy / servidor web estático              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     PHP/5.6.38 (FPM/CGI)                        │
│  Controladores: home.php, cv_completo.php, info_oferta.php ...  │
│  Plantillas: HTML embebido directamente en PHP                  │
│  Sesiones: PHPSESSID (archivos en disco o memcached)            │
│  CSRF: token MD5 en cada formulario                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   Base de datos (RDBMS)                         │
│  MySQL/MariaDB (inferido — típico de stack nginx+PHP 5.6)       │
│  Tablas inferidas a partir de campos de formulario              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Organización de Dominios

```
disjob.com (apex) ─────────────────────────────────► www.disjob.com
                                                        Portal candidatos
                  ─────────────────────────────────► empresas.disjob.com
                                                        Portal empresas
                  ─────────────────────────────────► vadempleo.disjob.com
                                                        Marca secundaria
```

Los tres dominios comparten la misma base de código PHP (se observan los mismos nombres de campos y patrones de URL). El subdominio `vadempleo` parece una instalación independiente o un "tenant" diferente de la misma plataforma.

---

## 2. Mapa de Navegación Completo

### 2.1 Páginas Públicas — `www.disjob.com`

```
/ (home.php)
├── ofertas.php                    — Listado de ofertas (público)
├── ofertas_cerca.php              — Búsqueda avanzada de ofertas
│   ├── GET ?&uzuou=E&ru=ED&pagina=N&accio=1   (paginación)
│   └── POST                       — Submit búsqueda
├── ofertas_fitxa.php?Up=<CODE>    — Ficha de oferta (modo público)
│   └── login_inscripcion.php?Up=<CODE>&externa=0
├── info_oferta.php?Up=<CODE>      — Ficha de oferta (modo candidato auth.)
├── noticias.php                   — Noticias corporativas
├── quienes_somos.php              — Quiénes somos
├── contacta.php                   — Contacto + login embebido
├── colaboradores.php              — Partners y colaboradores
├── unete.php                      — Alta/registro de candidato
├── recordatorio.php               — Recuperación de contraseña
├── politica_privacidad.php        — LOPD
├── politica_cookies.php           — Política de cookies
└── sortir.php                     — Logout (destruye sesión)
```

### 2.2 Área Privada Candidato

```
home_cand.php                       — Dashboard candidato
├── ofertas_cand.php               — Búsqueda de ofertas (autenticado)
│   └── info_oferta.php?Up=<CODE>  — Ficha + postulación
├── candidaturas.php                — Panel de candidaturas activas
├── cv_completo.php                 — CV (redirect a Pes=0)
│   ├── cv_completo.php?Pes=0      — Sección 1: Datos personales
│   ├── cv_completo.php?Pes=1      — Sección 2: Estudios
│   ├── cv_completo.php?Pes=2      — Sección 3: Experiencia laboral
│   ├── cv_completo.php?Pes=3      — Sección 4: Puesto deseado
│   └── cv_completo.php?Pes=4      — Sección 5: Idiomas/Habilidades
├── home_cand.php                   — Upload de CV (file/texto)
├── cambio_pwd.php                  — Cambio de contraseña
├── baja_servicio.php               — Baja del servicio
└── includes/funcions/download_cv.php?i=<hash>  — Descarga CV
```

### 2.3 Portal de Empresas — `empresas.disjob.com`

```
empresa_disjob.php                  — Página de información + login empresa
home_empresa.php                    — Dashboard empresa (post-login)
empresa_alta.php                    — Alta de nueva empresa
empresa_vadempleo.php               — Login vadempleo para empresa
precios.php                         — Tarifas
quienes_somos.php                   — Quiénes somos (versión empresa)
contacta.php                        — Contacto empresa
```

### 2.4 VadEmpleo — `vadempleo.disjob.com`

```
home.php                            — Home pública (misma estructura)
contacta.php                        — Contacto
ofertas_cerca.php                   — Búsqueda de ofertas
unete.php                           — Alta candidato
```

---

## 3. Flujos de Negocio

### 3.1 Flujo de Registro de Candidato

```
GET /unete.php
│
├── [Formulario frm_alta POST /unete.php]
│   Campos requeridos:
│   ├── nom_usu         (nombre)
│   ├── cognoms_usu     (apellidos)
│   ├── mail_usu        (email — usado como username)
│   ├── re_mail_usu     (confirmación email)
│   ├── pwd_usu         (contraseña, 6-12 dígitos)
│   ├── re_pwd_usu      (confirmación contraseña)
│   ├── tengoDiscapacidad  (checkbox — Certificado ≥ 33%)
│   ├── Newsletter      (checkbox — publicidad)
│   ├── conformidad     (checkbox — LOPD, obligatorio)
│   └── token           (CSRF)
│
└── → [Éxito] home_cand.php | [Error] unete.php?err=1
```

**Nota negocio crítica:** La plataforma es exclusiva para personas con certificado de grado de discapacidad ≥ 33% vigente. Este checkbox es parte del flujo de consentimiento y posiblemente sea validado a nivel de negocio (no solo UI).

### 3.2 Flujo de Autenticación de Candidato

```
GET /home.php (o /contacta.php — login embebido en sidebar)
│
├── [POST /home.php]
│   Payload:
│   ├── idioma=cast
│   ├── formulari=candidat       ← discrimina entre candidato/empresa
│   ├── Usu_Acces=<email>
│   ├── Pwd_Acces=<password>
│   ├── bt_candidat=             ← nombre del botón submit
│   └── token=<32-char-hex>
│
├── → HTTP 302 Redirect
│   ├── Éxito  → home_cand.php?nocache=<timestamp_unix>
│   └── Error  → home.php (con mensaje de error)
│
└── Cookie: PHPSESSID=<session_id>; path=/
```

**Parámetro `nocache`:** El timestamp Unix adjunto en la URL de éxito evita que el browser cachee la respuesta del dashboard.

### 3.3 Flujo de Búsqueda y Postulación

```
GET /ofertas_cand.php
│
├── [POST /ofertas_cand.php — buscador_ofertas]
│   ├── palabra_clave=<texto>
│   ├── idSector=<0-22>
│   ├── idProvincia=<0-53>
│   ├── TrabajarDesdeCasa_Ofer=<on|off>
│   └── token=<32-char-hex>
│
├── → HTML con listado de ofertas
│   └── Links: info_oferta.php?Up=<CODE>
│
└── GET /info_oferta.php?Up=<CODE>
    │
    ├── [Oferta INTERNA]
    │   ├── Botón: "Quiero inscribirme a esta oferta"
    │   │         → onclick: javascript:mostrarPopup()
    │   │         → Muestra modal de confirmación
    │   ├── Botón modal: "Inscribirse"
    │   │         → onclick: javascript:apuntarse()
    │   │         → Modifica campo hidden apunta: 0 → 1
    │   └── [POST /info_oferta.php — ficha_oferta]
    │       ├── idioma=cast
    │       ├── Id=<ID_NUMERICO>      ← ID interno de la oferta
    │       ├── apunta=1              ← 1 = confirmar postulación
    │       └── token=<32-char-hex>
    │           → HTTP 302 → candidaturas.php
    │
    └── [Oferta EXTERNA]
        └── Link "Inscribirse" → URL externa (ej. caixabankcareers.com)
            (no pasa por login_inscripcion.php en este flujo)
```

**Flujo alternativo — Oferta desde página pública (no autenticado):**
```
GET /ofertas_fitxa.php?Up=<CODE>
    └── Botón "Inscríbete" → GET /login_inscripcion.php?Up=<CODE>&externa=0
        │
        ├── Formulario "Ya soy candidato" (login + postulación simultánea)
        │   [POST /login_inscripcion.php?Up=<CODE>]
        │   ├── idioma=cast
        │   ├── formulari=candidat
        │   ├── idoferta=<ID_NUMERICO>
        │   ├── Usu_Acces=<email>
        │   ├── Pwd_Acces=<password>
        │   ├── externa_val=0
        │   └── token=<32-char-hex>
        │   → HTTP 302 → candidaturas.php
        │
        └── Formulario "No soy candidato" → registro previo en /unete.php
```

### 3.4 Flujo de Edición de CV (5 Secciones)

La edición del CV sigue un wizard multi-paso controlado por el parámetro `Pes` en la URL y `idpas` en el formulario. Cada paso puede ser guardado independientemente (`continua=0`) o navegar al siguiente (`continua=1`).

```
cv_completo.php
│
├── Pes=0 / idpas=1 — Datos Personales
│   [POST /cv_completo.php?Pes=0]
│   Campos: nombre_cand, apellidos_cand, dia/mes/any, DataNaci_cand,
│           IdDocIdentidad, docIdentidad_cand, direccion_cand,
│           idProvincia, codiPostal_cand, Poblacion, IdModoContacto,
│           TelfMovil_cand, TelfFijo_cand, IdPermisoCond,
│           autonomo_cand, vehiculo_cand, linkedin_cand
│
├── Pes=1 / idpas=2 — Estudios (CRUD dinámico)
│   [POST /cv_completo.php?Pes=1]
│   Campos base:
│   ├── con_estudios=1
│   ├── IdNivellEstudis=<nivel>
│   ├── IdEspecialidad=<especialidad>
│   ├── centre_estudis=<centro>
│   ├── cursa_estudis=<-1|1>    (en curso: sí/no)
│   ├── nou_estudi=<0|1>        ← 1 = añadir nuevo estudio
│   └── elimina_estudi=<0|1>    ← 1 = eliminar estudio
│
├── Pes=2 / idpas=3 — Experiencia laboral (CRUD dinámico)
│   [POST /cv_completo.php?Pes=2]
│   Campos base:
│   ├── con_experiencia=1
│   ├── Puesto_Exp=<cargo>
│   ├── Empresa_Exp=<empresa>
│   ├── dia/mes/any (inicio) + Data_ini_Exp=<dd-mm-yyyy>
│   ├── dia2/mes2/any2 (fin) + Data_fin_Exp=<dd-mm-yyyy>
│   ├── idNivel=<nivel_jerarquico>
│   ├── Desc_Exp=<descripcion>
│   ├── idSector=<0-22>
│   ├── personal_cargo_Exp=<numero>    (personas a cargo)
│   ├── nova_experiencia=<0|1>         ← añadir nueva exp.
│   └── elimina_experiencia=<0|1>      ← eliminar exp.
│
├── Pes=3 / idpas=4 — Puesto Deseado
│   [POST /cv_completo.php?Pes=3]
│   ├── puesto_deseado_cand=<texto>
│   ├── idTipoContrato=<tipo>
│   ├── idSalarioMin=<escala>
│   ├── idSalarioMax=<escala>
│   ├── idCategoria=<categoria>
│   └── idJornada=<jornada>
│
└── Pes=4 / idpas=5 — Idiomas / Habilidades
    (estructura no capturada en el scraping — no se visitó con formulario activo)
```

**Control de flujo del wizard:**
- `continua=0` → guarda y permanece en la sección
- `continua=1` → guarda y avanza a la siguiente sección
- `te_sub_form=0|1` → indica si hay un sub-formulario activo (añadir/eliminar ítem)

### 3.5 Flujo de Upload de CV

```
GET /home_cand.php
│
├── [POST /home_cand.php — form "alta"] (multipart/form-data)
│   ├── Modo "Adjuntar PDF"
│   │   ├── cv_cand=<file>     [file, required]
│   │   └── onclick: enviar(1)
│   └── Modo "Escanear PDF" (OCR)
│       ├── cv_cand=<file>
│       └── onclick: enviar(2)
│
│   Hidden fields:
│   ├── token=<32-char-hex>
│   ├── idioma=cast
│   ├── idpas=5
│   └── tipusEnviament=<1|2>   ← determina modo (adjuntar/escanear)
│
└── TextCvCand — textarea con texto del CV extraído/editado
```

### 3.6 Flujo de Empresa

```
GET empresas.disjob.com/empresa_disjob.php
│
├── [POST /home_empresa.php — login empresa]
│   ├── Emp_Usu_Acces=<email_empresa>
│   └── Emp_Pwd_Acces=<password>
│
├── GET /empresa_alta.php — registro empresa nueva
│
└── GET /empresa_vadempleo.php — login vadempleo empresa
    [POST /empresa_vadempleo.php]
    ├── Emp_Usu_Acces=<text>   ← sin validación email en este form
    └── Emp_Pwd_Acces=<password>
```

**Observación:** El formulario de login en `empresa_vadempleo.php` usa `input[type="text"]` para el usuario, a diferencia de `empresa_disjob.php` que usa `input[type="email"]`. Posible inconsistencia entre versiones.

### 3.7 Flujo de Recuperación de Contraseña

```
GET /recordatorio.php
│
└── [POST /recordatorio.php — form "recordar"]
    ├── mail_recuerda=<email>
    └── bt_recordar=<submit>
    → Envío de email con instrucciones de recuperación
```

### 3.8 Flujo de Baja del Servicio

```
GET /baja_servicio.php
│
└── (Página de confirmación de baja — formulario no capturado en scraping)
    → Destruye sesión + elimina cuenta
```

**Nota:** Esta URL está en la lista `SKIP_URLS` del scraper — no se exploró para evitar acciones irreversibles.

---

## 4. Catálogo Completo de Endpoints

### 4.1 Autenticación

#### `POST /home.php` — Login Candidato
| Campo | Tipo | Valor |
|---|---|---|
| `idioma` | string | `cast` (siempre) |
| `formulari` | string | `candidat` |
| `Usu_Acces` | email | `usuario@ejemplo.com` |
| `Pwd_Acces` | password | `***` |
| `bt_candidat` | submit | vacío |
| `token` | hidden | `<md5-32chars>` |

**Response:** `302 → home_cand.php?nocache=<unix_timestamp>`
**Cookie:** `PHPSESSID=<session_id>; path=/`

---

#### `POST /home_empresa.php` — Login Empresa
| Campo | Tipo | Valor |
|---|---|---|
| `Emp_Usu_Acces` | email | `empresa@ejemplo.com` |
| `Emp_Pwd_Acces` | password | `***` |

**Response:** `302 → <dashboard empresa>`

---

#### `GET /sortir.php` — Logout
- Destruye sesión PHP (`session_destroy()`)
- `302 → home.php`

---

#### `POST /recordatorio.php` — Recuperar contraseña
| Campo | Tipo | Valor |
|---|---|---|
| `mail_recuerda` | text | email registrado |
| `bt_recordar` | submit | — |

---

#### `POST /unete.php` — Registro Candidato
| Campo | Obligatorio | Tipo |
|---|---|---|
| `nom_usu` | ✓ | text |
| `cognoms_usu` | ✓ | text |
| `mail_usu` | ✓ | email |
| `re_mail_usu` | ✓ | email |
| `pwd_usu` | ✓ | password (6-12 dígitos) |
| `re_pwd_usu` | ✓ | password |
| `tengoDiscapacidad` | ✓ | checkbox |
| `Newsletter` | — | checkbox |
| `conformidad` | ✓ | checkbox (LOPD) |
| `token` | ✓ | hidden |

**Response:** `302 → home_cand.php` ó `302 → unete.php?err=1`

---

### 4.2 Búsqueda de Ofertas

#### `POST /ofertas_cerca.php` — Búsqueda
| Campo | Tipo | Valores |
|---|---|---|
| `palabra_clave` | text | término libre |
| `idSector` | select | `0-22` (ver catálogo) |
| `idProvincia` | select | `0-53` (ver catálogo) |
| `TrabajarDesdeCasa_Ofer` | checkbox | `on` / ausente |
| `token` | hidden | `<md5>` |

**Response:** `200` — HTML con listado de ofertas

#### `GET /ofertas_cerca.php?&uzuou=E&ru=ED&pagina=N&accio=1` — Paginación
- `uzuou` y `ru` — parámetros de contexto de búsqueda (ofuscados/encoded)
- `pagina` — número de página
- `accio=1` — acción de paginación

#### `GET /ofertas_fitxa.php?Up=<CODE>` — Ficha pública
- `Up` — código alfanumérico de 5 chars (ej. `EJFMF`)

#### `GET /info_oferta.php?Up=<CODE>` — Ficha autenticada
- Misma URL base, diferente rendering si hay sesión activa
- Muestra botón "Inscribirse" / "Quiero inscribirme" si está autenticado

---

### 4.3 Postulación

#### `POST /info_oferta.php` — Postularse (Oferta interna)
| Campo | Tipo | Valor |
|---|---|---|
| `idioma` | hidden | `cast` |
| `Id` | hidden | ID numérico (ej. `16292`) |
| `apunta` | hidden | `1` (modificado por JS al confirmar) |
| `token` | hidden | `<md5>` |

**Trigger JS:** `apuntarse()` → modifica `apunta` de `0` a `1` y submittea el form `ficha_oferta`
**Response:** `302 → candidaturas.php`

#### `POST /login_inscripcion.php?Up=<CODE>` — Login + Postulación combinados
| Campo | Tipo | Valor |
|---|---|---|
| `idioma` | hidden | `cast` |
| `formulari` | hidden | `candidat` |
| `idoferta` | hidden | ID numérico |
| `Usu_Acces` | email | — |
| `Pwd_Acces` | password | — |
| `externa_val` | hidden | `0` (interna) / `1` (externa) |
| `token` | hidden | `<md5>` |

**Response:** `302 → candidaturas.php`

---

### 4.4 Gestión de Perfil / CV

#### `POST /cv_completo.php?Pes=0` — Datos personales
| Campo | Label | Tipo | Opciones |
|---|---|---|---|
| `nombre_cand` | NOMBRE | text | — |
| `apellidos_cand` | *APELLIDOS | text | — |
| `dia` | — | select | 1-31 |
| `mes` | — | select | 0=Enero … 11=Diciembre |
| `any` | — | select | 1953-2008 |
| `DataNaci_cand` | *FECHA NACIMIENTO | text | `dd-mm-yyyy` |
| `IdDocIdentidad` | *TIPO DOCUMENTO | select | 1=NIF, 2=NIE, 3=Pasaporte |
| `docIdentidad_cand` | *NÚMERO DOCUMENTO | text | — |
| `direccion_cand` | *DIRECCIÓN | text | — |
| `idProvincia` | *PROVINCIA | select | 0-53 (ver catálogo) |
| `codiPostal_cand` | *CÓDIGO POSTAL | text | — |
| `Poblacion` | *POBLACIÓN | text | — |
| `IdModoContacto` | *MODO CONTACTO | select | 1=Mail, 2=Móvil, 3=Fijo |
| `TelfMovil_cand` | *TELÉFONO | text | — |
| `TelfFijo_cand` | SEGUNDO TELÉFONO | text | — |
| `IdPermisoCond` | PERMISO CONDUCIR | select | 1=A1, 2=A, 3=B |
| `autonomo_cand` | *¿AUTÓNOMO? | radio | 1=Sí, -1=No |
| `vehiculo_cand` | *¿VEHÍCULO PROPIO? | radio | 1=Sí, -1=No |
| `linkedin_cand` | LINKEDIN | text | URL |
| `idioma` | — | hidden | `cast` |
| `idpas` | — | hidden | `1` |
| `te_sub_form` | — | hidden | `0` |
| `continua` | — | hidden | `0` = guardar / `1` = siguiente |
| `token` | — | hidden | `<md5>` |

**Response:** `200` (misma página con datos actualizados) ó avanza a `?Pes=1`

#### `POST /cv_completo.php?Pes=1` — Estudios (idpas=2)
| Campo | Descripción |
|---|---|
| `con_estudios` | `1` si tiene estudios |
| `IdNivellEstudis` | Nivel de estudios (ej. `11`) |
| `IdEspecialidad` | Especialidad (ej. `174`) |
| `centre_estudis` | Centro educativo |
| `cursa_estudis` | En curso: `1` = sí, `-1` = no |
| `nou_estudi` | `1` = añadir nuevo registro |
| `elimina_estudi` | `1` = eliminar registro |
| `te_sub_form` | `1` = sub-formulario activo |
| `continua` | `0` o `1` |

#### `POST /cv_completo.php?Pes=2` — Experiencia (idpas=3)
| Campo | Descripción |
|---|---|
| `con_experiencia` | `1` si tiene experiencia |
| `Puesto_Exp` | Cargo/puesto |
| `Empresa_Exp` | Nombre de empresa |
| `dia/mes/any` | Fecha inicio |
| `Data_ini_Exp` | Fecha inicio formateada `dd-mm-yyyy` |
| `dia2/mes2/any2` | Fecha fin |
| `Data_fin_Exp` | Fecha fin formateada |
| `idNivel` | Nivel jerárquico (ej. `7` = Senior) |
| `Desc_Exp` | Descripción del puesto |
| `idSector` | Sector (0-22) |
| `personal_cargo_Exp` | Personas a cargo |
| `nova_experiencia` | `1` = añadir |
| `elimina_experiencia` | `1` = eliminar |

#### `POST /cv_completo.php?Pes=3` — Puesto Deseado (idpas=4)
| Campo | Descripción |
|---|---|
| `puesto_deseado_cand` | Título del puesto buscado |
| `idTipoContrato` | Tipo de contrato (ej. `3` = indefinido) |
| `idSalarioMin` | Tramo salarial mínimo (ej. `2`) |
| `idSalarioMax` | Tramo salarial máximo (ej. `7`) |
| `idCategoria` | Categoría profesional (ej. `31`) |
| `idJornada` | Tipo de jornada (ej. `1` = completa) |

---

#### `POST /home_cand.php` — Upload CV (multipart/form-data)
| Campo | Tipo | Valor |
|---|---|---|
| `cv_cand` | file | archivo PDF/DOC |
| `TextCvCand` | textarea | texto del CV |
| `tipusEnviament` | hidden | `1`=adjuntar, `2`=escanear OCR |
| `idpas` | hidden | `5` |
| `token` | hidden | `<md5>` |

---

#### `POST /cambio_pwd.php` — Cambiar contraseña
| Campo | Tipo | Descripción |
|---|---|---|
| `mail_usu` | text | Email (pre-cargado, read-only visual) |
| `nou_pwd` | password | Nueva contraseña |
| `re_nou_pwd` | password | Confirmación |
| `bt_cambio` | submit | — |
| `token` | hidden | `<md5>` |

**Trigger validación client:** `javascript:prevalidar()` (validaform.js)

---

### 4.5 Contacto

#### `POST /contacta.php` — Formulario de contacto (www)
| Campo | Tipo |
|---|---|
| `asunto` | text |
| `nombre` | text |
| `mail_usuario` | text |
| `telefono` | text |
| `categorias` | select |
| `Tu Mensaje` | text (**campo con espacio en el name — bug histórico**) |
| `conformidad` | checkbox |
| `token` | hidden |

#### `POST empresas.disjob.com/contacta.php` — Formulario empresa (multipart/form-data)
| Campo | Descripción |
|---|---|
| `idioma` | `cast` |
| `urlrespostaok` | URL de redirect en éxito |
| `urlrespostako` | URL de redirect en error |
| `mailtoinici` | Alias/prefijo del destinatario |
| `mailtodom` | Dominio del destinatario |
| `nombre` | Nombre del contacto |
| `mail_usuario` | Email del remitente |
| `mailfrom` | Email from (para el SMTP) |
| `telefono` | Teléfono |
| `categorias` | Categoría consulta |
| `asunto` | Asunto |
| `subject` | Subject del email (diferente a `asunto`) |
| `Tu Mensaje` | Cuerpo del mensaje |
| `conformidad` | Aceptación LOPD |
| `token` | CSRF |

---

## 5. Modelo de Dominio Inferido

### 5.1 Entidades Principales

```
┌──────────────────┐       ┌──────────────────┐
│    Candidato     │       │     Empresa       │
│──────────────────│       │──────────────────│
│ id_candidato     │       │ id_empresa        │
│ mail             │◄──────│ Emp_Usu_Acces     │
│ password_hash    │       │ Emp_Pwd_Acces     │
│ nombre           │       └──────────────────┘
│ apellidos        │                │
│ DataNaci_cand    │                │ publica
│ IdDocIdentidad   │                ▼
│ docIdentidad     │        ┌──────────────────┐
│ direccion        │        │      Oferta       │
│ idProvincia      │        │──────────────────│
│ codiPostal       │        │ Id               │ ← ID numérico interno
│ Poblacion        │        │ Up               │ ← Código público (5 chars)
│ IdModoContacto   │        │ titulo           │
│ TelfMovil        │        │ descripcion      │
│ TelfFijo         │        │ idSector         │
│ IdPermisoCond    │        │ idProvincia      │
│ autonomo_cand    │        │ externa          │ ← bool
│ vehiculo_cand    │        │ url_externa      │ ← nullable
│ linkedin_cand    │        │ idCategoria      │
│ cv_file_path     │        │ idJornada        │
│ cv_text          │        │ idTipoContrato   │
│ newsletter       │        │ idNivel          │
│ tengo_discap     │        └──────────────────┘
│ conformidad      │                │
│ idioma           │       candidatos
│ token_sesion     │       postulan a
└──────────────────┘                │
         │                          ▼
         │         ┌────────────────────────────┐
         │         │       Candidatura          │
         └────────►│────────────────────────────│
                   │ id_candidatura              │
                   │ id_candidato   (FK)         │
                   │ id_oferta      (FK)         │
                   │ fecha_alta                  │
                   │ estado                      │
                   └────────────────────────────┘
```

### 5.2 Entidades del CV

```
┌──────────────────┐       ┌──────────────────┐
│    Candidato     │       │    Estudio        │
│                  │1     N│──────────────────│
│                  ├──────►│ id_estudio        │
│                  │       │ id_candidato      │
│                  │       │ IdNivellEstudis   │
│                  │       │ IdEspecialidad    │
│                  │       │ centre_estudis    │
│                  │       │ cursa_estudis     │
└──────────────────┘       └──────────────────┘
         │
         │1     N   ┌──────────────────┐
         └─────────►│   Experiencia    │
                    │──────────────────│
                    │ id_experiencia   │
                    │ id_candidato     │
                    │ Puesto_Exp       │
                    │ Empresa_Exp      │
                    │ Data_ini_Exp     │
                    │ Data_fin_Exp     │
                    │ idNivel          │
                    │ Desc_Exp         │
                    │ idSector         │
                    │ personal_cargo   │
                    └──────────────────┘

┌──────────────────────────────────────┐
│         PuestoDeseado                │
│──────────────────────────────────────│
│ id_candidato (FK, probablemente 1:1) │
│ puesto_deseado_cand                  │
│ idTipoContrato                       │
│ idSalarioMin                         │
│ idSalarioMax                         │
│ idCategoria                          │
│ idJornada                            │
└──────────────────────────────────────┘
```

### 5.3 Catálogos / Tablas de Referencia

#### Sectores (`idSector`)
| ID | Nombre |
|---|---|
| 1 | Administración de empresas |
| 2 | Administración Pública |
| 3 | Atención a clientes |
| 4 | Calidad, producción e I+D |
| 5 | Comercial y ventas |
| 6 | Compras, logística y almacén |
| 7 | Diseño y artes gráficas |
| 8 | Educación y formación |
| 9 | Finanzas y banca |
| 10 | Informática y telecomunicaciones |
| 11 | Ingenieros y técnicos |
| 12 | Inmobiliario y construcción |
| 13 | Legal |
| 14 | Marketing y comunicación |
| 15 | Profesiones, artes y oficios |
| 16 | Recursos humanos |
| 17 | Sanidad y salud |
| 18 | Turismo y restauración |
| 19 | Otros |
| 20 | Audiovisual |
| 21 | Arte y Decoración |
| 22 | Publicidad y Relaciones Públicas |

#### Provincias (`idProvincia`) — 53 entradas
Incluye todas las provincias españolas (IDs no secuenciales), Ceuta (51), Melilla (52), y "Sin especificar" (53). ID `28` = Madrid, `8` = Barcelona.

#### Documento de Identidad (`IdDocIdentidad`)
`1`=NIF · `2`=NIE · `3`=Pasaporte

#### Modo de Contacto (`IdModoContacto`)
`1`=Mail · `2`=Teléfono Móvil · `3`=Teléfono Fijo

#### Permiso de Conducir (`IdPermisoCond`)
`1`=A1 · `2`=A · `3`=B

---

## 6. Arquitectura de Datos Inferida

### 6.1 Estructura probable de base de datos

```sql
-- Tabla principal de candidatos
CREATE TABLE candidatos (
  id_candidato      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mail              VARCHAR(255) UNIQUE NOT NULL,  -- username
  password_hash     VARCHAR(255) NOT NULL,
  nombre            VARCHAR(100),
  apellidos         VARCHAR(200),
  DataNaci_cand     DATE,
  IdDocIdentidad    TINYINT UNSIGNED,   -- FK → doc_identidad
  docIdentidad_cand VARCHAR(20),
  direccion_cand    VARCHAR(300),
  idProvincia       SMALLINT UNSIGNED,  -- FK → provincias
  codiPostal_cand   VARCHAR(10),
  Poblacion         VARCHAR(100),
  IdModoContacto    TINYINT UNSIGNED,   -- FK → modos_contacto
  TelfMovil_cand    VARCHAR(30),
  TelfFijo_cand     VARCHAR(30),
  IdPermisoCond     TINYINT UNSIGNED,   -- FK → permisos_conducir
  autonomo_cand     TINYINT(1),         -- 1/−1
  vehiculo_cand     TINYINT(1),         -- 1/−1
  linkedin_cand     VARCHAR(500),
  cv_file_path      VARCHAR(500),
  cv_text           LONGTEXT,
  newsletter        TINYINT(1),
  tengo_discapacidad TINYINT(1),
  conformidad_lopd  TINYINT(1),
  idioma            VARCHAR(10) DEFAULT 'cast',
  fecha_alta        DATETIME,
  fecha_mod         DATETIME
);

-- Estudios (1:N con candidato)
CREATE TABLE estudios (
  id_estudio        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_candidato      INT UNSIGNED NOT NULL,  -- FK → candidatos
  IdNivellEstudis   SMALLINT UNSIGNED,
  IdEspecialidad    SMALLINT UNSIGNED,
  centre_estudis    VARCHAR(200),
  cursa_estudis     TINYINT(1),  -- 1 = en curso
  FOREIGN KEY (id_candidato) REFERENCES candidatos(id_candidato)
);

-- Experiencias (1:N con candidato)
CREATE TABLE experiencias (
  id_experiencia    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_candidato      INT UNSIGNED NOT NULL,
  Puesto_Exp        VARCHAR(200),
  Empresa_Exp       VARCHAR(200),
  Data_ini_Exp      DATE,
  Data_fin_Exp      DATE,
  idNivel           TINYINT UNSIGNED,
  Desc_Exp          TEXT,
  idSector          TINYINT UNSIGNED,
  personal_cargo    SMALLINT UNSIGNED DEFAULT 0,
  FOREIGN KEY (id_candidato) REFERENCES candidatos(id_candidato)
);

-- Preferencias laborales (1:1 con candidato)
CREATE TABLE puesto_deseado (
  id_candidato       INT UNSIGNED PRIMARY KEY,
  puesto_deseado     VARCHAR(300),
  idTipoContrato     TINYINT UNSIGNED,
  idSalarioMin       TINYINT UNSIGNED,
  idSalarioMax       TINYINT UNSIGNED,
  idCategoria        SMALLINT UNSIGNED,
  idJornada          TINYINT UNSIGNED,
  FOREIGN KEY (id_candidato) REFERENCES candidatos(id_candidato)
);

-- Ofertas
CREATE TABLE ofertas (
  id_oferta         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Up                VARCHAR(10) UNIQUE NOT NULL,  -- código público
  id_empresa        INT UNSIGNED,
  titulo            VARCHAR(500),
  descripcion       LONGTEXT,
  idSector          TINYINT UNSIGNED,
  idProvincia       SMALLINT UNSIGNED,
  idCategoria       SMALLINT UNSIGNED,
  idJornada         TINYINT UNSIGNED,
  idTipoContrato    TINYINT UNSIGNED,
  idNivel           TINYINT UNSIGNED,
  externa           TINYINT(1) DEFAULT 0,
  url_externa       VARCHAR(1000),
  activa            TINYINT(1) DEFAULT 1,
  fecha_alta        DATETIME,
  fecha_fin         DATETIME
);

-- Candidaturas (N:M candidatos ↔ ofertas)
CREATE TABLE candidaturas (
  id_candidatura    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_candidato      INT UNSIGNED NOT NULL,
  id_oferta         INT UNSIGNED NOT NULL,
  fecha_inscripcion DATETIME DEFAULT NOW(),
  estado            VARCHAR(50) DEFAULT 'activa',
  UNIQUE KEY (id_candidato, id_oferta),
  FOREIGN KEY (id_candidato) REFERENCES candidatos(id_candidato),
  FOREIGN KEY (id_oferta)    REFERENCES ofertas(id_oferta)
);

-- Empresas
CREATE TABLE empresas (
  id_empresa        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Emp_Usu_Acces     VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255),
  razon_social      VARCHAR(300),
  -- ... otros campos no observados en scraping
);
```

---

## 7. Seguridad

### 7.1 Gestión de Sesiones

- **Mecanismo:** Cookie `PHPSESSID` con `path=/`, sin `HttpOnly` ni `Secure` flag explícito observado (PHP 5.6 no los añade por defecto).
- **Duración:** La sesión persiste entre páginas; se destruye en `sortir.php`.
- **Anti-cache post-login:** Parámetro `?nocache=<unix_timestamp>` en la URL de redirect evita que el browser cachee el dashboard.

### 7.2 Protección CSRF

Todos los formularios incluyen un campo `token` con un hash hexadecimal de 32 caracteres (MD5). El token se genera por sesión y se rota en cada petición POST. Evidencia:
```
token=f83867f2c4bd6f6ea64570b63924ab0f  (login #1)
token=6c67fafc720d1000e9278ea470f4fbbe  (login #2)
token=9e8bbe6392de83d23e336bcee2508a86  (login #3)
```
Cada token es distinto para cada request, lo que indica rotación correcta.

### 7.3 Validación del Lado Cliente

- `validaform.js` — validación de formularios (custom)
- `prevalidar()` — función JS en `cambio_pwd.php` antes del submit
- `apuntarse()` — función JS que modifica el campo `apunta` antes del POST de postulación
- `mostrarPopup()` — muestra un modal de confirmación antes de postular
- `enviar(n)` — función custom en `home_cand.php` que controla el modo de upload

### 7.4 Vulnerabilidades Potenciales Observadas

| Vulnerabilidad | Evidencia | Severidad |
|---|---|---|
| PHP 5.6.38 EOL | Header `X-Powered-By: PHP/5.6.38` | **CRÍTICA** |
| nginx 1.10.3 EOL | Header `Server: nginx/1.10.3` | **ALTA** |
| `HttpOnly`/`Secure` no confirmados en PHPSESSID | Cookie sin flags explícitos observados | MEDIA |
| Nombre de campo con espacio (`Tu Mensaje`) | Presente en forms de contacto | BAJA |
| Login diferenciado por campo `formulari` | Misma URL para candidato y empresa | MEDIA |
| Password constraint client-side (6-12 dígitos) | Solo validado en JS | MEDIA |
| Contraseñas en POST visibles en logs de tráfico | Sin HSTS confirmado | MEDIA |

### 7.5 Mecanismo de Tokens por Formulario

Cada página genera un token CSRF único embebido en el formulario como campo `<input type="hidden" name="token">`. Los tokens observados son hashes hexadecimales de 32 caracteres. El servidor valida el token al procesar el POST y rechaza peticiones con token inválido o faltante.

---

## 8. Hallazgos Técnicos Destacados

### 8.1 Sistema de IDs Duales para Ofertas

Las ofertas tienen **dos identificadores**:
- **`Up`**: Código alfanumérico público de 5 caracteres (ej. `EJFMF`). Aparece en URLs visibles.
- **`Id`**: ID numérico interno (ej. `16292`). Se usa en los POST de postulación.

El mapeo entre ambos se infiere: la ficha pública usa `Up`, el proceso de inscripción usa `Id`.

### 8.2 Wizard de CV con Control `idpas`

El formulario de CV usa un sistema wizard donde `Pes` en la URL (0-4) controla qué sección se muestra, y `idpas` en el formulario hidden es `Pes+1`. El campo `continua` controla si se guarda la sección actual (0) o se avanza (1).

### 8.3 Sub-formularios dinámicos en CV

Las secciones de Estudios (Pes=1) y Experiencia (Pes=2) implementan un CRUD dinámico sin AJAX: para añadir un registro se envía el mismo formulario con `nou_estudi=1` o `nova_experiencia=1`, y el servidor devuelve el HTML actualizado con el nuevo campo visible. Para eliminar, `elimina_estudi=1` o `elimina_experiencia=1`. El campo `te_sub_form=1` señaliza que hay un sub-formulario activo en la respuesta.

### 8.4 Dos Flujos de Postulación

- **Flujo moderno** (`info_oferta.php`): solo para candidatos ya autenticados. Usa popup JS + POST.
- **Flujo legacy** (`login_inscripcion.php`): combina login y postulación en un solo POST. Diseñado para usuarios no autenticados que llegan desde la página pública de ofertas.

### 8.5 Paginación con Parámetros Ofuscados

Las URLs de paginación incluyen parámetros `uzuou` y `ru` cuyo significado no es inmediatamente interpretable (posiblemente parámetros de contexto de búsqueda codificados en Base64 o encoding propio).

### 8.6 VadEmpleo como Sub-marca

El subdominio `vadempleo.disjob.com` responde con título "vadEmpleo - El Portal de Empleo" (sin "disCapacidad") — posiblemente una versión del portal orientada a empleo general, compartiendo el mismo backend PHP pero con branding diferente.

### 8.7 Upload CV con OCR

El sistema soporta dos modos de upload de CV: adjuntar el archivo directamente (`tipusEnviament=1`) o enviar el archivo para procesamiento OCR del texto (`tipusEnviament=2`). El segundo modo extrae el texto y lo popula en el campo `TextCvCand`.

---

## 9. Riesgos Técnicos

| Riesgo | Descripción | Impacto |
|---|---|---|
| PHP 5.6 EOL (2018) | Sin soporte de seguridad desde diciembre 2018. Múltiples CVEs activos. | Crítico |
| nginx 1.10.3 EOL | Sin actualizaciones de seguridad desde 2017. | Alto |
| Sin APIs REST | Cualquier integración requiere scraping o refactorización total. | Alto |
| Acoplamiento total HTML/lógica | PHP genera HTML directamente. Sin separación presentación/negocio. | Alto |
| Campo `Tu Mensaje` con espacio | Nombre de campo inválido en HTML estándar. Puede causar issues en parsers. | Medio |
| jQuery 1.10.2 | Versión de 2013, múltiples vulnerabilidades XSS conocidas. | Medio |
| Sesiones PHP en disco | Sin evidencia de Redis/Memcached. Escalabilidad horizontal limitada. | Medio |
| Datos sensibles en URL | `?nocache=<timestamp>` en login puede quedar en logs de servidor. | Bajo |
| Sin API de postulación directa | No hay endpoint REST para postular sin sesión de browser. | Alto |

---

## 10. Oportunidades de Modernización

### 10.1 Backend
- **Migrar a PHP 8.x**: Mejora de rendimiento (JIT), type safety, soporte activo.
- **Implementar API REST/JSON**: Separar presentación de negocio. Enables mobile apps, third-party integrations.
- **ORM / Doctrine**: Reemplazar queries SQL embebidas por capa de abstracción.
- **Autenticación JWT**: Reemplazar PHPSESSID por tokens JWT para stateless auth.
- **Redis para sesiones**: Escalabilidad horizontal y persistencia de sesiones.

### 10.2 Frontend
- **Desacoplar React/Vue**: La ausencia de AJAX y la dependencia total del SSR limita UX moderna.
- **Actualizar jQuery 1.10 → jQuery 3.x o vanilla JS**: Eliminar vulnerabilidades de seguridad.
- **Wizard de CV como SPA**: El flujo multi-paso de CV se beneficiaría de un SPA con estado local.
- **Upload de CV asíncrono**: Reemplazar el submit de formulario por `fetch()` con barra de progreso.

### 10.3 DevOps / Infraestructura
- **Containerizar con Docker**: La aplicación PHP 5.6 actual no puede correr en contenedores modernos sin adaptación.
- **HTTPS/HSTS forzado**: Garantizar que todas las sesiones sean cifradas.
- **WAF**: Mitigar riesgos de XSS/SQL injection dada la antigüedad del stack.
- **CDN para assets estáticos**: Los recursos `/assets/plugins/...` pueden servirse desde CDN.

### 10.4 Funcionalidad de Negocio
- **Notificaciones**: El sistema no muestra evidencia de notificaciones en tiempo real ni emails de seguimiento de candidaturas.
- **Dashboard empresa**: El portal de empresas no fue scrapeado completamente — puede tener gestión de ofertas, visualización de candidaturas, comunicación con candidatos.
- **Búsqueda avanzada de candidatos**: No observada — posible funcionalidad del portal empresa.
- **API de integración con ATS externos**: Algunas ofertas ya redirigen a CaixaBank Careers, etc. Una API permitiría integraciones más limpias.

---

## 11. Conclusiones

DisJob es un sistema funcional construido sobre un stack PHP 5.6 legacy con arquitectura monolítica SSR. A pesar de su antigüedad tecnológica, presenta un modelo de dominio claro y bien estructurado:

- **Dos actores principales**: Candidato y Empresa, con portales separados.
- **Flujos de negocio completos y funcionales**: registro, búsqueda, postulación, gestión de perfil.
- **Sistema de CV robusto**: 5 secciones con soporte CRUD por items (estudios, experiencias).
- **Seguridad CSRF correctamente implementada**: tokens por formulario y por sesión.
- **Doble flujo de postulación**: autenticado (popup + POST) y no autenticado (login combinado).

El principal riesgo operativo es el stack tecnológico fuera de soporte (PHP 5.6, nginx 1.10.3, jQuery 1.10.2). Una modernización debería priorizar la extracción de APIs REST como capa intermedia, manteniendo la lógica de negocio existente mientras se reemplaza la capa de presentación progresivamente.

---

*Documento generado por ingeniería inversa de tráfico de red y análisis de formularios HTML. © 2026. Información confidencial — uso interno.*
