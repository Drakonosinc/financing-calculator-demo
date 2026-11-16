# PROJECT.md — Equipos Dosificadores · Demo

## Estado actual

- [x] Identidad genérica configurada como **Equipos Dosificadores · Demo** (`config.js`, `index.html`, documentación).
- [x] Configuración desacoplada en `config.js` (3 máquinas ficticias, tasas, cuotas/cheques, rango de anticipo, `whatsappNumber: ""` por defecto).
- [x] Motor financiero puro en `calc.js` (sin acceso al DOM), con aritmética exacta en centavos e invariante `suma(pagos) + anticipo === costoTotal`.
- [x] Generación de enlace WhatsApp compatible con número vacío (`https://wa.me/?text=...`) o con número configurado (`https://wa.me/<número>?text=...`).
- [x] Suite de pruebas unitarias en `tests/calc.test.js` ejecutable con Node sin dependencias.
- [x] Interfaz responsive (`375px`, `768px`, `1280px`), accesible y con estética industrial en `index.html`, `styles.css` y `app.js`.
- [x] Placeholders vectoriales `DEMO` en `assets/`.
- [x] Verificación visual multi-viewport (`375px`, `768px`, `1280px`) y validación de flujos interactivos en navegador.

## Decisiones técnicas y de cálculo

1. **Aritmética en centavos (`toCents` / `splitCentsEvenly`)**:
   Todos los cálculos monetarios se ejecutan en enteros de centavos para evitar errores de punto flotante. Cuando `montoTotalFinanciado / cantidadPagos` no es divisible exacto, el remanente de centavos se distribuye de a `$ 0,01` en los últimos pagos, asegurando diferencia máxima de `$ 0,01` entre pagos e igualdad exacta `suma(pagos) + anticipo === costoTotal`.
2. **Estrategia de financiación intercambiable (`FINANCING_METHODS`)**:
   Por defecto `config.js` usa `simpleMonthly` (interés simple mensual sobre saldo financiado: `interés = saldo * tasaMensual * nPagos`). También se deja implementado `frenchAmortized` (sistema francés) para facilitar el cambio de fórmula.
3. **Fechas de vencimiento mensuales (`addMonths`)**:
   Se calcula `hoy + 1 mes` para el pago 1, `hoy + 2 meses` para el pago 2, etc., ajustando días de fin de mes (ej. 31 de enero → 28/29 de febrero) sin desbordar al mes siguiente.
4. **Compatibilidad UMD sin bundler (`config.js`, `calc.js`)**:
   Funciona tanto con `<script>` clásico en navegador (incluso en subrutas de GitHub Pages) como mediante `require()` en Node.
5. **WhatsApp adaptable en modo demo (`buildWhatsAppUrl`)**:
   Con `whatsappNumber: ""` por defecto, el enlace usa `https://wa.me/?text=...` para elegir el destinatario al abrir WhatsApp, acompañado por la ayuda `"En la demo elegís a quién enviar el mensaje"`. Al configurar un número en `config.js`, se utiliza `https://wa.me/<número>?text=...`.
6. **Validación no destructiva en UI**:
   Al ingresar anticipos vacíos o fuera de rango en el input numérico, se muestra un mensaje claro (`role="alert"`), se deshabilita el botón de WhatsApp y se oculta el resultado numérico inválido para no mostrar `NaN`, sin borrar lo que escribe el usuario y ofreciendo un botón rápido para restaurar el anticipo sugerido.

## Pendientes para pasar a producción

- [ ] Confirmar el método financiero definitivo (interés simple directo, sistema francés, tasa efectiva mensual o recargo por plazo de cheque).
- [ ] Reemplazar las 3 máquinas de ejemplo (`config.js`) y los SVG placeholder (`assets/`) por el catálogo definitivo, precios vigentes y fotografías reales.
- [ ] Cargar tasas mensuales reales diferenciadas (cuotas vs. cheques) y opciones de cantidad de pagos definitivas.
- [ ] Configurar el número de WhatsApp comercial en `config.js` (si se desea envío directo a un único destino) y quitar el rótulo `DEMO`.
- [ ] Definir el esquema del primer vencimiento para cheques (30 días desde hoy o esquema 0/30/60).
