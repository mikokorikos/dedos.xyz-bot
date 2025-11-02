# Documentación Técnica de dedos.xyz Bot

## 🟣 Introducción
El bot **dedos.xyz** automatiza la venta de Robux, la gestión de tickets de soporte y las comunicaciones automáticas en Discord. Combina comandos con prefijo `;`, comandos *slash* y componentes interactivos (botones y modales) para abrir canales privados, validar cupones, actualizar estados de compra y enviar comprobantes o transcripciones por DM.【F:index.js†L1-L186】【F:interactions/handleButtons.js†L1-L200】【F:interactions/handleModals.js†L1-L50】【F:services/ticketService.js†L194-L836】

## 🗂️ Estructura del proyecto
| Carpeta / Archivo | Propósito |
| --- | --- |
| `index.js` | Punto de entrada: inicializa intents, conecta a la base de datos, arranca el servicio FX y enruta eventos de mensajes, interacciones, reacciones y nuevos miembros.【F:index.js†L1-L186】 |
| `commands/` | Define comandos con prefijo (`prefix.js`) y maneja slash (`slash.js`, `registerData.js`).【F:commands/prefix.js†L1-L227】【F:commands/slash.js†L1-L317】【F:commands/registerData.js†L1-L167】 |
| `services/` | Capa de dominio: base de datos, tickets, compras, cupones, paneles, permisos y pricing.【F:services/db.js†L1-L145】【F:services/ticketService.js†L194-L836】【F:services/couponService.js†L158-L437】【F:services/pricingService.js†L1-L42】【F:services/panelService.js†L1-L60】【F:services/permissions.js†L1-L17】 |
| `embeds/embeds.js` | Catálogo central de embeds reutilizables con la animación `dedosgift.gif` integrada.【F:embeds/embeds.js†L45-L762】 |
| `interactions/` | Handlers de botones y modales que conectan la UI con `ticketService`.【F:interactions/handleButtons.js†L1-L200】【F:interactions/handleModals.js†L1-L50】 |
| `utils/sendEmbed.js` | Helper global que envía embeds adjuntando automáticamente el GIF y soporta `send`, `reply`, `edit` y `followUp`.【F:utils/sendEmbed.js†L1-L51】 |
| `constants/` | Configuración (`config.js`) y branding (`ui.js`).【F:constants/config.js†L1-L48】【F:constants/ui.js†L1-L24】 |
| `services/db.js` + `sql/` | Migraciones automáticas para tablas `tickets`, `purchases`, `coupons` y `coupon_usage`.【F:services/db.js†L24-L134】 |
| `src/` | Refactor en TypeScript con arquitectura hexagonal (comandos slash extendidos y casos de uso). Aunque convive con la versión JS, hoy el bot productivo utiliza la ruta `index.js`. Documentar ambos facilita una futura migración.【F:src/index.ts†L1-L78】【F:src/presentation/README.md†L1-L4】 |

