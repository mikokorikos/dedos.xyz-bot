## 📊 REPORTE DE ANÁLISIS DEL BOT ACTUAL

### 1. Estructura del proyecto
- `index.js`: punto de entrada, instancia el cliente de Discord, carga configuración y registra listeners centrales del bot.【F:index.js†L1-L45】
- `config/`: validación de variables de entorno (`config.js`), constantes de dominio y configuración runtime persistida en disco (`runtimeConfig.js`).【F:config/config.js†L1-L73】【F:config/runtimeConfig.js†L1-L88】
- `events/`: manejadores por evento (`interactionCreate`, `messageCreate`, `guildMemberAdd`, `ready`, `messageReactionAdd`). Centralizan la delegación de comandos y la inicialización de migraciones de base de datos.【F:events/interactionCreate.js†L1-L36】【F:events/ready.js†L1-L14】
- `features/`: cada subcarpeta agrupa comandos/flujo de UI por dominio (admin, config, help, middleman, memberStats, tickets, warns). Cada feature expone comandos slash/prefijo y hooks para interacciones personalizadas.【F:features/index.js†L1-L52】
- `services/`: capa de acceso a datos y utilidades de infraestructura (pool MySQL, migraciones, repositorios de entidades, generación de tarjetas visuales).【F:services/db.js†L1-L32】【F:services/migrations.js†L1-L186】
- `utils/`: helpers compartidos (branding, permisos, guardias, cooldowns, colas, logging, Roblox API, normalización de snowflakes).【F:utils/guard.js†L1-L102】【F:utils/logger.js†L1-L40】
- `scripts/`: herramientas de administración de comandos (`register-commands.js`, `clear-commands.js`).【F:scripts/register-commands.js†L1-L137】
- `sql/schema.sql`: definición manual del esquema relacional (tablas, índices, claves foráneas).【F:sql/schema.sql†L1-L120】

### 2. Inventario de funcionalidades
| Feature | Estado | Descripción | Problemas detectados |
|---------|--------|-------------|---------------------|
| Sistema de middleman | ⚠️ Parcial | Modal para abrir canal dedicado, panel dinámico, reclamación por middleman, cierres, reseñas y estadísticas. | El modal acepta contextos >1024 caracteres, lo que rompe el embed de creación de canal; falta rollback de registros `tickets`/participantes si la inserción falla tras crear el canal; fallback de reseñas usa un ID duro (`1420201085393571962`) que falla fuera del guild original; cachés locales (`tradePanelMessages`, `finalizationMessages`) sin invalidación pueden crecer indefinidamente.【F:features/middleman/ui.js†L33-L70】【F:features/middleman/logic.js†L980-L1056】【F:features/middleman/logic.js†L1514-L1560】|
| Sistema de tickets generales | ⚠️ Parcial | Select menu para crear canales por tipo con límites por usuario/cooldown y registro en DB. | Si la escritura en `tickets`/participantes falla tras crear el canal no se hace rollback, generando canales huérfanos; no se controla el tamaño del embed ni se normaliza el nombre ante inputs extremos.【F:features/tickets/logic.js†L41-L86】|
| Gestión de warns | ✅ Funciona | Comandos para aplicar/remover/listar warns con escalado automático y DMs rate-limited. | La cola de DMs ignora el retorno de `push`, por lo que puede perder mensajes con colas llenas, aunque es un caso límite.【F:features/warns/logic.js†L1-L77】【F:utils/queue.js†L1-L35】|
| Consola DB (`/db`) | ⚠️ Parcial | Listado, búsqueda y borrado en entidades clave (`users`, `middlemen`, `warns`, `tickets`). | Búsquedas realizan `LIKE` sobre columnas numéricas sin índices dedicados → full scans en tablas grandes; `delete` carece de confirmación/auditoría y puede borrar registros críticos accidentalmente.【F:services/admin.repo.js†L1-L88】|
| Configuración runtime | ✅ Funciona | `/config get/set` persiste el canal de reseñas en `config/runtime.json`. | Valor por defecto apunta a un canal inexistente fuera del servidor original, causando logs de error hasta que se configura manualmente.【F:config/runtimeConfig.js†L6-L71】|
| Estadísticas de miembros | ⚠️ Parcial | `/stats` genera embed/tarjeta con trades completados y últimos datos. | `incrementMemberTrade` recibe datos de Roblox/partner pero no los persiste, dejando información incompleta para visualización futura; falta control de errores si `generateMemberCard` falla repetidamente (posible saturación de logs).【F:services/memberStats.repo.js†L1-L35】【F:features/memberStats/logic.js†L1-L54】|
| Ayuda (`/help`) | ✅ Funciona | Lista comandos disponibles (slash/prefijo) con branding corporativo. | — |
| DM de bienvenida | ⚠️ Parcial | Envía mensaje branded al entrar un miembro usando cola rate-limited. | Si la cola llega al límite, `push` devuelve `false` y el mensaje se pierde silenciosamente; no existe mecanismo de reintento/observabilidad específica.【F:events/guildMemberAdd.js†L1-L24】【F:utils/queue.js†L17-L31】|
| Logs/Reacciones | ✅ Funciona | Logging estructurado y traza simple de reacciones para debug. | — |

