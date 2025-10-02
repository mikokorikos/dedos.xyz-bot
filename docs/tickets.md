# Tickets generales

El sistema de tickets generales complementa el flujo de middleman permitiendo a los usuarios abrir canales privados para compras, ventas y solicitudes específicas. Este documento resume las reglas de creación, los límites y el proceso recomendado para desplegar los cambios.

## Tipos disponibles

| Tipo (`TicketType`) | Descripción breve | Límite de tickets abiertos | Cooldown aproximado |
| --- | --- | --- | --- |
| `BUY` | Solicitudes de compra de ítems o servicios. | 3 tickets simultáneos | 30 minutos entre aperturas |
| `SELL` | Publicaciones de venta y ofertas directas. | 3 tickets simultáneos | 30 minutos entre aperturas |
| `ROBUX` | Intercambios o compra/venta de Robux. | 1 ticket simultáneo | 120 minutos entre aperturas |
| `NITRO` | Gestión de regalos o compras de Nitro. | 1 ticket simultáneo | 120 minutos entre aperturas |
| `DECOR` | Canales de diseño, decoración o gráficos. | 2 tickets simultáneos | 60 minutos entre aperturas |

> ℹ️ Los límites se validan antes de crear el canal. Si se supera el límite o el usuario se encuentra en cooldown, el bot responde con un error explícito (`TooManyOpenTicketsError` o `TicketCooldownError`).

## Flujo resumido

1. El usuario ejecuta `/ticket open` indicando el tipo y el contexto.
2. `OpenGeneralTicketUseCase` verifica políticas (límite y cooldown) mediante `PrismaTicketPolicyRepository`.
3. Si pasa la validación, se crea un canal privado y se registra al propietario (y partner opcional) en `PrismaTicketParticipantRepository`.
4. El bot envía un embed inicial en el canal con el resumen de la solicitud.
5. El subcomando `/ticket close` o el selector rápido marcan el ticket como cerrado a través de `CloseGeneralTicketUseCase`.
6. `/ticket list` consulta los tickets abiertos y recientes para el usuario, facilitando auditorías rápidas.

Los selectores rápidos (`buildTicketQuickOpenRow`) permiten crear tickets preconfigurados sin escribir el comando completo. Cada opción invoca el caso de uso de apertura con un contexto genérico que luego puede ampliarse en el canal.

## Despliegue

1. Ejecutar las pruebas locales:
   ```bash
   npm run lint
   npm run test
   ```
2. Generar el cliente de Prisma por si se actualizó el schema:
   ```bash
   npm run db:generate
   ```
3. Construir el proyecto y actualizar los artefactos de distribución:
   ```bash
   npm run build
   ```
4. Desplegar el bot (ej. a Docker/PM2) y verificar logs de creación/cierre de tickets.
5. Registrar los comandos con el nuevo subcomando `/ticket`:
   ```bash
   npm run deploy:commands
   ```

Mantén el archivo `.env` actualizado con el `DISCORD_GUILD_ID` si necesitas desplegar los comandos solo en un servidor durante QA.