## 🧩 Comandos prefix (`;`)
| Comando | Descripción | Archivo | Servicios / Embeds | Permisos | Ejemplo |
| --- | --- | --- | --- | --- | --- |
| `;robux` | Publica el panel oficial de compra en el canal configurado. Niega acceso a no-staff y valida el canal correcto.【F:commands/prefix.js†L30-L49】 | `commands/prefix.js` | `panelService.publishRobuxPanel` (envía `buildRobuxPanelEmbed`).【F:services/panelService.js†L12-L35】 | Rol de staff (`isStaff`).【F:commands/prefix.js†L31-L44】 | `;robux` en `#robux-panel` |
| `;ayuda` | Publica el panel de ayuda con botones para abrir tickets de soporte.【F:commands/prefix.js†L51-L69】 | `commands/prefix.js` | `panelService.publishAyudaPanel` (`buildHelpPanelEmbed`).【F:services/panelService.js†L37-L59】 | Staff requerido.【F:commands/prefix.js†L52-L66】 | `;ayuda` en `#ayuda-panel` |
| `;precio <robux>` | Cotiza MXN y USD para una cantidad de Robux.【F:commands/prefix.js†L72-L93】 | `commands/prefix.js` | `pricingService.getPriceForRobux`, `buildPriceQuoteEmbed`.【F:services/pricingService.js†L1-L42】【F:embeds/embeds.js†L624-L657】 | Público. | `;precio 1000` |
| `;cuanto_mxn <mxn>` | Calcula Robux posibles desde MXN dados.【F:commands/prefix.js†L95-L116】 | `commands/prefix.js` | `pricingService.getRobuxFromMxn`, `buildPriceQuoteEmbed`.【F:services/pricingService.js†L18-L23】【F:embeds/embeds.js†L624-L657】 | Público. | `;cuanto_mxn 220` |
| `;cuanto_usd <usd>` | Conversión USD → Robux y MXN.【F:commands/prefix.js†L118-L139】 | `commands/prefix.js` | `pricingService.getRobuxFromUsd`, `buildPriceQuoteEmbed`.【F:services/pricingService.js†L25-L34】【F:embeds/embeds.js†L624-L657】 | Público. | `;cuanto_usd 10` |
| `;cupones-activos` | Lista cupones vigentes (DM preferido, fallback al canal).【F:commands/prefix.js†L141-L166】 | `commands/prefix.js` | `couponService.listActiveCoupons`, `buildCouponsListEmbed`.【F:services/couponService.js†L82-L101】【F:embeds/embeds.js†L663-L725】 | Owner o staff.【F:commands/prefix.js†L141-L146】 | `;cupones-activos` |
| `;desactivar-descuento <CÓDIGO>` | Desactiva un cupón en base de datos.【F:commands/prefix.js†L168-L190】 | `commands/prefix.js` | `couponService.deactivateCoupon`.【F:services/couponService.js†L425-L436】 | Solo owner.【F:commands/prefix.js†L168-L188】 | `;desactivar-descuento DEDOS15` |
| `;transcripcion <ID>` | Envía la transcripción HTML del ticket a quien lo pide.【F:commands/prefix.js†L192-L214】 | `commands/prefix.js` | `ticketService.sendTranscriptById` + embed de cierre.【F:services/ticketService.js†L843-L898】 | Solo staff.【F:commands/prefix.js†L193-L197】 | `;transcripcion 042` |
| `;reglas` | Envía el embed de reglas y reacciona con ✅ para verificación.【F:commands/prefix.js†L217-L223】 | `commands/prefix.js` | `buildRulesEmbed`.【F:embeds/embeds.js†L762-L780】 | Público. | `;reglas` |

