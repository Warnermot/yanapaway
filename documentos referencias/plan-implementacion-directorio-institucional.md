# Plan de implementación: directorio institucional

Módulo a cargo de: Churiri Rodriguez Efrain
Rama de trabajo: `directorio-efrain`
Alcance: base de datos, API y páginas públicas del directorio institucional (búsqueda, ficha, solicitud de orientación), de inicio a despliegue en la nube. El panel de administración **no** es parte de este módulo, lo construye otro compañero sobre el CMS; aquí solo se deja lista la API para que ese panel la consuma.

Cada fase termina en un checkout: el trabajo de esa fase queda en un commit local propio, sin push. El push es decisión tuya, cuando lo confirmes.

---

## Fase 1 — Preparar Astro para SSR y base de datos

- [x] Instalar dependencias
  ```bash
  pnpm add drizzle-orm pg
  pnpm add -D drizzle-kit @types/pg
  pnpm add @astrojs/node
  ```
- [x] Editar `astro.config.mjs`: agregar `output: 'server'` y el adapter de node
- [x] Crear `.env` con `DATABASE_URL` (agregarlo a `.gitignore` si no está) — valor local de desarrollo (`postgres://postgres:postgres@localhost:5432/yanapaway_dev`); pendiente actualizar cuando el equipo decida dónde vive Postgres en producción (Fase 0)
- [x] Crear `drizzle.config.ts` apuntando a `src/db/schema.ts`
- [x] **Checkout**
  ```bash
  git add astro.config.mjs package.json pnpm-lock.yaml drizzle.config.ts .gitignore
  git commit -m "Configura Astro en modo SSR y dependencias de base de datos"
  ```
  Commit `545da88` en la rama `directorio-efrain`.

---

## Fase 2 — Esquema de base de datos

- [x] `src/db/schema.ts`: las cuatro tablas (`instituciones`, `tipos_caso`, `instituciones_tipos_caso`, `solicitudes_orientacion`), según `directorio-institucional-schema.md`
- [x] `src/db/client.ts`: conexión a Postgres usando `DATABASE_URL` — nota: la creación del rol de Postgres con permisos limitados (no superusuario) es tarea de infraestructura, pendiente junto con el resto de la Fase 0
- [x] Generar y aplicar la migración
  ```bash
  pnpm drizzle-kit generate
  pnpm drizzle-kit migrate
  ```
  Probado de verdad contra un Postgres temporal en Docker (levantado y destruido solo para esta prueba): 4 tablas, FKs e índices creados correctamente.
- [x] `src/db/seed.ts`: seed de `tipos_caso` — probado contra el mismo Postgres temporal, 5 tipos de caso insertados
- [x] **Checkout**
  ```bash
  git add src/db drizzle.config.ts
  git commit -m "Agrega esquema Drizzle y migracion inicial de instituciones"
  ```
  Commit `262ec98` en la rama `directorio-efrain`.

---

## Fase 3 — Capa de consultas

- [x] `src/db/queries/instituciones.ts` → `listarInstituciones(filtros)`
- [x] `src/db/queries/instituciones.ts` → `listarInstitucionesCercanas(lat, lng, soloEmergencia)` (Haversine en SQL, con `LEAST/GREATEST` para evitar `NaN` de `acos` por errores de punto flotante)
- [x] `src/db/queries/instituciones.ts` → `obtenerInstitucionPorId(id)`
- [x] `src/db/queries/solicitudes.ts` → `crearSolicitudOrientacion(datos)`
- [x] Todas las consultas usan parámetros preparados de Drizzle (nunca concatenar texto del usuario dentro del SQL)
- [x] **Checkout**
  ```bash
  git add src/db/queries
  git commit -m "Agrega funciones de consulta para instituciones y solicitudes"
  ```
  Commit `c72c7a7` en la rama `directorio-efrain`. Probado contra un Postgres temporal en Docker con datos de ejemplo (Sucre/La Paz): filtros, orden por cercanía real y `soloEmergencia` funcionaron correctamente. De paso se fijó `typescript` en la línea 6.x (la 7.x rompe `astro check`) y se agregó `@astrojs/check` para poder tipar el proyecto.

