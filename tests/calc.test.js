'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../config.js');
const calc = require('../calc.js');

const REFERENCE_DATE = new Date(2026, 10, 16); // 16/11/2026

function getMaxPayments(modality) {
  return Math.max(...modality.paymentCounts);
}

test('config.js expone 3 máquinas demo, modalidades y rango de anticipo válidos', () => {
  assert.equal(config.machines.length, 3);
  for (const machine of config.machines) {
    assert.ok(machine.id);
    assert.ok(machine.name);
    assert.ok(machine.cashPrice > 0);
    assert.ok(machine.image);
  }
  assert.equal(config.downPayment.minPercent, 0);
  assert.ok(config.downPayment.maxPercent > 0);
  assert.ok(config.modalities.cuotas);
  assert.ok(config.modalities.cheques);
  assert.equal(config.whatsappNumber, '');
});

test('anticipo 0%: financia el 100% del precio de contado y suma de pagos iguala costo total', () => {
  // DV-200 ($4.850.000), cuotas (4,5% mensual), 6 pagos:
  // interés = 4.850.000 * 0.045 * 6 = 1.309.500
  // costo total = 6.159.500 (4 pagos de 1.026.583,33 + 2 pagos de 1.026.583,34)
  const testConfig = {
    ...config,
    modalities: {
      ...config.modalities,
      cuotas: {
        ...config.modalities.cuotas,
        monthlyInterestRate: 0.045
      }
    }
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'dv-200',
      downPaymentAmount: 0,
      modalityId: 'cuotas',
      paymentCount: 6
    },
    testConfig,
    { referenceDate: REFERENCE_DATE }
  );

  assert.equal(result.downPaymentAmount, 0);
  assert.equal(result.downPaymentPercent, 0);
  assert.equal(result.financedPrincipal, 4850000);
  assert.equal(result.totalInterest, 1309500);
  assert.equal(result.totalCost, 6159500);
  assert.equal(result.schedule.length, 6);
  assert.equal(result.schedule[0].amount, 1026583.33);
  assert.equal(result.schedule[5].amount, 1026583.34);
  assert.equal(result.sumOfPayments + result.downPaymentAmount, result.totalCost);
});

test('anticipo máximo definido en config.js: calcula saldo exacto y suma de pagos + anticipo === costo total', () => {
  // DG-500 ($8.900.000), anticipo máx 70% = $6.230.000, saldo = $2.670.000
  // cheques (3,5% mensual), 6 pagos: interés = 2.670.000 * 0.035 * 6 = 560.700
  // costo total = 8.900.000 + 560.700 = 9.460.700
  const maxDownPayment = (8900000 * config.downPayment.maxPercent) / 100;
  const testConfig = {
    ...config,
    modalities: {
      ...config.modalities,
      cheques: {
        ...config.modalities.cheques,
        monthlyInterestRate: 0.035
      }
    }
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'dg-500',
      downPaymentAmount: maxDownPayment,
      modalityId: 'cheques',
      paymentCount: 6
    },
    testConfig,
    { referenceDate: REFERENCE_DATE }
  );

  assert.equal(result.downPaymentAmount, 6230000);
  assert.equal(result.downPaymentPercent, 70);
  assert.equal(result.financedPrincipal, 2670000);
  assert.equal(result.totalInterest, 560700);
  assert.equal(result.totalCost, 9460700);
  assert.equal(
    Math.round((result.sumOfPayments + result.downPaymentAmount) * 100),
    Math.round(result.totalCost * 100)
  );
});

test('1 pago: genera 1 vencimiento a 1 mes y suma de pagos + anticipo === costo total', () => {
  // DV-200 ($4.850.000) - anticipo 850.000 = 4.000.000, tasa 0.045, 1 pago => 4.180.000
  const testConfig = {
    ...config,
    modalities: {
      ...config.modalities,
      cuotas: {
        ...config.modalities.cuotas,
        monthlyInterestRate: 0.045
      }
    }
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'dv-200',
      downPaymentAmount: 850000,
      modalityId: 'cuotas',
      paymentCount: 1
    },
    testConfig,
    { referenceDate: REFERENCE_DATE }
  );

  assert.equal(result.schedule.length, 1);
  assert.equal(result.schedule[0].number, 1);
  assert.equal(result.schedule[0].dueDateFormatted, '16/12/2026');
  assert.equal(result.schedule[0].amount, 4180000);
  assert.equal(result.hasUniformPayments, true);
  assert.equal(result.sumOfPayments + result.downPaymentAmount, 5030000);
  assert.equal(result.totalCost, 5030000);
});