## 🛠️ Slash commands existentes
| Comando | Descripción | Archivo | Servicios / Embeds | Permisos |
| --- | --- | --- | --- | --- |
| `/robux` | Replica el comando de panel de compra con respuesta efímera.【F:commands/slash.js†L53-L72】【F:commands/registerData.js†L6-L26】 | `commands/slash.js` | `publishRobuxPanel`.【F:services/panelService.js†L12-L35】 | Staff (`isStaff`). |
| `/ayuda` | Publica panel de soporte.【F:commands/slash.js†L74-L93】【F:commands/registerData.js†L28-L38】 | `commands/slash.js` | `publishAyudaPanel`.【F:services/panelService.js†L37-L59】 | Staff. |
| `/precio` | Cotiza Robux a MXN/USD con reply efímero.【F:commands/slash.js†L95-L113】【F:commands/registerData.js†L18-L26】 | `commands/slash.js` | `getPriceForRobux`, `buildPriceQuoteEmbed`.【F:services/pricingService.js†L9-L13】【F:embeds/embeds.js†L624-L657】 | Público. |
| `/cuanto_mxn` | MXN → Robux.【F:commands/slash.js†L115-L133】【F:commands/registerData.js†L28-L38】 | `commands/slash.js` | `getRobuxFromMxn`, `buildPriceQuoteEmbed`.【F:services/pricingService.js†L18-L23】【F:embeds/embeds.js†L624-L657】 | Público. |
| `/cuanto_usd` | USD → Robux.【F:commands/slash.js†L135-L153】【F:commands/registerData.js†L40-L50】 | `commands/slash.js` | `getRobuxFromUsd`, `buildPriceQuoteEmbed`.【F:services/pricingService.js†L25-L34】【F:embeds/embeds.js†L624-L657】 | Público. |
| `/crear-descuento` | Alta de cupones con validaciones avanzadas de parámetros.【F:commands/slash.js†L155-L232】【F:commands/registerData.js†L52-L140】 | `commands/slash.js` | `couponService.createCoupon`.【F:services/couponService.js†L28-L61】 | Solo owner (`isOwner`). |
| `/desactivar-descuento` | Baja lógica del cupón.【F:commands/slash.js†L234-L257】【F:commands/registerData.js†L142-L150】 | `commands/slash.js` | `couponService.deactivateCoupon`.【F:services/couponService.js†L425-L436】 | Owner. |
| `/cupones-activos` | Reporte efímero de cupones.【F:commands/slash.js†L260-L281】【F:commands/registerData.js†L152-L154】 | `commands/slash.js` | `listActiveCoupons`, `buildCouponsListEmbed`.【F:services/couponService.js†L82-L101】【F:embeds/embeds.js†L663-L725】 | Owner o staff. |
| `/transcripcion` | Envía transcripción por DM al staff que lo solicita.【F:commands/slash.js†L283-L310】【F:commands/registerData.js†L156-L166】 | `commands/slash.js` | `sendTranscriptById`.【F:services/ticketService.js†L843-L898】 | Staff. |
| `/help` (TypeScript) | Listado dinámico de comandos en la arquitectura nueva.【F:src/presentation/commands/general/help.ts†L1-L55】 | `src/presentation/commands/general/help.ts` | Usa `embedFactory` y el registro de comandos TS. | Público (en la rama TS). |
| `/ping` (TypeScript) | Diagnóstico de latencia en la capa nueva.【F:src/presentation/commands/general/ping.ts†L1-L36】 | `src/presentation/commands/general/ping.ts` | Embeds TS + logger. | Público (TS). |
| `/middleman ...` (TypeScript) | Conjunto de subcomandos para el sistema de intermediación con casos de uso dedicados.【F:src/presentation/commands/middleman/middleman.ts†L1-L200】 | `src/presentation/commands/middleman/middleman.ts` | Usa casos de uso y repositorios Prisma. | Personal autorizado (validaciones internas). |

> ⚠️ **Regla:** No convertir ni eliminar los slash existentes; cualquier nuevo flujo deberá exponerse como comando con prefijo `;`.

## 🧠 Servicios principales
- **Base de datos (`services/db.js`)**: Conecta a MySQL, crea/migra tablas `tickets`, `purchases`, `coupons` y `coupon_usage`, y asegura el directorio de transcripciones.【F:services/db.js†L15-L139】  
- **Pricing (`services/pricingService.js`)**: Calcula precios Robux↔MXN↔USD y formatea montos usando la tasa FX en memoria.【F:services/pricingService.js†L1-L42】  
- **FX (`services/fxRateService.js`)**: Descarga periódicamente la tasa MXN→USD y expone `getUsdRate()`; usa `setInterval` con la frecuencia de configuración.【F:services/fxRateService.js†L1-L39】  
- **Paneles (`services/panelService.js`)**: Construye los botones y usa `sendEmbed` para publicar los paneles fijo de compra y ayuda.【F:services/panelService.js†L12-L59】  
- **Permisos (`services/permissions.js`)**: Determina owner y staff en base a IDs configurados.【F:services/permissions.js†L5-L16】  
- **Cupones (`services/couponService.js`)**: Alta, listado, baja, validación con restricciones (rol, usuarios, primera compra, límites por usuario, piso mínimo) y registro de uso.【F:services/couponService.js†L28-L437】  
- **Compras (`services/purchaseService.js`)**: Inserta compras, actualiza estados y recupera el primer ticket para validaciones antifraude.【F:services/purchaseService.js†L1-L59】  
- **Tickets (`services/ticketService.js`)**: Maneja confirmaciones previas, creación de canales, logs, actualizaciones de estado, DM de recibos, cierre con transcript y envío de archivos a petición.【F:services/ticketService.js†L194-L898】

## 🎨 Embeds disponibles
Cada función retorna `{ embed }` con la imagen `attachment://dedosgift.gif` incluida; `sendEmbed` adjunta el archivo al mensaje.【F:embeds/embeds.js†L45-L762】【F:utils/sendEmbed.js†L22-L44】

