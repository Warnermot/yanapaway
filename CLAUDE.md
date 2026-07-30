## Estructura

Monorepo pnpm con dos apps:

- `apps/web` — sitio Astro en modo SSR (`output: 'server'` con adapter Node). Tiene
  rutas propias bajo `src/pages/api/**`: son las que hablan con Strapi usando el
  token del servidor, para que nunca salga al navegador.
- `apps/cms` — Strapi 5 (backend headless que alimenta a `apps/web` vía API REST)

El único acceso de `apps/web` a Strapi es un token de API cuya lista de permisos
vive en `apps/cms/src/bootstrap/token-integracion-web.ts`. Al agregar un
content-type nuevo hay que sumarlo a esa lista, o el sitio recibe un 401
silencioso.

Ver `make help` para todos los comandos disponibles.

## Development

### apps/web (Astro)

Usar modo background para el servidor de desarrollo:

```
make web-dev
```

Manejar el servidor en background con `make web-dev-stop`, `make web-dev-status` y `make web-dev-logs`.

### apps/cms (Strapi)

Strapi no soporta modo background nativo. Dos opciones:

```
make cms-develop   # local, sqlite, primer plano
make cms-up        # docker: postgres + cms, en segundo plano
```

Con `make cms-up`, usar `make cms-logs` para seguir los logs.

### Pila completa (db + cms + web)

```
make up
```

## Documentación

- Astro: https://docs.astro.build
- Strapi 5: https://docs.strapi.io

Consultar antes de trabajar en tareas relacionadas:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
- [Strapi content-types](https://docs.strapi.io/cms/backend-customization/models)
- [Strapi document service middlewares](https://docs.strapi.io/cms/api/document-service/middlewares)
- [Strapi lifecycle hooks and configuration functions](https://docs.strapi.io/cms/configurations/functions)