test('máximo de pagos configurado: genera todas las filas mensuales y cierra exacto al centavo', () => {
  const machine = config.machines[2]; // LDA-1000 ($15.400.000)
  const modality = config.modalities.cuotas;
  const maxPayments = getMaxPayments(modality);
  const downPayment = 3000000;

  const result = calc.calculateFinancing(
    {
      machineId: machine.id,
      downPaymentAmount: downPayment,
      modalityId: modality.id,
      paymentCount: maxPayments
    },
    config,
    { referenceDate: REFERENCE_DATE }
  );

  assert.equal(result.schedule.length, maxPayments);
  assert.equal(result.schedule[0].number, 1);
  assert.equal(result.schedule[0].dueDateFormatted, '16/12/2026');
  assert.equal(result.schedule[maxPayments - 1].number, maxPayments);
  assert.equal(result.schedule[maxPayments - 1].dueDateFormatted, '16/11/2027');
  assert.equal(
    Math.round((result.sumOfPayments + result.downPaymentAmount) * 100),
    Math.round(result.totalCost * 100)
  );
});

test('tasa 0%: interés cero y costo total igual al precio de contado', () => {
  const zeroRateConfig = {
    ...config,
    modalities: {
      ...config.modalities,
      cuotas: {
        ...config.modalities.cuotas,
        monthlyInterestRate: 0
      }
    }
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'dv-200',
      downPaymentAmount: 850000,
      modalityId: 'cuotas',
      paymentCount: 3
    },
    zeroRateConfig,
    { referenceDate: REFERENCE_DATE }
  );

  assert.equal(result.totalInterest, 0);
  assert.equal(result.financedPrincipal, 4000000);
  assert.equal(result.financedTotal, 4000000);
  assert.equal(result.totalCost, 4850000);
  assert.deepEqual(
    result.schedule.map((row) => row.amount),
    [1333333.33, 1333333.33, 1333333.34]
  );
  assert.equal(
    Math.round((result.sumOfPayments + result.downPaymentAmount) * 100),
    485000000
  );
});

test('redondeo a 2 decimales e invariante suma de pagos + anticipo === costo total con divisiones inexactas', () => {
  const customConfig = {
    ...config,
    machines: [
      {
        id: 'odd-machine',
        code: 'ODD-1',
        name: 'Dosificadora de Prueba',
        cashPrice: 1000000.01,
        image: 'assets/machine-dv200.svg'
      }
    ],
    modalities: {
      cuotas: {
        id: 'cuotas',
        label: 'Cuotas fijas',
        shortLabel: 'Cuotas',
        monthlyInterestRate: 0.0375,
        paymentCounts: [1, 3, 7, 12],
        defaultPaymentCount: 3
      }
    }
  };

  assert.equal(calc.round2(1.005), 1.01);
  assert.equal(calc.round2(10.235), 10.24);

  for (const paymentCount of [3, 7, 12]) {
    const downPaymentAmount = 100000.33;
    const result = calc.calculateFinancing(
      {
        machineId: 'odd-machine',
        downPaymentAmount,
        modalityId: 'cuotas',
        paymentCount
      },
      customConfig,
      { referenceDate: REFERENCE_DATE }
    );

    const isTwoDecimals = (n) => /^\d+(\.\d{1,2})?$/.test(String(n));

    assert.ok(isTwoDecimals(result.financedPrincipal));
    assert.ok(isTwoDecimals(result.totalInterest));
    assert.ok(isTwoDecimals(result.financedTotal));
    assert.ok(isTwoDecimals(result.totalCost));
    assert.ok(isTwoDecimals(result.sumOfPayments));

    let manualSumCents = 0;
    for (const item of result.schedule) {
      assert.ok(
        isTwoDecimals(item.amount),
        `Pago #${item.number} excede 2 decimales: ${item.amount}`
      );
      manualSumCents += Math.round(item.amount * 100);
    }

    assert.equal(
      manualSumCents + Math.round(result.downPaymentAmount * 100),
      Math.round(result.totalCost * 100)
    );
  }
});

