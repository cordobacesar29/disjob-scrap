# Resumen de endpoints y formularios de disjob.com

Este archivo agrupa los endpoints clave y los campos de formulario observados en los registros de red.

## 1. Endpoints de negocio principales

### 1.1 Ofertas y búsqueda
- `GET https://www.disjob.com/ofertas_cerca.php`
  - Página de búsqueda y filtros de ofertas.
- `POST https://www.disjob.com/ofertas_cerca.php`
  - Búsqueda de ofertas.
  - Campos observados:
    - `palabra_clave`
    - `idSector`
    - `idProvincia`
    - `token`

- `GET https://www.disjob.com/ofertas_fitxa.php?Up=<ID>`
  - Detalle de oferta.

### 1.2 Inscripción / aplicación de candidato
- `GET https://www.disjob.com/login_inscripcion.php?Up=<ID>&externa=...`
  - Página de acceso/inscripción para aplicar a una oferta.
- `POST https://www.disjob.com/login_inscripcion.php`
  - Envío de credenciales o datos de aplicación.
  - Campos observados:
    - `idioma`
    - `formulari` (ej. `candidat`)
    - `idoferta`
    - `token`
    - `Usu_Acces`
    - `Pwd_Acces`
    - `externa_val`

### 1.3 Gestión de candidato
- `GET https://www.disjob.com/candidaturas.php`
  - Panel de candidaturas.
- `GET https://www.disjob.com/cv_completo.php`
  - Editor de CV.
- `POST https://www.disjob.com/cv_completo.php`
  - Actualización de datos de CV / perfil.
  - Campos observados (ejemplos representativos):
    - `idioma`
    - `idpas`, `continua`, `te_sub_form`
    - `token`
    - `DataNaci_cand`, `dia`, `mes`, `any`
    - `IdDocIdentidad`, `docIdentidad_cand`
    - `direccion_cand`, `codiPostal_cand`, `Poblacion`
    - `IdModoContacto`
    - `TelfMovil_cand`, `TelfFijo_cand`
    - `vehiculo_cand`, `autonomo_cand`
    - `linkedin_cand`
    - `con_estudios`, `IdNivellEstudis`, `IdEspecialidad`, `centre_estudis`
    - `nou_estudi`, `elimina_estudi`
    - `con_experiencia`, `Empresa_Exp`, `Puesto_Exp`, `Desc_Exp`, `IdCategoria`, `IdJornada`, `idNivel`, `idTipoContrato`
    - `puesto_deseado_cand`

### 1.4 Contacto empresarial
- `GET https://empresas.disjob.com/contacta.php`
  - Formulario de contacto para empresas.
- `POST https://empresas.disjob.com/contacta.php`
  - Envío del formulario de contacto.
  - Campos observados:
    - `idioma`
    - `nombre`
    - `mail_usuario`
    - `mailfrom`
    - `mailtodom`
    - `mailtoinici`
    - `telefono`
    - `categorias`
    - `asunto`
    - `subject`
    - `Tu Mensaje`
    - `token`
    - `urlrespostaok`
    - `urlrespostako`
    - `conformidad`

## 2. Otros endpoints de interés

- `GET https://www.disjob.com/home.php`
- `GET https://www.disjob.com/ofertas.php`
- `GET https://www.disjob.com/noticias.php`
- `GET https://www.disjob.com/quienes_somos.php`
- `GET https://www.disjob.com/cambio_pwd.php`
- `GET https://www.disjob.com/baja_servicio.php`
- `GET https://www.disjob.com/sortir.php`
- `GET https://empresas.disjob.com/empresa_alta.php`
- `GET https://empresas.disjob.com/empresa_disjob.php`

## 3. Observaciones rápidas

- La búsqueda de oferta usa un POST clásico a la misma página (`ofertas_cerca.php`) en lugar de una API AJAX separada.
- La postulación se gestiona mediante `login_inscripcion.php` y parece apoyarse en un token de formulario para validar la acción.
- El portal de empresas está en un subdominio independiente y también usa formularios server-side.
- El CV se actualiza por pasos (`idpas`) con múltiples secciones y campos dinámicos.

---

Archivo generado a partir de los registros de `network_traffic_FINAL_2026-06-08T17-44-30-035Z.json`.
