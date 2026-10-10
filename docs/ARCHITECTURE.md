# Arquitectura

El proceso principal de Electron contiene el servidor HTTP nativo en 127.0.0.1, la ventana, IPC, bandeja y autoinicio. El renderer con sandbox consulta `/api/uso` mediante un solo intervalo de 60 segundos. La altura medida se envía por el puente `usageBridge`.

Codex: enumera metadatos de sesiones, lee las colas de hasta 24 archivos y escoge el evento por su marca de tiempo interna; después busca la ventana de 10080 minutos. Esto evita que una conversación antigua retomada o varios procesos activos dejen visible un límite desactualizado.

Claude: lee el archivo autorizado (Llavero en macOS), consulta el endpoint no documentado y convierte `seven_day.utilization` o `limits[kind=weekly_all]` a porcentaje restante. Caché de tres minutos, exclusión de peticiones simultáneas, backoff y renovación delegada al CLI oficial.

El renderer no recibe tokens. El HTTP rechaza hosts y orígenes externos; sirve únicamente archivos de una lista permitida. El estado local está en `.local`, excluido de Git. La posición se guarda en `app.getPath('userData')` y se valida contra monitores visibles al restaurar.