| Embed | Uso principal |
| --- | --- |
| `buildRobuxPanelEmbed` | Panel público de Robux; usado por `publishRobuxPanel` y los comandos `/robux` y `;robux`. Incluye oferta destacada y botones de compra.【F:embeds/embeds.js†L45-L80】【F:services/panelService.js†L12-L35】 |
| `buildHelpPanelEmbed` | Panel de ayuda para abrir tickets, invocado por `publishAyudaPanel`.【F:embeds/embeds.js†L83-L107】【F:services/panelService.js†L37-L59】 |
| `buildPurchaseTicketEmbed` | Estado principal dentro del canal de compra, mostrando precios, cupón y acciones para el staff.【F:embeds/embeds.js†L109-L177】【F:services/ticketService.js†L404-L421】 |
| `buildPurchaseConfirmationEmbed` + `buildPurchaseConfirmationComponents` | Vista previa/confirmación desde el modal de compra, con botón para abrir el ticket y variantes `preview`, `confirmed`, `expired` y `error`.【F:embeds/embeds.js†L178-L310】【F:services/ticketService.js†L194-L274】 |
| `buildHelpTicketEmbed` | Embed inicial en tickets de ayuda, con botón para cerrar.【F:embeds/embeds.js†L311-L333】【F:services/ticketService.js†L573-L590】 |
| `buildCouponPublicEmbedShort` | Anuncio en canal público cuando un cupón válido se usa con éxito.【F:embeds/embeds.js†L335-L375】【F:services/ticketService.js†L438-L461】 |
| `buildCouponLogEmbedFull` | Log detallado para staff tras aplicar un cupón.【F:embeds/embeds.js†L381-L429】【F:services/ticketService.js†L463-L479】 |
| `buildFraudAlertEmbed` | Alerta interna cuando se detecta abuso de “primera compra”.【F:embeds/embeds.js†L433-L459】【F:services/ticketService.js†L246-L257】 |
| `buildTicketClosedEmbed` | Resumen del cierre de ticket usado en canal, DM y en `/transcripcion`.【F:embeds/embeds.js†L463-L509】【F:services/ticketService.js†L791-L898】 |
| `buildWelcomeDMEmbed` | DM de bienvenida con promo actual y grupo de Roblox.【F:embeds/embeds.js†L510-L543】【F:index.js†L142-L173】 |
| `buildVerifiedDMEmbed` | DM enviado al verificar al usuario con la reacción ✅.【F:embeds/embeds.js†L544-L577】【F:index.js†L91-L137】 |
| `buildDeliveryReceiptEmbed` | Recibo enviado al marcar un ticket como entregado.【F:embeds/embeds.js†L578-L621】【F:services/ticketService.js†L682-L703】 |
| `buildPriceQuoteEmbed` | Embed reutilizado por comandos de cotización y confirmaciones de compra.【F:embeds/embeds.js†L624-L657】【F:commands/prefix.js†L72-L137】 |
| `buildCouponsListEmbed` | Resumen técnico de cupones activos.【F:embeds/embeds.js†L663-L725】【F:commands/prefix.js†L141-L166】 |
| `buildRulesEmbed` | Reglas y mensaje de verificación para el canal designado.【F:embeds/embeds.js†L762-L780】【F:commands/prefix.js†L217-L223】 |

## 🔁 Flujos del bot
### 1. Compra con cupón
1. El usuario abre el panel con `;robux` o el botón existente y completa el modal de compra (`handleButtonInteraction`).【F:interactions/handleButtons.js†L30-L65】  
2. El modal envía los datos a `previewPurchaseTicket`, que calcula precios, valida cupones y guarda una confirmación temporal con token.【F:interactions/handleModals.js†L14-L41】【F:services/ticketService.js†L194-L274】  
3. El usuario confirma mediante el botón generado; `openPurchaseTicket` crea canal, inserta ticket y compra, publica el embed con acciones de staff y registra usos del cupón (incluyendo logs público/staff).【F:interactions/handleButtons.js†L67-L188】【F:services/ticketService.js†L282-L491】  
4. El staff usa botones para actualizar el estado; al marcar `entregado`, se envía el recibo por DM al comprador.【F:interactions/handleButtons.js†L210-L239】【F:services/ticketService.js†L604-L709】

