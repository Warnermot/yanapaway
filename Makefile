# ============================================================
#  Makefile - Proyecto Astro
#
#  Dos grupos de comandos:
#    1) Locales  -> corren con pnpm/astro directamente en tu maquina
#    2) Docker   -> empaquetan y corren el proyecto en contenedores
#
#  Tip: ejecuta `make help` para ver todos los comandos disponibles.
#
#  ATAJO: `make up` limpia, construye la imagen y levanta el
#         contenedor en un solo paso (sin el error del lock de astro).
# ============================================================

.PHONY: help install dev dev-stop dev-status dev-logs build preview check clean \
	up docker-build docker-dev docker-prod docker-down docker-logs docker-clean

# ---- Ayuda -------------------------------------------------

## Muestra esta lista de comandos
help:
	@echo "Comandos disponibles:"
	@echo ""
	@echo ATAJO:"
	@echo "    make up           Limpia + construye la imagen + levanta el contenedor (1 comando)"
	@echo ""
	@echo "  LOCALES (pnpm/astro):"
	@echo "    make install      Instala las dependencias del proyecto"
	@echo "    make dev          Levanta el servidor de desarrollo (en segundo plano)"
	@echo "    make dev-stop     Detiene el servidor de desarrollo"
	@echo "    make dev-status   Muestra si el servidor esta corriendo"
	@echo "    make dev-logs     Muestra los logs del servidor de desarrollo"
	@echo "    make build        Compila el sitio para produccion (genera dist/)"
	@echo "    make preview      Sirve localmente el build para revisarlo"
	@echo "    make check        Valida tipos y errores del proyecto"
	@echo "    make clean        Borra dist, .astro y node_modules"
	@echo ""
	@echo "  DOCKER (flujo: build -> dev/prod -> down):"
	@echo "    make docker-build Construye la imagen local de la app"
	@echo "    make docker-dev   Levanta el servicio 'dev' (desarrollo local)"
	@echo "    make docker-prod  Levanta el servicio 'web' con el perfil 'prod' (produccion)"
	@echo "    make docker-down  Detiene y elimina los contenedores"
	@echo "    make docker-logs  Muestra los logs en vivo (-f)"
	@echo "    make docker-clean Limpieza profunda: baja todo, borra imagenes y volumenes"

# ============================================================
#  ATAJO: generar la imagen y levantar en un solo comando
#
#  `make up` ejecuta en orden:
#    1) docker-down  -> baja cualquier contenedor previo
#    2) rm -rf .astro -> borra el lock huerfano (evita el error
#                        "Another astro dev server is already running")
#    3) docker-build -> genera la imagen local
#    4) docker-dev   -> levanta el contenedor
# ============================================================

## Limpia, construye la imagen y levanta el contenedor (todo en uno)
up: docker-down clean-lock docker-build docker-dev

## Borra solo el lock/estado de astro (uso interno de `up`)
clean-lock:
	rm -rf .astro

# ============================================================
#  1) COMANDOS LOCALES (sin Docker)
# ============================================================

## Instala las dependencias del proyecto
install:
	pnpm install

## Levanta el servidor de desarrollo en segundo plano
dev:
	pnpm astro dev --background

## Detiene el servidor de desarrollo que corre en segundo plano
dev-stop:
	pnpm astro dev stop

## Muestra el estado del servidor de desarrollo
dev-status:
	pnpm astro dev status

## Muestra los logs del servidor de desarrollo
dev-logs:
	pnpm astro dev logs

## Compila el sitio para produccion (genera la carpeta dist/)
build:
	pnpm astro build

## Sirve localmente el resultado de `build` para revisarlo
preview:
	pnpm astro preview

## Valida tipos y errores del proyecto (astro check)
check:
	pnpm astro check

## Elimina artefactos de compilacion y dependencias
clean:
	rm -rf dist .astro node_modules

# ============================================================
#  2) COMANDOS DOCKER
#
#  Flujo manual paso a paso:
#     make docker-build   # 1. construir la imagen
#     make docker-dev     # 2. desarrollar (o docker-prod para produccion)
#     make docker-logs    # 3. (opcional) vigilar los logs
#     make docker-down    # 4. apagar al terminar
#
#  O simplemente:  make up   (hace 1 y 2 sin el error del lock)
# ============================================================

## Construye la imagen local definida en docker-compose.yml
docker-build:
	docker compose build

## Levanta el servicio 'dev' en modo desarrollo
docker-dev:
	docker compose up dev

## Reconstruye y levanta el servicio 'web' con el perfil de produccion
docker-prod:
	docker compose --profile prod up --build web

## Detiene y elimina los contenedores en ejecucion
docker-down:
	docker compose down

## Muestra los logs en vivo y en tiempo real (-f = follow)
docker-logs:
	docker compose logs -f

## Limpieza profunda: baja contenedores, borra imagenes locales,
## volumenes (datos persistentes) y contenedores huerfanos
docker-clean:
	docker compose down --rmi local --volumes --remove-orphans