# Contrato de API — CMS → Sitio Astro

> Documento para el equipo que construye el sitio Astro (`apps/web`). Describe
> cómo consumir el CMS Strapi (`apps/cms`) en tiempo de build.

## Regla de oro

El modelo de datos es un **contrato entre dos equipos**, no implementación
interna libre de cambiar. Renombrar un campo, eliminarlo, o cambiar los
valores posibles de una enumeración **rompe el build del sitio**. Cualquier
cambio así se coordina antes, no se descubre en un deploy roto.

## Autenticación

Toda petición requiere un **token de API de solo lectura** en el header:

```
Authorization: Bearer <READONLY_API_TOKEN>
```

- El token lo usa **solo** el proceso de build del sitio. Nunca llega al
  navegador del visitante.
- Sin token, **ninguna** ruta responde datos (401/403). Esto es
  verificable y está cubierto por tests.
- No hay API pública, ni registro, ni sesiones de usuario final. La
  superficie de ataque pública es mínima por diseño.

## Identificador estable

Usar siempre `documentId` (string) para relaciones y referencias, **no** el
`id` numérico interno. En Strapi 5 el `documentId` es el identificador
estable de un documento a lo largo de sus versiones (borrador/publicado).

## Endpoints

Base: `https://<cms-host>/api`

| Recurso | Ruta | Notas |
|---|---|---|
| Páginas de recursos | `GET /paginas` · `GET /paginas/:documentId` | Filtrables por categoría. Se publican en el sitio como `/recursos/{slug}` |
| Categorías de recurso | `GET /categorias-recurso` | Agrupan las tarjetas de `/recursos`. No forman parte de la URL |
| Instituciones | `GET /instituciones` | Filtrables por tipo/ciudad |
| Historias del blog | `GET /historias` · `GET /historias/:documentId` · `POST /historias` | Testimonios anónimos de `/blog`. Ver *Blog de historias* más abajo |
| Comentarios de historias | `GET /comentarios-historia` · `POST /comentarios-historia` | Mensajes de apoyo. Se filtran por `filters[historia][documentId][$eq]` |
| Sobre el proyecto | `GET /sobre-el-proyecto` | Single type |
| Términos | `GET /terminos` | Single type |
| Privacidad | `GET /privacidad` | Single type |

> Los nombres de ruta en plural los deriva Strapi del `pluralName` de cada
> content-type (`paginas`, `categorias-recurso`, `instituciones`).

> **Sección fue eliminada del modelo.** Los nuevos requerimientos descartan
> agrupar páginas para alimentar la navegación. La reemplaza *Categoría de
> recurso*, que solo agrupa y etiqueta las tarjetas del listado `/recursos`:
> la ruta pública de una página depende únicamente de su `slug`.

## Filtrado por estado de publicación

Por defecto la API devuelve solo contenido **publicado**:

```
GET /paginas                 # solo publicadas (default)
GET /paginas?status=draft    # solo borradores (requiere permiso; no lo usa el build)
```

El build del sitio siempre consume el default (publicado). El contenido no
llega al sitio hasta que un gestor lo publica explícitamente.

## Blog de historias: crear NO publica

El subproducto `/blog` es el único recurso donde **el sitio escribe contenido
que después se muestra en el sitio**, y lo escribe a partir de lo que envía
cualquier persona anónima: no hay cuentas ni login. Por eso nada es visible
hasta que un gestor lo aprueba en el panel.

```
POST /historias                    # crea SIEMPRE un borrador
POST /comentarios-historia         # idem
GET  /historias                    # solo aprobadas (default de publicación)
```

Dos cosas que no son obvias y conviene no descubrir en producción:

1. **Crear por la Content API no deja un borrador por sí solo.**
   `CoreService.getFetchParams` de `@strapi/core` inyecta `status: 'published'`
   en todas las llamadas del core service, incluida `create`. Lo que fuerza el
   borrador es el middleware `apps/cms/src/middlewares/blog-moderacion.ts`.
   Verificado en Strapi 5.51.0 y cubierto por `apps/cms/tests/blog-moderacion.test.ts`.