### 2. Creación y cierre de tickets
- Tickets de ayuda se abren desde el panel de soporte y publican `buildHelpTicketEmbed` con botones para cerrar.【F:services/ticketService.js†L494-L596】  
- Al cerrar, `closeTicketWithTranscript` genera HTML con `discord-html-transcripts`, guarda el archivo, envía embed y adjunto al usuario, responde al staff y programa la eliminación del canal.【F:services/ticketService.js†L720-L836】

### 3. Entrega y confirmación de Robux
- Las acciones del staff sobre el embed actualizan la fila en `purchases` y editan el mensaje original. Si el estado es `entregado`, se dispara `buildDeliveryReceiptEmbed` por DM.【F:services/ticketService.js†L604-L709】

### 4. Envío de DMs automáticos
- Al unirse un miembro, recibe rol temporal y el DM de bienvenida.【F:index.js†L142-L173】  
- Tras reaccionar con ✅ en el canal de verificación, se asigna el rol permanente, se remueve el temporal y se envía el DM de verificación.【F:index.js†L91-L137】

### 5. Panel público y panel de ayuda
- Ambos paneles se publican con botones interactivos y se aseguran de utilizar el canal correcto antes de enviar el embed.【F:services/panelService.js†L12-L59】【F:commands/prefix.js†L30-L69】

## 🔐 Variables de entorno
| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `TOKEN` | Sí | Token del bot para `client.login`.【F:constants/config.js†L5-L48】 |
| `CLIENT_ID` | Sí | ID de la aplicación para registrar comandos. |  |
| `OWNER_ID` | Sí | Discord ID del owner; habilita comandos administrativos. |  |
| `GUILD_ID` | Sí | Servidor objetivo para operaciones. |  |
| `TICKET_CATEGORY_ID` | Opcional | Categoría donde se crean canales de tickets. |  |
| `TICKET_STAFF_ROLE_IDS` | Sí (para permisos) | Lista separada por comas de roles staff. |  |
| `VERIFIED_ROLE_ID` | Sí | Rol asignado tras verificación por reacción. |  |
| `TEMP_ROLE_ID` | Opcional | Rol temporal asignado al entrar. |  |
| `VERIFICATION_CHANNEL_ID` | Sí | Canal que escucha reacciones ✅. |  |
| `TOS_CHANNEL_ID` | Sí | Canal referenciado en paneles y reglas. |  |
| `ROBLOX_PANEL_CHANNEL_ID` | Sí | Canal permitido para el panel de Robux. |  |
| `AYUDA_PANEL_CHANNEL_ID` | Sí | Canal permitido para panel de ayuda. |  |
| `PUBLIC_ANNOUNCE_CHANNEL_ID` | Opcional | Canal de anuncios públicos de cupones. |  |
| `LOG_CHANNEL_ID` | Opcional | Canal de logs internos de cupones y alertas. |  |
| `PRICE_PER_1000_MXN` | Sí | Precio base por 1000 Robux para cálculos. |  |
| `MIN_FINAL_PRICE_MXN` | Sí | Piso mínimo después de aplicar descuentos. |  |
| `CURRENCY_API_URL` | Opcional | Endpoint para tasa MXN→USD. |  |
| `USD_FETCH_INTERVAL_MINUTES` | Opcional | Frecuencia de actualización de tasa. |  |
| `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT` | Sí | Credenciales MySQL para tickets/compras/cupones. |  |
| `TRANSCRIPTS_DIR` | Opcional | Carpeta donde se guardan HTML de tickets. |  |

## 🚀 Mejoras propuestas (solo prefijo `;`)
1. **Historial de compras por usuario — `;historial`**  
   Mostraría los tickets y compras asociados al autor, reutilizando `purchases` y el formato de `buildTicketClosedEmbed`. Se puede consultar `purchases` por `buyer_discord_id` y formatear precios con `formatPrice`.【F:services/purchaseService.js†L1-L59】【F:services/ticketService.js†L463-L509】
