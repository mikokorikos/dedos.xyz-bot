# Despliegue

## Requisitos
- Node.js 20
- Base de datos MySQL 8
- Opcional: Redis para colas futuras

## Pasos
1. Configura variables de entorno (`.env`).
2. Ejecuta migraciones:
   ```bash
   npm run db:migrate:prod
   ```
3. Construye el proyecto:
   ```bash
   npm run build
   ```
4. Lanza el bot:
   ```bash
   node dist/index.js
   ```

### Despliegue con Docker
```bash
docker build -t dedos-shop-bot .
docker run --env-file .env dedos-shop-bot
```

### CI/CD
- `ci.yml` ejecuta lint, test y build en cada PR.
- `deploy.yml` permite despliegue manual (`workflow_dispatch`) seleccionando `staging` o `production`.

Asegúrate de ejecutar `scripts/backup-db.ts` antes de migraciones críticas y `scripts/validate-migration.ts` después de migrar datos.