---

## Fase 4 — Endpoints de API

- [x] `src/pages/api/instituciones/index.ts` — `GET` (lista + filtros)
- [x] `src/pages/api/instituciones/cercanas.ts` — `GET`
- [x] `src/pages/api/instituciones/[id].ts` — `GET`
- [x] `src/pages/api/solicitudes-orientacion.ts` — `POST`
- [x] Validar y sanear todos los parámetros de entrada (lat/lng dentro de rango válido, texto del formulario con límite de longitud) antes de tocar la base de datos
- [x] Aplicar un límite de solicitudes (rate limit) al endpoint de `solicitudes-orientacion`, por ser público y sensible, para evitar spam o abuso — 5 solicitudes / 10 min por IP, en memoria (`src/lib/rate-limit.ts`); nota: no persiste entre instancias, revisar si el despliegue final corre más de un proceso
- [x] Confirmar que las respuestas de error no filtran detalles internos (mensajes de Postgres, rutas del servidor) — errores devuelven mensajes genéricos, el detalle solo se registra en `console.error` del servidor
- [x] Nota: los endpoints de escritura sobre `instituciones` (crear, editar, desactivar) los expone el panel admin de tu compañero, no este módulo; aquí solo se deja la lectura pública y la creación de solicitudes
- [x] **Checkout**
  ```bash
  git add src/pages/api
  git commit -m "Agrega endpoints API del directorio institucional"
  ```
  Commit `da2d6be` en la rama `directorio-efrain`. Probado en vivo (Postgres temporal en Docker + `astro dev`): filtros válidos/inválidos, ficha existente/404/id inválido, creación de solicitud válida/inválida, y el rate limit bloqueando correctamente a partir del 6º intento.

---

## Fase 5 — Páginas públicas (pantallas 1, 2 y 3 del mockup)

- [x] `src/components/directorio/BuscadorInstituciones.astro` — filtros por tipo y tipo de caso (chips de radio, formulario GET server-rendered, sin JS necesario)
- [x] `src/components/directorio/TarjetaInstitucion.astro`
- [x] `src/components/directorio/MapaInstituciones.astro` — island con geolocalización real del navegador, consume `GET /api/instituciones/cercanas`
- [x] `src/pages/instituciones/index.astro` — inicio y búsqueda (llama a `listarInstituciones` directo en SSR, no vía fetch interno)
- [x] `src/pages/instituciones/[id].astro` — ficha de institución (404 real si no existe o el id no es UUID válido)
- [x] `src/pages/solicitar-orientacion.astro` — formulario, con institución preseleccionada por query param, contador de caracteres y envío por fetch sin recargar la página
- [x] CSS responsivo único (un solo layout con media queries, sin duplicar para móvil), usando la paleta y tokens de `global.css` (agregué `--radius-m/l`, `--shadow-soft` y tonos `-soft` reutilizables)
- [x] El formulario de solicitud no guarda ni muestra el contenido del mensaje en ningún log del servidor — el endpoint solo loguea `error.name`, nunca el cuerpo
- [x] **Checkout**
  ```bash
  git add src/pages/instituciones src/pages/solicitar-orientacion.astro src/components/directorio
  git commit -m "Implementa paginas publicas del directorio institucional"
  ```
  Commit `7644384` en la rama `directorio-efrain`. Probado en vivo (Postgres temporal + `astro dev`): listado con y sin filtros, chips reflejando la selección, ficha real y 404, formulario con institución preseleccionada, y un envío de solicitud de punta a punta verificado directo en la base de datos. Encontré y arreglé 2 bugs reales durante la prueba: un espacio faltante en el contador de resultados, y el endpoint de solicitudes rechazaba `null` en campos opcionales (solo aceptaba `undefined`). También agregué el link "Directorio" al `Header.astro` real, porque si no la página quedaba sin forma de llegar a ella desde la navegación.

---

## Fase 6 — Integración con el asistente SOS

