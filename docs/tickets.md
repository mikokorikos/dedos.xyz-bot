# Matriz de tickets generales

El bot gestiona los tickets generales mediante la tabla `ticket_type_policies`, que define límites por usuario y ventanas de cooldown.
Cada registro se enlaza con el catálogo `ticket_types` y controla el flujo de los casos de uso `OpenGeneralTicketUseCase`, `CloseGeneralTicketUseCase`
y `ListUserTicketsUseCase`.

| Tipo | Uso habitual | Máx. tickets simultáneos | Cooldown | ¿Requiere staff? | Notas |
| ---- | ------------ | ------------------------ | -------- | ---------------- | ----- |
| `BUY` | Solicitudes de compra de ítems/servicios. | 2 | 60 minutos | No | Recomendado pedir contexto detallado para evitar estafas. |
| `SELL` | Ofertas de venta dentro del servidor. | 2 | 60 minutos | No | Se sugiere habilitar middleman cuando sea posible. |
| `ROBUX` | Compras/ventas de Robux. | 1 | 120 minutos | Sí (revisión) | Sólo personal verificado puede aprobar y cerrar si no participa. |
| `NITRO` | Gestión de regalos o compras de Nitro. | 1 | 120 minutos | No | Validar capturas de pago antes de cerrar. |
| `DECOR` | Encargos de builds/decoraciones. | 1 | 180 minutos | No | Priorizar canales de seguimiento para entregas largas. |

> **Nota:** Las ventanas de cooldown se expresan en segundos en la base de datos (3600 = 1 hora). Los valores anteriores corresponden a las
> inserciones declaradas en [`sql/schema.sql`](../sql/schema.sql), pero pueden ajustarse a la operativa del servidor.

## Configuración de políticas

1. Asegúrate de que las tablas `ticket_types`, `ticket_type_policies` y `ticket_type_cooldowns` existan en tu instancia MySQL (se crean
   automáticamente al ejecutar el `schema.sql`).
2. Actualiza los límites ejecutando el siguiente comando en MySQL:

```sql
INSERT INTO ticket_type_policies (type_id, max_open_per_user, cooldown_seconds, staff_role_id, requires_staff_approval)
VALUES (3, 1, 5400, NULL, 1)
ON DUPLICATE KEY UPDATE
  max_open_per_user = VALUES(max_open_per_user),
  cooldown_seconds = VALUES(cooldown_seconds),
  staff_role_id = VALUES(staff_role_id),
  requires_staff_approval = VALUES(requires_staff_approval);
```

3. Si deseas restringir la visibilidad a un rol de Discord específico, rellena la columna `staff_role_id` con el snowflake del rol.
4. El caso de uso de apertura validará que el usuario no tenga más tickets abiertos del tipo seleccionado y que haya expirado el cooldown.

## Mapeo de permisos

- **Staff estándar (`requires_staff_approval = 0`)**: cualquier usuario puede abrir tickets y el personal moderador puede cerrarlos si participa.
- **Staff con revisión (`requires_staff_approval = 1`)**: al cerrar desde el comando `/ticket close` es necesario contar con permisos de
  `ManageGuild` o `ModerateMembers` y activar la bandera `staff_override`.
- **Participantes adicionales**: el comando añade automáticamente al propietario y a la contraparte indicada en el formulario. Otros usuarios
  deben añadirse manualmente desde Discord antes de ejecutar el cierre.

Mantén este documento sincronizado cuando ajustes las políticas para que el equipo de moderación conozca los límites vigentes.