### 3. Análisis de base de datos
**Schema actual:**
- Tablas principales: `users`, `warns`, `tickets`, `ticket_participants`, `middlemen`, `mm_trades`, `mm_trade_items`, `mm_claims`, `mm_reviews`, `mm_trade_finalizations`, `member_trade_stats`, catálogos (`warn_severities`, `ticket_types`, `ticket_statuses`).【F:sql/schema.sql†L13-L119】
- Relaciones: claves foráneas de `warns`, `tickets`, `middlemen`, `mm_*`, `member_trade_stats` hacia `users`; `mm_claims` y `mm_reviews` hacia `middlemen`; catálogos enlazados por IDs numéricos.【F:sql/schema.sql†L47-L118】
- Índices declarados: compuestos en `warns (user_id, created_at)`, `tickets (owner_id,status_id)`, `mm_claims (middleman_id, claimed_at)`, `mm_reviews (middleman_id, created_at)`, `mm_trades` solo por `ticket_id`, etc.【F:sql/schema.sql†L49-L116】

**Problemas detectados:**
- [ ] `mm_trades` carece de índice sobre `user_id`, pero se consulta frecuentemente por usuario (ej. `getMemberStats`), generando scans completos en trades históricos.【F:services/mm.repo.js†L52-L82】【F:sql/schema.sql†L84-L103】
- [ ] `member_trade_stats` únicamente almacena contador y timestamp; los parámetros de partner/Roblox no se guardan, desperdiciando datos recolectados en la capa de aplicación.【F:services/memberStats.repo.js†L1-L35】
- [ ] Migraciones/manual schema duplican lógica y pueden divergir; no hay versionado estructurado ni trazabilidad de cambios.【F:services/migrations.js†L1-L216】
- [ ] Defaults rígidos (ej. `reviewsChannel`) insertan IDs inválidos en nuevos despliegues, produciendo errores hasta que se corrigen manualmente.【F:config/runtimeConfig.js†L6-L35】

**Propuesta de mejora:**
- Añadir índices en `mm_trades(user_id)` y `member_trade_stats(updated_at)` para consultas frecuentes; almacenar estadísticas agregadas (último partner, roblox IDs) directamente en `member_trade_stats` evitando joins costosos.
- Sustituir migraciones manuales por herramienta declarativa (Prisma Migrate/Knex) con historial versionado.
- Eliminar IDs hard-coded en defaults y mover la configuración inicial a seeds parametrizables.

