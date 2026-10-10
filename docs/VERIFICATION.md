# Verificación local

Fecha: 9 de octubre de 2026 (America/Lima).

## Comprobado en Windows

- 14 pruebas automatizadas pasan: tiempo, colores, JSONL, ventanas semanales, reset pasado, datos ausentes, formatos Claude y servidor HTTP.
- Compilación de la carpeta ejecutable con Electron 44.7.0 y electron-builder 26.15.3.
- Apertura del ejecutable real: visible, always-on-top activo, dos columnas y puente IPC disponible. Tamaño observado: 140 × 106 píxeles.
- Bandeja creada; el evento de clic alterna ocultar/mostrar en una comprobación programática (no clic manual).
- `getLoginItemSettings().openAtLogin` devuelve true. No se reinició Windows ni se cerró la sesión para comprobar el arranque posterior.
- API local con datos reales de Codex y estado `noauth` de Claude. No hay credenciales Claude en su ubicación permitida.
- Captura con `capturePage()`, limitada al widget y con valores ficticios para publicación.
- Persistencia: sesión de prueba restauró la posición (120, 120) y la volvió a guardar al salir. Instancia única: abrir otra vez el ejecutable conservó la misma ventana y proceso principal.

## Pendiente de comprobación real

- Claude: autenticación por el propietario con `claude auth login`; respuesta del endpoint, límites del plan y renovación con Haiku. El usuario autorizó el refresco, pero no se ejecutó por ausencia de sesión.
- Cuentas gratuitas y pagadas por separado; macOS y Linux.
- Arrastre manual, cambios de monitores, juegos y reinicio completo del sistema.
- Fallos reales de Anthropic 401/429/5xx, desfase del reloj y renovación al vencer ocho horas. El código incluye protecciones, pero no se provocaron estos casos en una cuenta real.

El ejecutable no está firmado. No se publicó ningún repositorio ni se configuró un remoto.