2. **Publicar, despublicar y borrar están bloqueados en la Content API**, incluso
   si alguien le concediera esos permisos al token. Aprobar un testimonio es una
   acción de una persona en el panel, y el backend lo trata como tal.

El campo `ipHash` de ambos recursos está marcado como **privado** en el schema:
existe solo para que la moderación detecte envíos masivos desde un mismo origen
y nunca aparece en una respuesta de la API.

### `alias`: vacío significa anónima

`alias` es **opcional** y guarda el nombre que eligió quien envía el contenido.
Sin valor significa que se publicó de forma anónima, y el sitio muestra
`Anónima` (`nombreParaMostrar` en `apps/web/src/lib/nombre-publico.ts` es el
único lugar donde se decide ese texto).

La ausencia del dato **es** la anonimidad: no se guarda un nombre de relleno que
después haya que interpretar en cada lectura. Volver `alias` requerido rompe la
publicación anónima.

El alias no es una cuenta ni identifica a nadie: no hay login, así que dos
historias firmadas igual no son necesariamente de la misma persona.

## Instituciones: solo activas y publicadas

Una institución puede estar publicada pero dada de baja lógica
(`activa = false`). El sitio debe pedir **ambas** condiciones:

```
GET /institucions?filters[activa][$eq]=true
```

(el `status=published` va implícito por default).

Filtros adicionales de ejemplo:

```
GET /institucions?filters[activa][$eq]=true&filters[tipo][$eq]=policial
GET /institucions?filters[activa][$eq]=true&filters[ciudad][$eq]=La%20Paz
GET /institucions?filters[esEmergencia][$eq]=true   # recursos de emergencia
```

## Sincronización incremental

Para no releer todo el contenido en cada build, filtrar por fecha de última
modificación:

```
GET /paginas?filters[updatedAt][$gt]=2026-07-01T00:00:00.000Z&sort=updatedAt:asc
```

### ⚠️ Advertencia crítica: `updatedAt` no detecta despublicaciones ni borrados

Una institución **despublicada** (manualmente o por el cron de vigencia de
180 días) o cuya baja lógica se activó **no aparece** en un delta por
`updatedAt` como "algo que quitar". Si el sitio solo suma los cambios del
delta, un teléfono retirado **sigue vivo en el sitio** — que es exactamente
el fallo que la regla de los 180 días intenta evitar.

**El loader del sitio debe, además del delta:**

1. Traer la lista completa de `documentId` actualmente publicados y activos.
2. Eliminar localmente cualquier documento que ya no esté en esa lista.

Sin este paso de reconciliación, el build incremental puede mostrar datos de
emergencia que el CMS ya retiró.

## Reconstrucción automática (webhook)

Al publicar o despublicar contenido, el CMS dispara una reconstrucción del
sitio mediante un POST a `REBUILD_WEBHOOK_URL`:

- Varias publicaciones en poco tiempo se **agrupan en una sola**
  reconstrucción (debounce), no una por cambio.
- El POST va firmado con HMAC-SHA256 en el header `X-Rebuild-Signature`,
  usando `REBUILD_WEBHOOK_SECRET`. El receptor **debe verificar la firma**
  antes de disparar un build.
- Body: `{ "event": "rebuild", "triggeredAt": "<ISO>" }`.

**Pendiente de definir entre equipos:** quién implementa y aloja el receptor
del webhook.

## Enumeraciones (valores fijos — cambiarlos rompe el build)

- `pagina.nivelSensibilidad`: `general` | `sensible`
- `institucion.tipo`: `policial` | `judicial` | `salud` | `psicologico` | `ong` | `refugio`
- `historia.categoria`: `general` | `violencia_fisica` | `violencia_psicologica` |
  `violencia_economica` | `violencia_digital` | `proceso_de_salida` | `recuperacion`
  (espejo en `apps/web/src/lib/historias.ts`: `CATEGORIAS_HISTORIA`, que el sitio
  usa además como lista blanca al recibir un envío)

## Campos por recurso

Ver los schemas en `apps/cms/src/api/*/content-types/*/schema.json` como
fuente de verdad. Los nombres de campo están en español a propósito (así los
define el brief) y forman parte del contrato.
