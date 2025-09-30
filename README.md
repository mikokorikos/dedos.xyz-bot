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
- MySQL 8 (local vía Docker Compose opcional)

## 🔧 Instalación
```bash
npm install
npm run db:generate
```

Para levantar servicios auxiliares:
```bash
npm run docker:up
```

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
1. `npm run docker:up`
2. `npm run dev`
3. `npm run deploy:commands`
4. Ejecuta `npm run lint` y `npm run test` antes de cada commit.

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
