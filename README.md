# Yanapaway — Plataforma de apoyo a víctimas de violencia de pareja

Línea de productos de software que ofrece información y soporte a personas en situación de violencia de pareja.

**Este repositorio contiene dos aplicaciones:**
- `apps/web` — sitio Astro (información pública)
- `apps/cms` — backend Strapi (panel para administradores)

---

## 🚀 Guía rápida para desarrolladores: levantar el ambiente

### Requisitos previos

Necesitás tener instalado:
- **Docker** y **Docker Compose** ([descargar acá](https://www.docker.com/products/docker-desktop))
- **Node.js ≥22** ([descargar acá](https://nodejs.org/))
- **pnpm** (gestor de paquetes): `npm install -g pnpm`

Si no sabés si ya lo tenés, abrí una terminal y escribí:
```bash
docker --version
docker compose --version
node --version
pnpm --version
```

### Paso 1: Clonar y preparar

```bash
# Clonar el repositorio
git clone https://github.com/Warnermot/yanapaway.git
cd yanapaway

# Copiar el archivo de configuración
cp env.example .env
```

### Paso 2: Completar los secretos (archivo `.env`)

Abrí el archivo `.env` que acabas de crear y buscá estas líneas:

```
DATABASE_PASSWORD=cambiar-por-una-contrasena-fuerte
APP_KEYS=clave1,clave2
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=
ENCRYPTION_KEY=
```

Para generar valores seguros, podés usar este comando en la terminal (repetilo para cada secreto):

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

Copiá y pegá el resultado en lugar de los valores vacíos. Para `APP_KEYS` genera dos valores separados por coma.

**Para desarrollo rápido**, podés simplemente poner valores cualquiera si querés probar (nunca hagas esto en producción):

```
DATABASE_PASSWORD=desarrollo123
APP_KEYS=clave1,clave2
API_TOKEN_SALT=desarrollo
ADMIN_JWT_SECRET=desarrollo
TRANSFER_TOKEN_SALT=desarrollo
JWT_SECRET=desarrollo
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
```

### Paso 3: Levantar todo con Docker

Una sola línea levanta la base de datos + CMS + sitio web:

```bash
make up
```

**¿Qué está pasando?**
- Se descarga la imagen de PostgreSQL 16 (base de datos)
- Se compila el CMS Strapi
- Se compila el sitio Astro
- Todo arranca en segundo plano

Esperar 30-60 segundos a que todo esté listo. Verás mensajes así:

```
cms_1  | Strapi started successfully
web_1  | ┌─────────────────────────────────────────┐
web_1  | │ Local:    http://localhost:4321       │
web_1  | └─────────────────────────────────────────┘
```

### Paso 4: Acceder a las aplicaciones

Abrí el navegador:

- **Sitio web**: http://localhost:4321
- **Panel CMS**: http://localhost:1337/admin

### Primer acceso al CMS

La primera vez que entres en http://localhost:1337/admin, te va a pedir crear el administrador principal.

**Importante:** Este es el único admin que deberías crear localmente. Completá:
- **Email** — cualquiera: `admin@test.local`
- **Nombre** — cualquiera: `Admin Local`
- **Contraseña** — lo que quieras para desarrollo

Cuando termines, ¡estás adentro! El panel está en **español**.

### Comandos útiles

```bash
# Ver los logs de lo que está pasando
make cms-logs

# Detener todo
make cms-down

# Reiniciar el CMS (sin perder datos)
make cms-down && make cms-up

# Cargar datos de prueba en la base de datos
pnpm --filter cms seed
```

### Datos de prueba

Si querés cargar instituciones y páginas de ejemplo, ejecutá:

```bash
pnpm --filter cms seed
```

Esto agrega contenido claramente marcado como `[DATOS DE PRUEBA]` — teléfonos ficticios, nombres con prefijo, todo para que no haya confusion con datos reales.

---

## 📚 Más información

- **CMS:** ver [apps/cms/README.md](apps/cms/README.md)
- **Sitio web:** ver [apps/web/README.md](apps/web/README.md)
- **API:** ver [docs/api-contract.md](docs/api-contract.md)

---

## ❓ ¿Algo no funciona?

**Docker no inicia:**
- Asegurate de que Docker Desktop está corriendo (en Mac/Windows, mirá en el dock)
- En Linux, probá: `sudo systemctl start docker`

**Puertos ocupados:**
- Si algo usa ya el puerto 1337 o 4321, podés cambiarlos en `docker-compose.yml`

**Base de datos lenta:**
- La primera vez tarda un poco. Esperá 1-2 minutos.

**¿Necesitás borrar todo y empezar de cero?**
```bash
make cms-clean
make up
```

---

Cualquier duda, preguntá. ¡Bienvenido al equipo! 🚀