test('cambiar una tasa en config se refleja automáticamente en el cálculo sin tocar calc.js', () => {
  const lowRateConfig = {
    ...config,
    modalities: {
      ...config.modalities,
      cheques: {
        ...config.modalities.cheques,
        monthlyInterestRate: 0.02
      }
    }
  };
  const highRateConfig = {
    ...config,
    modalities: {
      ...config.modalities,
      cheques: {
        ...config.modalities.cheques,
        monthlyInterestRate: 0.07
      }
    }
  };

  const baseInput = {
    machineId: 'dv-200',
    downPaymentAmount: 850000,
    modalityId: 'cheques',
    paymentCount: 6
  };

  const lowResult = calc.calculateFinancing(baseInput, lowRateConfig, {
    referenceDate: REFERENCE_DATE
  });
  const highResult = calc.calculateFinancing(baseInput, highRateConfig, {
    referenceDate: REFERENCE_DATE
  });

  assert.equal(lowResult.totalInterest, 480000);
  assert.equal(highResult.totalInterest, 1680000);
  assert.equal(highResult.totalCost - lowResult.totalCost, 1200000);
});

test('fechas de vencimiento manejan fin de mes y años bisiestos sin desbordar de mes', () => {
  const jan31NonLeap = calc.calculateFinancing(
    {
      machineId: 'dv-200',
      downPaymentAmount: 0,
      modalityId: 'cuotas',
      paymentCount: 3
    },
    config,
    { referenceDate: new Date(2026, 0, 31) }
  );

  assert.deepEqual(
    jan31NonLeap.schedule.map((row) => row.dueDateFormatted),
    ['28/02/2026', '31/03/2026', '30/04/2026']
  );

  const jan31Leap = calc.calculateFinancing(
    {
      machineId: 'dv-200',
      downPaymentAmount: 0,
      modalityId: 'cuotas',
      paymentCount: 1
    },
    config,
    { referenceDate: new Date(2024, 0, 31) }
  );

  assert.equal(jan31Leap.schedule[0].dueDateFormatted, '29/02/2024');
});

test('soporta cambiar el método de cálculo (estrategia extensible en calc.js)', () => {
  const frenchConfig = {
    ...config,
    financingMethod: 'frenchAmortized',
    modalities: {
      ...config.modalities,
      cuotas: {
        ...config.modalities.cuotas,
        monthlyInterestRate: 0.045
      }
    }
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'dv-200',
      downPaymentAmount: 850000,
      modalityId: 'cuotas',
      paymentCount: 6
    },
    frenchConfig,
    { referenceDate: REFERENCE_DATE }
  );

  assert.equal(result.method, 'frenchAmortized');
  assert.equal(result.schedule.length, 6);
  assert.equal(result.financedTotal, 4653081.3);
  assert.equal(result.totalInterest, 653081.3);
  assert.equal(
    Math.round((result.sumOfPayments + result.downPaymentAmount) * 100),
    Math.round(result.totalCost * 100)
  );
});

test('validación rechaza anticipo fuera de rango, vacío o parámetros inválidos', () => {
  const machine = config.machines[0];
  const maxAllowed = (machine.cashPrice * config.downPayment.maxPercent) / 100;

  const negative = calc.validateFinancingInput(
    { machineId: machine.id, downPaymentAmount: -1, modalityId: 'cuotas', paymentCount: 3 },
    config
  );
  assert.equal(negative.valid, false);
  assert.ok(negative.errors.downPayment);

  const overMax = calc.validateFinancingInput(
    {
      machineId: machine.id,
      downPaymentAmount: maxAllowed + 1,
      modalityId: 'cuotas',
      paymentCount: 3
    },
    config
  );
  assert.equal(overMax.valid, false);
  assert.ok(overMax.errors.downPayment);

  const empty = calc.validateFinancingInput(
    { machineId: machine.id, downPaymentAmount: '', modalityId: 'cuotas', paymentCount: 3 },
    config
  );
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.downPayment);

  const badMachine = calc.validateFinancingInput(
    { machineId: 'no-existe', downPaymentAmount: 0, modalityId: 'cuotas', paymentCount: 3 },
    config
  );
  assert.equal(badMachine.valid, false);
  assert.ok(badMachine.errors.machine);

  assert.throws(() => {
    calc.calculateFinancing(
      {
        machineId: machine.id,
        downPaymentAmount: maxAllowed + 500,
        modalityId: 'cuotas',
        paymentCount: 3
      },
      config
    );
  });
});

