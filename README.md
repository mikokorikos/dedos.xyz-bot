# Dedos Shop Bot v2

Reescritura completa del bot de Dedos Shop en TypeScript con arquitectura limpia, Prisma y tooling moderno.

## 🚀 Características
- Cliente de Discord.js v14 con manejo centralizado de errores.
- Validación estricta de variables de entorno con Zod.
- Logger estructurado (Pino) y cola de DMs con backoff básico.
- Prisma ORM con modelos para tickets, middleman, warns y estadísticas.
- Sistema de comandos slash modular (tickets, middleman, warns, stats, admin).
- Scripts utilitarios para migraciones (`migrate-from-old-db`, `validate-migration`, `backup-db`).

## 📦 Requisitos
- Node.js 20 LTS
- npm 9+ o pnpm/yarn equivalente

- MySQL 8 (puede ser instalado manualmente o levantarlo con Docker Compose)


## 🔧 Instalación
```bash
npm install
npm run db:generate
```

Para desarrollo local puedes apoyarte en Docker Compose para la base de datos y Redis:

```bash
npm run docker:up
```
Si prefieres instalar MySQL y Redis de forma nativa, asegúrate de que las instancias
estén accesibles usando las credenciales definidas en `DATABASE_URL` y `REDIS_URL`.

## ⚙️ Configuración
Copia `.env.example` a `.env` y ajusta:
- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`
- `DATABASE_URL` y opcionalmente `REDIS_URL`
- `OLD_DATABASE_URL` si migras desde la versión previa

Variables runtime adicionales se gestionan con `/config` y persisten en `config/runtime.json`.

## 🛠️ Scripts útiles
| Script | Descripción |
| ------ | ----------- |
| `npm run dev` | Ejecuta el bot con recarga automática (`tsx watch`). |
| `npm run build` | Compila a JavaScript en `dist/` y reescribe alias. |
| `npm run lint` / `npm run test` | Linting y tests con Vitest. |
| `npm run deploy:commands` | Registra comandos slash en Discord. |
| `node scripts/migrate-from-old-db.ts` | Migra datos básicos desde la base legacy. |
| `node scripts/validate-migration.ts` | Valida conteos entre bases old/new. |
| `node scripts/backup-db.ts` | Genera un `mysqldump` sencillo. |

## 🧱 Arquitectura
Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para una descripción completa. Resumen:
```
src/
├── presentation/       # Adaptadores de Discord (comandos, eventos, UI)
├── application/        # Casos de uso y DTOs
├── domain/             # Entidades, value objects e interfaces de repositorio
├── infrastructure/     # Prisma, servicios externos y scripts de soporte
└── shared/             # Config, logger, errores y utilidades
```

## 🧪 Desarrollo diario

1. (Opcional) `npm run docker:up` para servicios locales.

2. `npm run dev`
3. `npm run deploy:commands`
4. Ejecuta `npm run lint` y `npm run test` antes de cada commit.


## 🖥️ Despliegue sin Docker

Puedes ejecutar el bot directamente en un servidor sin contenedores siempre que
dispongas de Node.js 20 y MySQL 8 (además de Redis si habilitas la cola de DMs):

1. Crear un usuario de sistema dedicado, clonar el repositorio y copiar `.env`.
2. Configurar `DATABASE_URL`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` y demás variables.
3. Instalar dependencias y compilar:
   ```bash
   npm ci
   npm run db:migrate:prod
   npm run build
   ```
4. Ejecutar `npm run start` o definir una unidad `systemd` que invoque
   `node dist/index.js`.
5. Mantener MySQL/Redis como servicios administrados por el sistema y automatizar
   `npm run deploy:commands` cuando cambien los slash commands.

Consulta [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para pasos detallados y un ejemplo
de unidad `systemd`.


## 📚 Documentación
- [docs/COMMANDS.md](docs/COMMANDS.md): comandos disponibles y ejemplos.
- [docs/DATABASE.md](docs/DATABASE.md): resumen del esquema Prisma.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): guía de despliegue.
- [docs/MIGRATION.md](docs/MIGRATION.md): checklist para migrar v1 → v2.

## 🧹 Mantenimiento
- Ejecuta `npm run docker:down` para detener servicios locales.
- Usa `npm run clear:commands` si necesitas resetear slash commands durante QA.

## 📄 Licencia
Proyecto interno de Dedos Shop. Uso restringido.
