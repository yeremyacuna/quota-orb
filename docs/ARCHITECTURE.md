# Arquitectura

El proceso principal de Electron contiene el servidor HTTP nativo en 127.0.0.1, la ventana, IPC, bandeja y autoinicio. El renderer con sandbox consulta `/api/uso` mediante un solo intervalo de 60 segundos. La altura medida se envía por el puente `usageBridge`.

Codex: enumera metadatos de sesiones, ordena por modificación, lee las colas de seis archivos y busca la ventana de 10080 minutos.

Claude: lee el archivo autorizado (Llavero en macOS), consulta el endpoint no documentado y convierte `seven_day.utilization` o `limits[kind=weekly_all]` a porcentaje restante. Caché de tres minutos, exclusión de peticiones simultáneas, backoff y renovación delegada al CLI oficial.

El renderer no recibe tokens. El HTTP rechaza hosts y orígenes externos; sirve únicamente archivos de una lista permitida. El estado local está en `.local`, excluido de Git. La posición se guarda en `app.getPath('userData')` y se valida contra monitores visibles al restaurar.
