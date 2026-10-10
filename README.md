# quota-orb

Widget de escritorio que muestra el **porcentaje semanal restante** de Codex y Claude. Dos aros, sin botones, sobre las demás ventanas. Electron y Node.js; sin dependencias adicionales de ejecución.

![Widget con datos ficticios](docs/screenshot.png)

La captura contiene datos ficticios (63 % y 28 %), no datos de una cuenta.

## Instalar en Windows 11

Descarga `QuotaOrb-Setup-1.0.0-x64.exe` desde [Releases](https://github.com/yeremyacuna/quota-orb/releases/latest) y ejecútalo. Instala Quota Orb para tu usuario, crea accesos directos y registra el inicio automático. Está construido para Windows 11 x64. Al no tener todavía un certificado comercial, Windows puede mostrar SmartScreen; comprueba que la descarga venga de este repositorio.

Desde el código fuente, con Node.js y npm:

```sh
npm ci
# Si falta el binario de Electron:
node node_modules/electron/install.js
npm test
npm start
npm run dist
```

`dist` genera el instalador NSIS de Windows. No instala un servicio ni requiere un servidor externo. Para salir: clic derecho en la bandeja → **Cerrar**. Clic izquierdo muestra u oculta. Arrastra desde cualquier punto del widget. La ventana mide aproximadamente 140 × 100 píxeles, con fondo negro al 30 %, borde de 1 píxel y texto con sombra.

Para desactivar el inicio automático usa Aplicaciones de inicio de Windows. `QUOTA_ORB_NO_AUTOSTART=1` evita volver a registrarlo al abrir desde código. Cerrar el widget no desactiva el inicio automático.

## Conectar las cuentas

**Codex:** usa Codex normalmente. El widget lee únicamente los últimos 512 KiB de hasta 24 archivos de sesión recientes en `$CODEX_HOME/sessions` o `~/.codex/sessions`. Compara la marca de tiempo interna de los eventos para que varias conversaciones activas no dejen visible un valor antiguo. Busca la ventana de `10080` minutos, independientemente de que sea `primary` o `secondary`. No consulta OpenAI por red. Si no hay ventana semanal disponible, muestra “sin datos”.

**Claude:** instala el CLI oficial y ejecuta una vez:

```sh
claude auth login
```

Completa tú el acceso en el navegador; no pegues tokens en el proyecto. Tener solamente la aplicación de escritorio no basta. El widget lee exclusivamente `~/.claude/.credentials.json`, campo `claudeAiOauth`; en macOS usa el Llavero, servicio `Claude Code-credentials`. No busca credenciales en otros lugares.

El endpoint `https://api.anthropic.com/api/oauth/usage` **no está documentado y puede cambiar**. Todo su parseo está en `src/claude.js`. Admite `seven_day.utilization` como porcentaje usado y el formato alternativo `limits[kind=weekly_all].percent`, asumido usado. Esta última interpretación aún necesita contrastarse con una cuenta real; `QUOTA_ORB_CLAUDE_PERCENT=remaining` invierte solo ese formato antiguo. No interpreta falta de datos como saldo ilimitado.

No puede garantizarse compatibilidad con todos los planes gratuitos o de pago: depende de que cada cuenta entregue una ventana semanal y permita acceder a esa fuente. Si no la entrega se muestra un guion.

### Renovación de Claude y consumo

Cuando `expiresAt` indica que faltan menos de 15 minutos, se llama al CLI oficial con:

```sh
claude -p "ok" --model haiku --strict-mcp-config --mcp-config '{"mcpServers":{}}'
```

En Windows se pasa el mismo JSON mediante un archivo local para evitar problemas de comillas del CLI. **Esto consume unos pocos tokens, aproximadamente tres veces al día si el token dura ocho horas y el widget permanece abierto.** El intervalo real depende del token y del uso. Como máximo se intenta una vez cada diez minutos. Después se vuelven a leer las credenciales; el widget nunca las escribe ni implementa un refresco OAuth propio. `QUOTA_ORB_NO_REFRESH=1` desactiva esta función.

## Estados y seguridad

- Aro completo = 100 % restante. Verde > 40 %, amarillo 15–40 %, rojo < 15 %.
- Sin sesión o datos: aro vacío y guion. Error de red: último valor atenuado.
- Una sola actualización periódica de 60 segundos; caché de Claude de tres minutos y backoff exponencial hasta una hora ante errores. Las peticiones concurrentes se agrupan.
- Si el reinicio ya pasó, un dato válido indica 100 % restante. El reloj local debe estar bien configurado.
- Servidor HTTP en `127.0.0.1`, puerto libre (o `QUOTA_ORB_PORT`), sin CORS abierto; rechaza hosts y orígenes ajenos.
- CSP restrictiva, aislamiento de contexto, renderer sin Node y con sandbox. Navegación y ventanas nuevas bloqueadas.
- Logos SVG de Simple Icons incrustados localmente. No hay fuentes remotas, telemetría ni servicios de analítica.
- La consulta de uso y la renovación autorizada mediante Claude CLI son las únicas funciones que necesitan salir a internet. El CLI tiene su propio comportamiento de red.
- Credenciales solo en memoria, nunca enviadas al renderer ni incluidas en logs. `.local`, cachés, dependencias y ejecutables están excluidos de Git.
- Para respetar la instalación dentro del proyecto, `app.getPath('userData')` apunta a `.local` junto al ejecutable (o en la raíz al ejecutar desde fuente). Ahí quedan posición y datos de Chromium; no se publican.
- Los juegos con pantalla completa exclusiva pueden taparlo. Usa pantalla completa en ventana.

## Verificación

Pruebas automatizadas: tiempo de reinicio, umbrales, selección de la ventana semanal, última línea JSONL, valores ausentes o corruptos, reset pasado, ambos formatos Claude y protección HTTP.

Windows: apertura y captura real con Electron 44.7.0. Las comprobaciones adicionales y sus límites están en `docs/VERIFICATION.md`. macOS y Linux requieren validación en sus respectivos sistemas.

Para regenerar una captura sin datos privados, ejecuta Electron con `QUOTA_ORB_DEMO=1`, `QUOTA_ORB_NO_AUTOSTART=1` y `QUOTA_ORB_SCREENSHOT` apuntando a `docs/screenshot.png`. Captura únicamente la ventana y sale. No uses modo demo en el uso diario.

## Publicación

El flujo `release.yml` compila un instalador nuevo cuando se publica una etiqueta `v*`. `.local`, credenciales, registros, dependencias y capturas de consumo real están excluidos de Git.

Licencia MIT. Logos: [Simple Icons](https://simpleicons.org), CC0; marcas de sus respectivos propietarios. Proyecto independiente, sin afiliación con OpenAI ni Anthropic.