test('mensaje y URL de WhatsApp con número configurado codifica caracteres especiales sin truncarse', () => {
  const specialConfig = {
    ...config,
    whatsappNumber: '+54 9 11 5555-0199',
    machines: [
      {
        id: 'special-1',
        code: 'ESP-#1',
        name: 'Dosificadora Ñandú #1 (100% Acero & Precisión + PLC)',
        cashPrice: 5000000,
        image: 'assets/machine-dv200.svg'
      }
    ],
    modalities: {
      ...config.modalities,
      cuotas: {
        ...config.modalities.cuotas,
        monthlyInterestRate: 0.045
      }
    }
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'special-1',
      downPaymentAmount: 1000000,
      modalityId: 'cuotas',
      paymentCount: 6
    },
    specialConfig,
    { referenceDate: REFERENCE_DATE }
  );

  // 5.000.000 - 1.000.000 = 4.000.000; interés = 4.000.000 * 0.045 * 6 = 1.080.000
  // financiado total = 5.080.000 / 6 = 846.666,67 (primeros 4 en .66, últimos 2 en .67); costo total = 6.080.000
  const url = calc.buildWhatsAppUrl(result, specialConfig);
  assert.ok(url.startsWith('https://wa.me/5491155550199?text='));

  const parsed = new URL(url);
  const decodedText = parsed.searchParams.get('text');

  assert.ok(decodedText.includes('Dosificadora Ñandú #1 (100% Acero & Precisión + PLC)'));
  assert.ok(decodedText.includes('Cuotas fijas'));
  assert.ok(decodedText.includes('Pagos: 6'));
  assert.ok(decodedText.includes('1.000.000,00'));
  assert.ok(decodedText.includes('846.666,66'));
  assert.ok(decodedText.includes('6.080.000,00'));
  assert.ok(!url.split('?text=')[1].includes('&'));
  assert.ok(!url.split('?text=')[1].includes('#'));
});

test('URL de WhatsApp sin número configurado (whatsappNumber vacío) usa https://wa.me/?text= con caracteres especiales codificados', () => {
  const emptyNumberConfig = {
    ...config,
    whatsappNumber: '',
    machines: [
      {
        id: 'special-2',
        code: 'ESP-#2',
        name: 'Dosificadora Técnica Ñ & Cía + 100%',
        cashPrice: 4850000,
        image: 'assets/machine-dv200.svg'
      }
    ]
  };

  const result = calc.calculateFinancing(
    {
      machineId: 'special-2',
      downPaymentAmount: 0,
      modalityId: 'cuotas',
      paymentCount: 1
    },
    emptyNumberConfig,
    { referenceDate: REFERENCE_DATE }
  );

  const url = calc.buildWhatsAppUrl(result, emptyNumberConfig);
  assert.ok(url.startsWith('https://wa.me/?text='));

  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/');
  const decodedText = parsed.searchParams.get('text');
  assert.ok(decodedText.includes('Dosificadora Técnica Ñ & Cía + 100%'));
  assert.ok(decodedText.includes('4.850.000,00'));
  assert.ok(!url.split('?text=')[1].includes('&'));
  assert.ok(!url.split('?text=')[1].includes('#'));
});

test('formato de moneda es-AR utiliza signo pesos, separador de miles y coma decimal', () => {
  const formatted = calc.formatCurrencyARS(1234567.89);
  assert.match(formatted, /\$/);
  assert.match(formatted, /1\.234\.567,89/);
});
