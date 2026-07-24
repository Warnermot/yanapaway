# ============================================================
#  Makefile - Monorepo Yanapaway (apps/web · apps/cms)
#
#  Grupos de comandos:
#    1) LOCALES web  -> pnpm/astro directamente en tu maquina
#    2) LOCALES cms  -> pnpm/strapi directamente en tu maquina
#    3) DOCKER (dev) -> postgres + cms + web con hot reload
#    4) DOCKER (prod)-> build de produccion, servido por nginx/node
#
#  Tip: ejecuta `make help` para ver todos los comandos disponibles.
#
#  ATAJO: `make up` limpia el cache de Astro, construye las imagenes
#         y levanta la pila completa de desarrollo en un solo paso.
# ============================================================

.PHONY: help install \
	web-dev web-dev-stop web-dev-status web-dev-logs web-build web-preview web-check \
	cms-develop cms-build cms-start cms-seed cms-test cms-test-watch \
	clean up clean-lock \
	docker-build docker-dev docker-down docker-logs docker-clean \
	cms-up cms-down cms-logs \
	docker-prod docker-prod-down docker-prod-logs

# ---- Ayuda -------------------------------------------------

## Muestra esta lista de comandos
help:
	@echo "Comandos disponibles:"
	@echo ""
	@echo "  ATAJO:"
	@echo "    make up              Limpia cache + construye + levanta db+cms+web (1 comando)"
	@echo ""
	@echo "  LOCALES web (pnpm/astro, apps/web):"
	@echo "    make web-dev         Levanta el servidor de desarrollo (en segundo plano)"
	@echo "    make web-dev-stop    Detiene el servidor de desarrollo"
	@echo "    make web-dev-status  Muestra si el servidor esta corriendo"
	@echo "    make web-dev-logs    Muestra los logs del servidor de desarrollo"
	@echo "    make web-build       Compila el sitio para produccion (genera dist/)"
	@echo "    make web-preview     Sirve localmente el build para revisarlo"
	@echo "    make web-check       Valida tipos y errores del proyecto"
	@echo ""
	@echo "  LOCALES cms (pnpm/strapi, apps/cms — usa sqlite local, sin Docker):"
	@echo "    make cms-develop     Levanta Strapi en modo desarrollo (primer plano)"
	@echo "    make cms-build       Compila el panel de administracion"
	@echo "    make cms-start       Corre Strapi compilado (modo produccion)"
	@echo "    make cms-seed        Carga datos de prueba ficticios (bloqueado en produccion)"
	@echo "    make cms-test        Corre la suite de tests del CMS una vez"
	@echo "    make cms-test-watch  Corre la suite de tests del CMS en modo watch"
	@echo ""
	@echo "  DOCKER — pila de desarrollo (db + cms + web, flujo: build -> dev -> down):"
	@echo "    make docker-build    Construye las imagenes locales"
	@echo "    make docker-dev      Levanta db+cms+web con hot reload"
	@echo "    make docker-down     Detiene y elimina los contenedores"
	@echo "    make docker-logs     Muestra los logs en vivo (-f) de toda la pila"
	@echo "    make docker-clean    Limpieza profunda: baja todo, borra imagenes y volumenes"
	@echo ""
	@echo "  DOCKER — solo backend (util si trabajas nada mas en el CMS):"
	@echo "    make cms-up          Levanta unicamente db+cms"
	@echo "    make cms-down        Detiene db+cms"
	@echo "    make cms-logs        Logs en vivo del servicio cms"
	@echo ""
	@echo "  DOCKER — pila de produccion (perfil 'prod'):"
	@echo "    make docker-prod       Reconstruye y levanta cms-prod + web-prod"
	@echo "    make docker-prod-down  Detiene la pila de produccion"
	@echo "    make docker-prod-logs  Logs en vivo de la pila de produccion"
	@echo ""
	@echo "  make install           Instala las dependencias de todo el workspace"
	@echo "  make clean             Borra dist, .astro, build, .strapi, .tmp y node_modules"