2. **Cupones solo primera compra reforzados**  
   Añadir columna `first_purchase_only` en `coupons` y validar contra `getFirstPurchaseRecord`, extendiendo la lógica existente de `checkFirstPurchaseRestriction` para cubrir cupones multi-uso específicos.【F:services/couponService.js†L120-L275】【F:services/purchaseService.js†L52-L59】
3. **Panel administrativo — `;panel <sección>`**  
   Comando que renderice dashboards (`cupones`, `ventas`, `logs`) en un embed, combinando consultas a `coupons`, `purchases` y `tickets`. Podría reutilizar `buildCouponsListEmbed` y nuevas variantes para estadísticas.【F:services/couponService.js†L82-L437】【F:services/ticketService.js†L604-L709】
4. **Estadísticas de ventas — `;ventas`**  
   Mostrar totales vendidos, ingresos y top compradores agregando sobre `purchases`. Aprovechar `formatPrice` para presentar montos y enviar embed con emojis de ventas.【F:services/purchaseService.js†L1-L59】【F:services/pricingService.js†L37-L41】
5. **Sistema de niveles**  
   Mantener contadores (`purchases_count`, `total_spent`) y otorgar roles VIP en base a umbrales cuando se marque `entregado`, integrándose con `handlePurchaseStatusUpdate`.【F:services/ticketService.js†L604-L709】
6. **Exportar historial — `;exportar [json|csv]`**  
   Generar archivo temporal con tickets/compras y adjuntarlo usando `sendEmbed` con `files` adicionales, emulando el envío de transcripts.【F:services/ticketService.js†L801-L898】
7. **Alertas automáticas**  
   Agregar un scheduler que use `config.PUBLIC_ANNOUNCE_CHANNEL_ID` para recordar promociones, quizá apoyado en la tasa FX (`getUsdRate`) para mensajes dinámicos.【F:constants/config.js†L24-L38】【F:services/fxRateService.js†L16-L38】

## 🧾 Ejemplo de flujo completo
1. El staff publica el panel con `;robux` en el canal autorizado.【F:commands/prefix.js†L30-L49】  
2. Un usuario presiona **Comprar Robux**, completa el modal y recibe la confirmación con precios y estado del cupón.【F:interactions/handleButtons.js†L30-L117】【F:services/ticketService.js†L194-L274】  
3. Tras confirmar, se crea el canal privado `ticket-XYZ`, se notifica al staff y se registran logs (público + staff).【F:interactions/handleButtons.js†L119-L188】【F:services/ticketService.js†L282-L479】  
4. El staff cambia el estado a `pagado` y posteriormente a `entregado`, disparando el recibo por DM.【F:interactions/handleButtons.js†L210-L239】【F:services/ticketService.js†L604-L709】  
5. Finalmente, el staff cierra el ticket con motivo; el bot genera la transcripción y la envía al comprador y al staff que la solicitó.【F:services/ticketService.js†L720-L898】【F:commands/slash.js†L283-L310】

## 🧪 Optimizaciones y observaciones técnicas
- **Helper único de embeds**: `sendEmbed` centraliza el adjunto del GIF y reduce errores al enviar o editar mensajes en canales, DMs y respuestas efímeras.【F:utils/sendEmbed.js†L9-L50】
- **Validaciones antifraude**: `validateCoupon` ya detecta cuentas Roblox con compras previas; reforzar `first_purchase_only` formalizaría la regla de negocio.【F:services/couponService.js†L158-L352】
- **Migración progresiva a TypeScript**: existe una arquitectura paralela con Prisma y casos de uso (`src/`); documentar y mantener la paridad de comandos facilitará una transición futura sin duplicar lógica.【F:src/index.ts†L1-L78】【F:src/presentation/commands/middleman/middleman.ts†L1-L200】
- **Monitoreo de tasa FX**: se recomienda loggear fallos recurrentes en `refreshRate` para detectar problemas con el API externo, quizá con alertas en el canal de staff.【F:services/fxRateService.js†L16-L28】
- **Reutilización de embeds de cierre**: Tanto `closeTicketWithTranscript` como `sendTranscriptById` usan el mismo embed; añadir metadata (por ejemplo, transacción o feedback) permitiría ampliar reportes sin cambiar interfaces actuales.【F:services/ticketService.js†L720-L898】

