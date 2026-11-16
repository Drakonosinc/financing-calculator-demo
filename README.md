# Equipos Dosificadores · Demo — Calculadora de Financiación

Demo web interactiva para simular planes de financiación de máquinas dosificadoras industriales en pesos argentinos (`es-AR`), sin dependencias externas ni backend, preparada para publicarse como sitio estático en GitHub Pages.

> **Aviso:** Los modelos de equipos, precios, tasas y condiciones incluidos son **ficticios y de demostración (DEMO)**.

## Estructura del proyecto

- `index.html`: Estructura semántica y accesible del simulador.
- `styles.css`: Estilos con estética industrial sobria, alto contraste y diseño responsive (`375px`, `768px`, `1280px`).
- `config.js`: Configuración centralizada (máquinas de ejemplo, rango de anticipo, modalidades, tasas mensuales, opciones de pagos, método financiero y número de WhatsApp opcional).
- `calc.js`: Lógica pura de validación, cálculo financiero y armado del enlace de WhatsApp (sin dependencias del DOM).
- `app.js`: Enlace de eventos e interfaz sobre `config.js` y `calc.js`.
- `assets/`: Ilustraciones técnicas vectoriales placeholder (`SVG`) marcadas como `DEMO`.
- `tests/calc.test.js`: Suite de pruebas automatizadas ejecutables con Node (`node:test`).
- `PROJECT.md`: Registro de estado, decisiones técnicas y pendientes.

## Configuración rápida (`config.js`)

Todo ajuste comercial se realiza editando únicamente `config.js`:

- `companyName` y `companyTagline`: Marca y subtítulo mostrados en el encabezado.
- `machines`: Lista de equipos con `id`, `code`, `name`, `category`, `description`, `specs`, `cashPrice` e `image`.
- `downPayment`: Porcentajes `minPercent`, `maxPercent`, `defaultPercent`, `stepPercent` y `quickPercents`.
- `modalities`: Modalidades (`cuotas`, `cheques`), cada una con `monthlyInterestRate` (ej. `0.045` = `4,5%` mensual) y `paymentCounts`.
- `financingMethod`: Método de cálculo activo (`'simpleMonthly'` por defecto; también incluye `'frenchAmortized'` y admite registrar nuevas estrategias en `calc.js`).
- `whatsappNumber`: Por defecto vacío (`""`), por lo que el botón genera `https://wa.me/?text=<mensaje>` para elegir el destinatario al momento de enviar. Si se configura un número, genera `https://wa.me/<número>?text=<mensaje>`.

## Ejecución local

Al ser 100% estático, se puede abrir `index.html` directamente o servir la carpeta raíz con un servidor HTTP estático local en el puerto `8080`.

## Pruebas automatizadas

Requiere Node.js:

```bash
node tests/calc.test.js
```

## Publicación en GitHub Pages

1. Subir el repositorio a GitHub.
2. En **Settings → Pages**, seleccionar la rama principal (`master` o `main`) y carpeta raíz (`/ (root)`).
3. Guardar para publicar; todas las rutas de scripts, estilos y gráficos SVG son relativas.