### 4. Deuda técnica crítica
1. **Dependencia de IDs hard-coded para reseñas**: el fallback `REVIEWS_CHANNEL_FALLBACK` y el default de `runtime.json` apuntan a un canal específico; en entornos nuevos la publicación de reseñas falla constantemente y genera ruido en logs.【F:features/middleman/logic.js†L60-L68】【F:config/runtimeConfig.js†L6-L35】
2. **Canales middleman/ticket sin rollback transaccional**: si `createTicket`/`registerParticipant` falla tras crear el canal, se elimina el canal pero quedan registros huérfanos en la BD, dañando métricas y límites de tickets.【F:features/middleman/logic.js†L980-L1056】【F:features/tickets/logic.js†L61-L82】
3. **Modal de middleman sin límites de longitud**: el campo `context` puede superar los 1024 caracteres permitidos por Discord en embeds y abortar la creación del canal con error genérico para el usuario.【F:features/middleman/ui.js†L52-L70】
4. **Operaciones críticas sin transacciones ni aislamiento**: el cierre de trades actualiza múltiples tablas (`mm_claims`, `tickets`, `mm_trade_finalizations`, `member_trade_stats`) sin transacción; fallos parciales dejan estados inconsistentes (ej. ticket cerrado sin registrar stats).【F:features/middleman/logic.js†L1238-L1339】
5. **Caches en memoria sin ciclo de vida**: Mapas `tradePanelMessages` y `finalizationMessages` crecen indefinidamente; en bots de larga vida provoca leaks y divergencias si mensajes se borran manualmente.【F:features/middleman/logic.js†L62-L77】【F:features/middleman/logic.js†L500-L538】

### 5. Oportunidades de mejora
- Migrar a TypeScript y una arquitectura con capas claras (domain/application/infrastructure) para reducir acoplamiento entre Discord y SQL.
- Adoptar un ORM moderno (Prisma/Drizzle) con modelos tipados y migraciones versionadas, eliminando SQL embebido y normalizando acceso concurrente.
- Centralizar validaciones con esquemas (Zod) para entradas de interacciones, modales y comandos, evitando errores de longitud/formatos.
- Integrar un logger estructurado (Pino) con transporte a observabilidad/Sentry y métricas (OpenTelemetry) para diagnosticar flujos complejos.
- Añadir estrategia de caché/cola (Redis + BullMQ) para DMs, verificación Roblox y registro de reseñas, garantizando reintentos y resiliencia.
- Diseñar pruebas unitarias/integración (Vitest/Jest) para lógica de negocio (cooldowns, cálculos de sanciones, cierre de trades) antes de migrar.

### 6. Decisiones arquitectónicas a tomar
- Definir ORM (Prisma vs Drizzle vs TypeORM) y estrategia de migraciones automatizadas.
- Escoger framework base (NestJS vs modular custom) considerando complejidad del dominio middleman.
- Elegir librería de validación para comandos/modales (Zod, io-ts, ArkType) y estrategia de DTOs.
- Establecer estrategia de logging/monitoring (Pino + OpenTelemetry + Sentry) y cómo correlacionar flujos multi-tabla.
- Decidir sobre almacenamiento de caché/colas (Redis) y patrón de publicación (event-driven vs jobs programados) para reseñas y DMs.
- Planificar sharding/escalabilidad (shards nativos de discord.js o gateway managers) frente al crecimiento del servidor.

### 7. Información faltante o pendiente de confirmar
- **Infraestructura actual**: no se dispone de detalles sobre el proveedor de hosting actual del bot (VPS, contenedor, serverless) ni sobre los pipelines CI/CD en producción; se asume despliegue manual basado en la presencia de `docker-compose` y scripts aislados.【F:docker-compose.yml†L1-L44】【F:scripts/register-commands.js†L1-L137】
- **Versionado de dependencias**: aunque existe `package-lock.json`, no hay evidencia del proceso exacto de build/test vigente (falta `CI` o scripts documentados) y se desconoce la versión de Node objetivo en producción. Necesario validar versiones mínimas soportadas antes de migrar.
- **Integraciones externas**: existen utilidades para Roblox (`utils/roblox.js`) y colas de DMs, pero no se cuenta con credenciales ni políticas actuales de rate limiting; se deberá coordinar con el equipo para obtenerlas o definir nuevas claves de entorno.【F:utils/roblox.js†L1-L162】【F:utils/queue.js†L1-L35】
- **Políticas de moderación**: el sistema de warns aplica escalado automático, pero no hay documentación oficial sobre umbrales, notificaciones y procesos fuera de Discord; se requiere definirlas para replicar comportamientos en la versión refactorizada.【F:features/warns/logic.js†L1-L77】