# ============================================================
#  ATAJO: generar las imagenes y levantar la pila de dev en un comando
# ============================================================

## Limpia cache, construye las imagenes y levanta db+cms+web (todo en uno)
up: docker-down clean-lock docker-build docker-dev

## Borra solo el cache/estado de Astro (uso interno de `up`)
clean-lock:
	rm -rf apps/web/.astro

# ============================================================
#  0) INSTALACION (workspace completo)
# ============================================================

## Instala las dependencias de todo el workspace (web + cms)
install:
	pnpm install

# ============================================================
#  1) COMANDOS LOCALES — web (sin Docker)
# ============================================================

## Levanta el servidor de desarrollo de Astro en segundo plano
web-dev:
	pnpm --filter web astro dev --background

## Detiene el servidor de desarrollo de Astro
web-dev-stop:
	pnpm --filter web astro dev stop

## Muestra el estado del servidor de desarrollo de Astro
web-dev-status:
	pnpm --filter web astro dev status

## Muestra los logs del servidor de desarrollo de Astro
web-dev-logs:
	pnpm --filter web astro dev logs

## Compila el sitio para produccion (genera apps/web/dist)
web-build:
	pnpm --filter web build

## Sirve localmente el resultado de `web-build` para revisarlo
web-preview:
	pnpm --filter web preview

## Valida tipos y errores del proyecto Astro
web-check:
	pnpm --filter web astro check

# ============================================================
#  2) COMANDOS LOCALES — cms (sin Docker, usa sqlite por defecto)
# ============================================================

## Levanta Strapi en modo desarrollo (primer plano; Strapi no soporta --background)
cms-develop:
	pnpm --filter cms develop

## Compila el panel de administracion del CMS
cms-build:
	pnpm --filter cms build

## Corre el CMS ya compilado (modo produccion)
cms-start:
	pnpm --filter cms start

## Carga datos de prueba ficticios (aborta si NODE_ENV=production)
cms-seed:
	pnpm --filter cms seed

## Corre la suite de tests del CMS una vez
cms-test:
	pnpm --filter cms test

## Corre la suite de tests del CMS en modo watch
cms-test-watch:
	pnpm --filter cms test:watch

# ============================================================
#  3) COMANDOS DOCKER — pila de desarrollo (db + cms + web)
# ============================================================

## Construye las imagenes locales definidas en docker-compose.yml
docker-build:
	docker compose build

## Levanta db + cms + web con hot reload
docker-dev:
	docker compose up

## Detiene y elimina los contenedores en ejecucion
docker-down:
	docker compose down

## Muestra los logs en vivo y en tiempo real (-f = follow) de toda la pila
docker-logs:
	docker compose logs -f

## Limpieza profunda: baja contenedores, borra imagenes locales,
## volumenes (Postgres, uploads) y contenedores huerfanos
docker-clean:
	docker compose down --rmi local --volumes --remove-orphans

# ============================================================
#  4) COMANDOS DOCKER — solo backend (db + cms, sin el sitio)
# ============================================================

## Levanta unicamente Postgres y el CMS
cms-up:
	docker compose up db cms

## Detiene Postgres y el CMS
cms-down:
	docker compose stop db cms

## Logs en vivo del servicio cms
cms-logs:
	docker compose logs -f cms

# ============================================================
#  5) COMANDOS DOCKER — pila de produccion (perfil "prod")
# ============================================================

## Reconstruye y levanta cms-prod + web-prod
docker-prod:
	docker compose --profile prod up --build cms-prod web-prod

## Detiene la pila de produccion
docker-prod-down:
	docker compose --profile prod down

## Logs en vivo de la pila de produccion
docker-prod-logs:
	docker compose --profile prod logs -f

# ============================================================
#  6) LIMPIEZA
# ============================================================

## Elimina artefactos de compilacion y dependencias de todo el workspace
clean:
	rm -rf apps/web/dist apps/web/.astro \
		apps/cms/dist apps/cms/build apps/cms/.cache apps/cms/.strapi apps/cms/.tmp \
		node_modules apps/web/node_modules apps/cms/node_modules
