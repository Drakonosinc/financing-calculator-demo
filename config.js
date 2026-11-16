(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.APP_CONFIG = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    demoMode: true,
    companyName: 'Equipos Dosificadores · Demo',
    companyTagline: 'Maquinaria industrial de dosificación',
    whatsappNumber: '',
    currencyLocale: 'es-AR',
    currencyCode: 'ARS',
    financingMethod: 'simpleMonthly',
    firstPaymentOffsetMonths: 1,
    downPayment: {
      minPercent: 0,
      maxPercent: 70,
      defaultPercent: 20,
      stepPercent: 1,
      quickPercents: [0, 20, 40, 70]
    },
    machines: [
      {
        id: 'dv-200',
        code: 'DV-200',
        name: 'Dosificadora Volumétrica DV-200',
        category: 'Líquidos y semilíquidos',
        description:
          'Dosificador neumático de pistón en acero inoxidable AISI 316L para fraccionado de baja y media viscosidad.',
        specs: [
          'Rango: 10 ml – 1.000 ml',
          'Precisión: ±0,5 %',
          'Producción: hasta 25 env/min'
        ],
        cashPrice: 4850000,
        image: 'assets/machine-dv200.svg',
        imageAlt:
          'Esquema técnico ilustrativo de la Dosificadora Volumétrica DV-200 (DEMO)'
      },
      {
        id: 'dg-500',
        code: 'DG-500',
        name: 'Dosificadora Gravimétrica DG-500',
        category: 'Polvos y granulados',
        description:
          'Equipo pesador con celda de carga industrial, tornillo sinfín servoaccionado y tolva sanitaria de 80 litros.',
        specs: [
          'Rango: 100 g – 5 kg',
          'Precisión: ±0,2 %',
          'Tolva: 80 L acero inox.'
        ],
        cashPrice: 8900000,
        image: 'assets/machine-dg500.svg',
        imageAlt:
          'Esquema técnico ilustrativo de la Dosificadora Gravimétrica DG-500 (DEMO)'
      },
      {
        id: 'lda-1000',
        code: 'LDA-1000',
        name: 'Línea Automática Doble Cabezal LDA-1000',
        category: 'Alta producción en línea',
        description:
          'Dosificador automático doble cabezal con cinta transportadora motorizada, sensores ópticos y control PLC.',
        specs: [
          'Rango: 50 ml – 5.000 ml',
          'Cabezales: 2 independientes',
          'Producción: hasta 45 env/min'
        ],
        cashPrice: 15400000,
        image: 'assets/machine-lda1000.svg',
        imageAlt:
          'Esquema técnico ilustrativo de la Línea Automática Doble Cabezal LDA-1000 (DEMO)'
      }
    ],
    modalities: {
      cuotas: {
        id: 'cuotas',
        label: 'Cuotas fijas',
        shortLabel: 'Cuotas',
        description: 'Financiación directa mensual con vencimiento cada 30 días.',
        monthlyInterestRate: 0.045,
        paymentCounts: [1, 3, 6, 12],
        defaultPaymentCount: 6
      },
      cheques: {
        id: 'cheques',
        label: 'Cheques diferidos',
        shortLabel: 'Cheques',
        description: 'Valores propios o E-Cheq a fecha con acreditación mensual.',
        monthlyInterestRate: 0.035,
        paymentCounts: [1, 3, 6, 12],
        defaultPaymentCount: 6
      }
    }
  };
}));
