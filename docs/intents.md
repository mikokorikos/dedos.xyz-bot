# Guía de intents

El bot solicita por defecto los intents necesarios para trabajar con comandos de
prefijo, automatizar onboarding y responder a eventos de reacción. La matriz
por defecto incluye:

- `Guilds`
- `GuildMembers`
- `GuildMessages`
- `MessageContent`
- `GuildMessageReactions`
- `DirectMessages`

## Ajustar intents por despliegue

1. Edita `src/index.ts` para añadir o remover valores dentro de la propiedad
   `intents` del `Client`.
2. Documenta siempre en el comentario de arranque por qué el despliegue requiere
   la configuración elegida. Esto facilita auditorías y revisiones de seguridad.
3. Si el bot se ejecuta en modo *privileged* (por ejemplo, leyendo contenido de
   mensajes), valida que la organización tenga habilitados los permisos en el
   [Portal de Desarrolladores de Discord](https://discord.com/developers/applications).
4. Los despliegues con requisitos regionales o legales distintos pueden dividir
   la matriz de intents en entornos separados (`production`, `staging`, etc.)
   creando variantes del archivo de configuración y seleccionándolas mediante
   variables de entorno o *feature flags*.

> ℹ️ **Recomendación**: mantén las pruebas unitarias actualizadas cuando ajustes
> la matriz de intents. Esto permite detectar rápidamente si un evento deja de
> recibir datos tras modificar los permisos del `Client`.
