<div align="center">

<img src="assets/app.png" alt="Icono de Quota Orb" width="128" />

# Quota Orb

### Tu uso semanal de Codex y Claude, siempre visible

Un widget flotante, discreto y privado para Windows 11.

[![Validation](https://img.shields.io/github/actions/workflow/status/yeremyacuna/quota-orb/validate.yml?branch=main&style=for-the-badge&label=validation&logo=githubactions&logoColor=white)](https://github.com/yeremyacuna/quota-orb/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/v/release/yeremyacuna/quota-orb?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yeremyacuna/quota-orb/releases/latest)
[![License](https://img.shields.io/github/license/yeremyacuna/quota-orb?style=for-the-badge)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/yeremyacuna/quota-orb?style=for-the-badge)](https://github.com/yeremyacuna/quota-orb/commits/main)

[![Descargar para Windows](https://img.shields.io/badge/Descargar-Windows_11_x64-0078D4?style=for-the-badge&logo=windows11&logoColor=white)](https://github.com/yeremyacuna/quota-orb/releases/latest)

</div>

---

## Contenido

- [Qué es](#qué-es)
- [Vista previa](#vista-previa)
- [Instalación](#instalación)
- [Primer uso](#primer-uso)
- [Cómo funciona](#cómo-funciona)
- [GitHub Actions](#github-actions)
- [Qué es la carpeta `dist`](#qué-es-la-carpeta-dist)
- [Desarrollo](#desarrollo)
- [Privacidad y seguridad](#privacidad-y-seguridad)
- [Limitaciones](#limitaciones)
- [Licencia](#licencia)

---

## Qué es

Quota Orb muestra cuánto uso **semanal restante** tienes en Codex y Claude mediante dos aros de progreso. Vive sobre las demás ventanas, recuerda su posición, se actualiza cada minuto y se puede mostrar u ocultar desde la bandeja del sistema.

- **Verde:** más de 40 % restante.
- **Amarillo:** entre 15 % y 40 % restante.
- **Rojo:** menos de 15 % restante.
- **Aro completo:** 100 % disponible.
- **Aro vacío:** límite agotado o sesión no disponible.

No aparece en la barra de tareas y se inicia al entrar en Windows. Un clic izquierdo en el icono de la bandeja muestra u oculta el widget; el clic derecho permite cerrarlo.

---

## Vista previa

<div align="center">

<img src="docs/screenshot.png" alt="Vista previa de Quota Orb" width="280" />

<sub>La captura usa valores ficticios y no contiene datos de ninguna cuenta.</sub>

</div>

---

## Instalación

### Para cualquier usuario

1. Abre la página de [Releases](https://github.com/yeremyacuna/quota-orb/releases/latest).
2. Descarga **`QuotaOrb-Setup-1.0.0-x64.exe`**.
3. Ejecuta el archivo y espera a que finalice la instalación.
4. Abre **Quota Orb** desde el menú Inicio o el acceso directo del escritorio.

Eso es todo. El usuario final **no necesita Git, Node.js, npm ni clonar el repositorio**. El `.exe` de Releases contiene la aplicación y su instalador.

> [!NOTE]
> Los archivos automáticos `Source code (zip)` y `Source code (tar.gz)` que muestra GitHub son para desarrolladores. No instalan la aplicación.

> [!WARNING]
> La versión actual no tiene firma digital. Windows SmartScreen puede mostrar una advertencia de editor desconocido. El código y el proceso de compilación están disponibles en este repositorio para su revisión.

El instalador es de un solo paso, se instala para el usuario actual y crea accesos directos en el escritorio y el menú Inicio. Está preparado para **Windows 11 x64**.

---

## Primer uso

### Codex

Quota Orb lee localmente los eventos de uso que Codex guarda en `~/.codex/sessions`. No requiere copiar tokens ni configurar una clave. Si utilizas `CODEX_HOME`, la aplicación respeta esa ubicación.

### Claude

La aplicación de escritorio de Claude por sí sola no crea la sesión que necesita el widget. Instala el CLI oficial de Claude y ejecuta una vez:

```powershell
claude auth login
```

Quota Orb solo busca la credencial en la ubicación oficial del CLI. No explora navegadores ni otros archivos.

El token de Claude dura aproximadamente ocho horas. Cuando está por vencer, Quota Orb delega su renovación al CLI oficial ejecutando una petición mínima con Haiku. Esta renovación puede gastar unos pocos tokens, aproximadamente tres veces al día. Para desactivarla, inicia la aplicación con `QUOTA_ORB_NO_REFRESH=1`.

---

## Cómo funciona

```text
Sesiones locales de Codex ──┐
                            ├── Servidor local 127.0.0.1 ── Widget Electron
API de uso de Anthropic ────┘           │
                                        ├── Bandeja del sistema
                                        ├── Posición persistente
                                        └── Inicio automático
```

| Fuente | Obtención | Frecuencia |
|---|---|---:|
| Codex | Lee solamente la cola de los archivos de sesión recientes y selecciona la ventana de 10 080 minutos | Cada minuto |
| Claude | Consulta el endpoint OAuth de uso con la sesión del CLI oficial | Cada minuto, con caché de 3 minutos |

El servidor usa únicamente el módulo `http` de Node.js, escucha en `127.0.0.1` y no habilita CORS público. El renderer está aislado mediante `contextIsolation`, sin integración directa con Node.js y con una política CSP restrictiva.

La arquitectura completa está documentada en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

> [!IMPORTANT]
> El endpoint de uso de Anthropic no está documentado públicamente y puede cambiar. Su lectura y validación están encapsuladas en `src/claude.js` para facilitar futuras correcciones.

---

## GitHub Actions

El repositorio tiene dos automatizaciones visibles en la pestaña **Actions**:

| Workflow | Cuándo se ejecuta | Qué hace |
|---|---|---|
| [`validate.yml`](.github/workflows/validate.yml) | En cada push a `main` y en cada pull request | Ejecuta las pruebas y busca patrones que pudieran indicar una credencial publicada por accidente. No crea releases. |
| [`release.yml`](.github/workflows/release.yml) | Al publicar una etiqueta que empiece por `v`, por ejemplo `v1.0.0` | Compila en un Windows limpio, vuelve a ejecutar las pruebas, genera el instalador NSIS y lo adjunta a GitHub Releases. |

La versión `v1.0.0` ya fue construida por GitHub Actions y su instalador público está en [Releases](https://github.com/yeremyacuna/quota-orb/releases/tag/v1.0.0).

---

## Qué es la carpeta `dist`

`dist` significa *distribution*. Es la carpeta de salida que crea `npm run dist` en la computadora donde se compila el proyecto.

- `dist/QuotaOrb-Setup-1.0.0-x64.exe` es una compilación local del instalador.
- La carpeta está ignorada por Git porque contiene archivos grandes y regenerables.
- Puede borrarse sin perder el código; `npm run dist` vuelve a crearla.
- GitHub Actions genera su propia carpeta `dist` en una máquina limpia y sube únicamente el `.exe` resultante a Releases.

Por eso el instalador dentro de `dist` y el instalador de Releases cumplen la misma función, pero **el enlace recomendado para los usuarios es Releases**.

---

## Desarrollo

Requisitos: Node.js 22 o posterior, npm y Windows 11 x64 para producir el instalador actual.

```powershell
git clone git@github.com:yeremyacuna/quota-orb.git
cd quota-orb
npm ci
npm test
npm start
```

Para crear un instalador local:

```powershell
npm run dist
```

### Estructura

```text
quota-orb/
├── .github/workflows/   # Validación y publicación de releases
├── assets/              # Iconos locales de la aplicación y la bandeja
├── docs/                # Captura, arquitectura, verificación y roadmap
├── src/
│   ├── main.js          # Ventana, bandeja, IPC y autoinicio
│   ├── server.js        # Servidor HTTP local
│   ├── codex.js         # Lectura de sesiones de Codex
│   ├── claude.js        # Uso de Claude y renovación mediante su CLI
│   ├── preload.js       # Puente IPC aislado
│   └── ui/              # HTML, CSS y JavaScript del widget
├── test/                # Pruebas unitarias
├── package.json
└── LICENSE
```

Los resultados comprobados y los casos pendientes están en [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

---

## Privacidad y seguridad

- Las credenciales nunca llegan a la interfaz ni se escriben en los logs.
- Codex se consulta desde archivos locales; no necesita una petición de red adicional.
- La única petición externa de uso es la consulta de Claude a `api.anthropic.com`.
- La aplicación no escribe en los archivos de credenciales.
- La captura pública usa datos ficticios.
- GitHub Actions revisa patrones de secretos antes de aceptar cambios en `main`.

---

## Limitaciones

- El instalador publicado actualmente es para Windows x64 y no está firmado digitalmente.
- La consulta de Claude depende de un endpoint no documentado que Anthropic puede modificar.
- Claude requiere una sesión iniciada mediante su CLI oficial.
- En juegos con pantalla completa exclusiva, Windows puede colocar el juego por encima del widget. El modo de pantalla completa en ventana sí permite verlo.
- El código contempla macOS y Linux, pero la versión `v1.0.0` se verificó y publicó para Windows 11.

Consulta el [roadmap](docs/ROADMAP.md) para conocer las mejoras previstas.

---

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).

Los logotipos proceden de [Simple Icons](https://simpleicons.org) (CC0); las marcas pertenecen a sus respectivos propietarios. Quota Orb es un proyecto independiente y no está afiliado con OpenAI ni Anthropic.

<div align="center">

Hecho por [Yeremy Acuña](https://github.com/yeremyacuna)

**[Descargar Quota Orb](https://github.com/yeremyacuna/quota-orb/releases/latest)**

</div>
