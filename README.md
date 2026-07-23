# Astro Starter Kit: Basics

```sh
pnpm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 🛠️ Make

Este proyecto incluye un `Makefile` para acortar los comandos más usados
(por ejemplo `make dev` en lugar de `pnpm astro dev --background`, o
`make docker-build` para levantar los contenedores). `make` sirve para
ejecutar tareas definidas con nombres cortos y así evitar memorizar
comandos largos.

En Linux y macOS `make` normalmente ya viene instalado. Si no lo tienes,
instálalo según tu sistema:

```sh
# Debian / Ubuntu
sudo apt install make

# macOS (con Homebrew)
brew install make

# macOS (Command Line Tools de Xcode)
xcode-select --install

# Fedora
sudo dnf install make

# Arch Linux
sudo pacman -S make

# Windows (con Chocolatey)
choco install make
```

Comprueba que quedó instalado:

```sh
make --version
```

Luego ejecuta `make help` para ver todos los comandos disponibles del proyecto.