- [x] Probar `GET /api/instituciones/cercanas?lat=...&lng=...&emergencia=true` con datos reales — probado con 4 instituciones (2 de emergencia, 2 no), orden por distancia y filtro correctos
- [x] Confirmar con Mauricio (asistente SOS) que la forma de la respuesta JSON le sirve, o ajustarla — pendiente su confirmación real; mientras tanto aplané el shape (antes venía anidado bajo `institucion`, ahora los campos van al mismo nivel que `distanciaKm`) y documenté un ejemplo real en `directorio-institucional-schema.md` para que lo revise
- [x] **Checkout**
  ```bash
  git commit -am "Ajustes tras pruebas de integracion con el asistente SOS"
  ```
  Commit `ab6fcda` en la rama `directorio-efrain`. Nota: al usar `-am` se incluyeron también cambios ya trackeados y pendientes de commit desde antes (rediseño de mockups y borrado de `mockups-directorio.html` duplicado) — el contenido es correcto, solo quedó mezclado con este commit en vez de ir aparte.

---

## Fase 7 — Pruebas

- [x] Pruebas de `src/db/queries/instituciones.ts` (listar, filtrar por tipo de caso, cercanía) contra una base de datos de prueba — Postgres real y desechable vía Testcontainers, no mocks
- [x] Pruebas de `POST /api/solicitudes-orientacion`: caso válido, campos faltantes, texto demasiado largo, tipo de caso inexistente, más el rate limit
- [x] Prueba de `GET /api/instituciones/cercanas` con coordenadas inválidas o fuera de rango
- [x] **Checkout**
  ```bash
  git add "**/*.test.ts"
  git commit -m "Agrega pruebas de consultas y endpoints del directorio institucional"
  ```
  Commit `a149a4f` en la rama `directorio-efrain`. Se agregó Vitest + Testcontainers (`pnpm test`, spinea y destruye un Postgres real por archivo de prueba, sin pasos manuales — sirve tal cual para CI en la Fase 9). Las pruebas encontraron un bug real: un `tipoCasoId` con formato UUID válido pero inexistente causaba un `500` (violación de FK sin capturar) en vez de un `400`; se corrigió detectando el código `23503` de Postgres (anidado en `error.cause` por cómo Drizzle envuelve los errores) y devolviendo un mensaje claro sin filtrar detalles internos.

---

## Fase 8 — Seguridad y calidad

- [x] `pnpm build` sin errores
- [x] Pasar `/clean-code` sobre `src/db` y `src/pages/api` — encontró que el `POST` de `solicitudes-orientacion.ts` hacía demasiado (rate limit + parseo + 4 validaciones + insert + mapeo de error, todo junto); se extrajo `validarSolicitud()` como función pura. También se centralizó el logging de errores duplicado en 4 endpoints (`registrarError` en `lib/http.ts`). El resto de `src/db` ya estaba limpio.
- [x] Pasar `/security-review` sobre la rama antes de fusionar a `main` — encontró **1 XSS almacenado real** (severidad media, confianza 9/10, verificado por un segundo agente independiente): `MapaInstituciones.astro` insertaba `institucion.nombre` sin escapar vía `innerHTML`. Corregido usando `createElement`/`textContent` en vez de interpolación de strings. Sin inyección SQL (todo pasa por Drizzle parametrizado) ni secretos expuestos.
- [x] Confirmar que `.env` y cualquier credencial real nunca se subieron a Git (`git log --all --full-history -- .env`) — confirmado, vacío; `.env` sigue ignorado
- [x] **Checkout**
  ```bash
  git status
  git log --oneline -10
  ```
  Commit `277739f` en la rama `directorio-efrain` con los fixes de clean-code y seguridad. Working tree limpio salvo este mismo archivo de plan (sin commitear, es el documento de seguimiento).

El módulo (Fases 1-8: base de datos, API, páginas públicas, integración SOS, pruebas, seguridad) está completo y funcional. El despliegue a la nube quedó fuera de este plan porque aún no está decidido quién del equipo se encarga de esa parte.

- [ ] Decisión de `git push` y, si corresponde, Pull Request hacia `main` (manual, cuando tú confirmes)
