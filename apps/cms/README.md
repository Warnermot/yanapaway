# CMS — Yanapaway (Strapi 5)

Backend headless de gestión de contenidos para administradores del sitio.
Su única interfaz es el panel de administración; su salida es una API REST de
solo lectura que consume el sitio Astro (`apps/web`) en tiempo de build.

Ninguna persona en situación de violencia interactúa con este sistema. No
modela ni almacena datos de ninguna víctima ni visitante — las únicas
personas con cuenta son los gestores de contenido.

## Puesta en marcha (desarrollo)

Desde la raíz del repo:

```bash
cp env.example .env    # completar los secretos (ver el propio archivo)
make cms-up            # postgres + cms en Docker, segundo plano
make cms-logs          # seguir los logs
```

O la pila completa (db + cms + web):

```bash
make up
```

Local sin Docker (sqlite, primer plano):

```bash
make cms-develop
```

## Primer arranque: checklist

1. **Crear el Super Admin.** Al primer arranque, el panel pide crear el
   administrador inicial en `http://localhost:1337/admin`. Debe existir
   **exactamente uno** en producción, con credenciales no compartidas.
2. **Verificar la política de seguridad en el log.** En cada arranque, el
   bootstrap revisa y corrige los permisos. Buscar líneas `[bootstrap]`:
   dicen si todo estaba OK o si corrigió algo (permisos del rol público,
   registro de usuarios). Esto es esperado y deseado.
3. **Crear el token de API de solo lectura.** En _Settings → API Tokens →
   Create new API Token_, tipo **Read-only**. Ese token es el único acceso
   de lectura a la API, y lo usa solo el build del sitio Astro. Entregarlo al
   equipo del sitio por un canal seguro (nunca commitearlo).
4. **Crear usuarios Editor** para los gestores del día a día.

## Roles

- **Editor** — crea, edita y publica páginas e instituciones. Rol operativo.
- **Super Admin** — acceso total, incluida configuración y usuarios.

Solo se usan los roles nativos de la edición gratuita. No hay revisión en dos
etapas: cualquier Editor publica directamente (decisión consciente para un
equipo chico de confianza). Si más adelante se suman colaboradores externos,
se puede introducir el rol nativo "Author" (crea pero no publica) sin cambios
de código — solo reasignando el rol.

## Reglas de negocio que no vienen de fábrica

- **Vigencia de 180 días** (`src/middlewares/institucion-reglas.ts`): no se
  puede publicar una institución cuya `verificadoEn` esté vencida hace más de
  `VERIFICACION_MAX_DIAS` días. Se aplica en el backend (document service),
  no se puede saltear vía API.
- **Despublicación automática** (`src/cron/despublicar-vencidas.ts`): un cron
  diario despublica las instituciones que vencieron estando publicadas, y
  avisa por log las que están por vencer.
- **Baja lógica, nunca borrado** (`src/middlewares/institucion-reglas.ts`):
  el borrado físico de una institución está bloqueado. Se da de baja con
  `activa = false`.
- **Reconstrucción agrupada** (`src/services/rebuild-trigger.ts`): publicar/
  despublicar dispara un webhook al sitio; ráfagas se agrupan en una sola
  reconstrucción firmada con HMAC.

## Seguridad — panel de administración

El brief exige que el panel **no quede expuesto abiertamente** en internet
sin una capa adicional de restricción. El mecanismo concreto es una decisión
abierta (depende del servidor universitario). Se entrega listo para conectar:

- `nginx.admin-hardening.conf.example` — reverse proxy con lista de IPs
  permitidas + autenticación básica sobre `/admin`, dejando `/api` accesible
  para el build. **Cuidado:** al activarlo, no bloquear `/api`.

Otras garantías (verificadas por tests y por el bootstrap en cada arranque):

- Registro público de usuarios deshabilitado.
- Roles público y autenticado sin ningún permiso de API.
- Todos los secretos por variables de entorno, sin defaults en el código.

## Datos de prueba

```bash
pnpm --filter cms seed
```

Carga contenido claramente ficticio (prefijo `[DATOS DE PRUEBA]`, teléfonos
no marcables `000-000-0000`). **Aborta si `NODE_ENV=production`** — un dato
de prueba en producción no debe poder poner a nadie a marcar un número
inexistente en una emergencia.

## Contrato de API para el sitio

Ver [`docs/api-contract.md`](../../docs/api-contract.md) en la raíz del repo.
Los nombres de campo (en español) y los valores de las enumeraciones son un
**contrato** con el equipo del sitio: cambiarlos rompe su build.

## Tests

```bash
pnpm --filter cms test
```

El comando compila TypeScript a `dist/` antes de correr Jest (paso
`pretest`): Strapi carga `register()`/`bootstrap()` desde `dist/`, no desde
`src/` en vivo. La suite corre contra sqlite en memoria; un job de CI puede
correr la misma suite contra Postgres 16 real.
