(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DosingCalc = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseFiniteNumber(value) {
    if (value === null || value === undefined || typeof value === 'boolean') {
      return NaN;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return NaN;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
  }

  function toCents(amount) {
    const num = parseFiniteNumber(amount);
    if (!Number.isFinite(num)) return NaN;
    return Math.round((num + Math.sign(num) * 1e-9) * 100);
  }

  function fromCents(cents) {
    return cents / 100;
  }

  function round2(amount) {
    const cents = toCents(amount);
    if (!Number.isFinite(cents)) return NaN;
    return fromCents(cents);
  }

  function splitCentsEvenly(totalCents, count) {
    const base = Math.floor(totalCents / count);
    const remainder = totalCents % count;
    const baseCount = count - remainder;
    const installments = [];
    for (let i = 0; i < count; i += 1) {
      installments.push(i < baseCount ? base : base + 1);
    }
    return installments;
  }

  function addMonths(baseDate, monthsToAdd) {
    const date = baseDate instanceof Date ? baseDate : new Date(baseDate);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Fecha de referencia inválida.');
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const totalMonths = year * 12 + month + monthsToAdd;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const maxDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDayInMonth);

    return new Date(targetYear, targetMonth, clampedDay);
  }

  function formatDateAR(date) {
    const d = date instanceof Date ? date : new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function formatCurrencyARS(amount, locale, currency) {
    const safeAmount = round2(amount);
    const formatter = new Intl.NumberFormat(locale || 'es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(Number.isFinite(safeAmount) ? safeAmount : 0);
  }

  function formatPercent(percentValue, locale) {
    const safeValue = round2(percentValue);
    const formatter = new Intl.NumberFormat(locale || 'es-AR', {
      minimumFractionDigits: Number.isInteger(safeValue) ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `${formatter.format(Number.isFinite(safeValue) ? safeValue : 0)}%`;
  }

  function getDownPaymentBounds(cashPrice, config) {
    const safePrice = parseFiniteNumber(cashPrice);
    const downCfg = (config && config.downPayment) || {};
    const minPercent = parseFiniteNumber(downCfg.minPercent);
    const maxPercent = parseFiniteNumber(downCfg.maxPercent);
    const resolvedMinPct = Number.isFinite(minPercent) ? minPercent : 0;
    const resolvedMaxPct = Number.isFinite(maxPercent) ? maxPercent : 100;

    const minAmount = Number.isFinite(safePrice)
      ? round2((safePrice * resolvedMinPct) / 100)
      : 0;
    const maxAmount = Number.isFinite(safePrice)
      ? round2((safePrice * resolvedMaxPct) / 100)
      : 0;

    return {
      minPercent: resolvedMinPct,
      maxPercent: resolvedMaxPct,
      minAmount,
      maxAmount
    };
  }

  /**
   * Estrategias de cálculo financiero intercambiables.
   * Para agregar o cambiar el método del cliente, registrar una nueva función
   * aquí y seleccionarla desde config.js -> financingMethod.
   */
  const FINANCING_METHODS = {
    simpleMonthly: function simpleMonthly({
      financedPrincipalCents,
      monthlyRate,
      paymentCount
    }) {
      const totalInterestCents = Math.round(
        financedPrincipalCents * monthlyRate * paymentCount
      );
      const financedTotalCents = financedPrincipalCents + totalInterestCents;
      const installmentsCents = splitCentsEvenly(financedTotalCents, paymentCount);
      return {
        totalInterestCents,
        financedTotalCents,
        installmentsCents
      };
    },

    frenchAmortized: function frenchAmortized({
      financedPrincipalCents,
      monthlyRate,
      paymentCount
    }) {
      if (financedPrincipalCents === 0 || monthlyRate === 0) {
        return FINANCING_METHODS.simpleMonthly({
          financedPrincipalCents,
          monthlyRate: 0,
          paymentCount
        });
      }
      const factor = 1 - Math.pow(1 + monthlyRate, -paymentCount);
      const exactInstallmentCents = (financedPrincipalCents * monthlyRate) / factor;
      const financedTotalCents = Math.round(exactInstallmentCents * paymentCount);
      const totalInterestCents = Math.max(
        0,
        financedTotalCents - financedPrincipalCents
      );
      const installmentsCents = splitCentsEvenly(financedTotalCents, paymentCount);
      return {
        totalInterestCents,
        financedTotalCents,
        installmentsCents
      };
    }
  };

  function validateFinancingInput(input, config) {
    const errors = {};
    const safeInput = input || {};
    const safeConfig = config || {};
    const locale = safeConfig.currencyLocale || 'es-AR';
    const currency = safeConfig.currencyCode || 'ARS';

    const machines = Array.isArray(safeConfig.machines) ? safeConfig.machines : [];
    const machine = machines.find((m) => m.id === safeInput.machineId) || null;
    if (!machine) {
      errors.machine = 'Seleccioná una máquina válida.';
    }

    const cashPrice = machine ? parseFiniteNumber(machine.cashPrice) : NaN;
    if (machine && (!Number.isFinite(cashPrice) || cashPrice <= 0)) {
      errors.machine = 'El precio de contado de la máquina debe ser mayor a cero.';
    }

    const modalities = safeConfig.modalities || {};
    const modality = modalities[safeInput.modalityId] || null;
    if (!modality) {
      errors.modality = 'Seleccioná una modalidad de pago válida.';
    } else {
      const rate = parseFiniteNumber(modality.monthlyInterestRate);
      if (!Number.isFinite(rate) || rate < 0) {
        errors.modality = 'La tasa mensual configurada no es válida.';
      }
    }

    const paymentCount = parseFiniteNumber(safeInput.paymentCount);
    if (!Number.isInteger(paymentCount) || paymentCount < 1) {
      errors.paymentCount = 'La cantidad de pagos debe ser un entero mayor o igual a 1.';
    }

    const bounds = getDownPaymentBounds(
      Number.isFinite(cashPrice) ? cashPrice : 0,
      safeConfig
    );

    const rawDownPayment = parseFiniteNumber(safeInput.downPaymentAmount);
    const downPaymentCents = toCents(rawDownPayment);
    const minCents = toCents(bounds.minAmount);
    const maxCents = toCents(bounds.maxAmount);

    if (!Number.isFinite(rawDownPayment)) {
      errors.downPayment = `Ingresá un anticipo válido entre ${formatCurrencyARS(
        bounds.minAmount,
        locale,
        currency
      )} y ${formatCurrencyARS(bounds.maxAmount, locale, currency)}.`;
    } else if (downPaymentCents < minCents || downPaymentCents > maxCents) {
      errors.downPayment = `El anticipo debe estar entre ${formatCurrencyARS(
        bounds.minAmount,
        locale,
        currency
      )} (${formatPercent(bounds.minPercent, locale)}) y ${formatCurrencyARS(
        bounds.maxAmount,
        locale,
        currency
      )} (${formatPercent(bounds.maxPercent, locale)}).`;
    }

    const resolvedDownPayment = Number.isFinite(downPaymentCents)
      ? fromCents(downPaymentCents)
      : NaN;
    const resolvedDownPaymentPercent =
      Number.isFinite(resolvedDownPayment) && Number.isFinite(cashPrice) && cashPrice > 0
        ? round2((resolvedDownPayment / cashPrice) * 100)
        : 0;

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      bounds,
      resolved: {
        machine,
        cashPrice: Number.isFinite(cashPrice) ? round2(cashPrice) : 0,
        downPaymentAmount: resolvedDownPayment,
        downPaymentPercent: resolvedDownPaymentPercent,
        modality,
        paymentCount
      }
    };
  }

  function calculateFinancing(input, config, options) {
    const safeOptions = options || {};
    const safeConfig = config || {};
    const validation = validateFinancingInput(input, safeConfig);

    if (!validation.valid) {
      const firstError =
        Object.values(validation.errors)[0] || 'Parámetros de financiación inválidos.';
      const err = new Error(firstError);
      err.code = 'INVALID_INPUT';
      err.errors = validation.errors;
      throw err;
    }

    const {
      machine,
      cashPrice,
      downPaymentAmount,
      downPaymentPercent,
      modality,
      paymentCount
    } = validation.resolved;

    const methodName =
      safeOptions.method || safeConfig.financingMethod || 'simpleMonthly';
    const methodRegistry =
      safeOptions.methods && typeof safeOptions.methods === 'object'
        ? Object.assign({}, FINANCING_METHODS, safeOptions.methods)
        : FINANCING_METHODS;
    const strategy = methodRegistry[methodName];

    if (typeof strategy !== 'function') {
      throw new Error(`Método de financiación no soportado: ${methodName}`);
    }

    const referenceDate =
      safeOptions.referenceDate !== undefined ? safeOptions.referenceDate : new Date();
    const firstOffset = Number.isInteger(safeConfig.firstPaymentOffsetMonths)
      ? safeConfig.firstPaymentOffsetMonths
      : 1;

    const cashPriceCents = toCents(cashPrice);
    const downPaymentCents = toCents(downPaymentAmount);
    const financedPrincipalCents = cashPriceCents - downPaymentCents;
    const monthlyInterestRate = parseFiniteNumber(modality.monthlyInterestRate);

    const {
      totalInterestCents,
      financedTotalCents,
      installmentsCents
    } = strategy({
      financedPrincipalCents,
      monthlyRate: monthlyInterestRate,
      paymentCount
    });

    const totalCostCents = downPaymentCents + financedTotalCents;
    const sumPaymentsCents = installmentsCents.reduce((acc, val) => acc + val, 0);

    const schedule = installmentsCents.map((amountCents, index) => {
      const paymentNumber = index + 1;
      const dueDate = addMonths(referenceDate, firstOffset + index);
      return {
        number: paymentNumber,
        dueDate,
        dueDateFormatted: formatDateAR(dueDate),
        amount: fromCents(amountCents)
      };
    });

    const firstPaymentAmount = schedule[0].amount;
    const lastPaymentAmount = schedule[schedule.length - 1].amount;
    const hasUniformPayments = schedule.every(
      (item) => item.amount === firstPaymentAmount
    );

    return {
      machine,
      modality,
      method: methodName,
      monthlyInterestRate,
      paymentCount,
      cashPrice: fromCents(cashPriceCents),
      downPaymentAmount: fromCents(downPaymentCents),
      downPaymentPercent,
      financedPrincipal: fromCents(financedPrincipalCents),
      totalInterest: fromCents(totalInterestCents),
      financedTotal: fromCents(financedTotalCents),
      totalCost: fromCents(totalCostCents),
      sumOfPayments: fromCents(sumPaymentsCents),
      firstPaymentAmount,
      lastPaymentAmount,
      hasUniformPayments,
      schedule
    };
  }

  function buildWhatsAppMessage(result, config) {
    const safeConfig = config || {};
    const locale = safeConfig.currencyLocale || 'es-AR';
    const currency = safeConfig.currencyCode || 'ARS';
    const fmt = (value) => formatCurrencyARS(value, locale, currency);

    const paymentLine = result.hasUniformPayments
      ? `${result.paymentCount} x ${fmt(result.firstPaymentAmount)}`
      : `${result.paymentCount} pagos (desde ${fmt(result.firstPaymentAmount)} hasta ${fmt(
          result.lastPaymentAmount
        )})`;

    const lines = [
      `Hola, consulto por la simulación de financiación (DEMO):`,
      `- Máquina: ${result.machine.name}`,
      `- Precio de contado: ${fmt(result.cashPrice)}`,
      `- Anticipo: ${fmt(result.downPaymentAmount)} (${formatPercent(
        result.downPaymentPercent,
        locale
      )})`,
      `- Modalidad: ${result.modality.label}`,
      `- Pagos: ${result.paymentCount}`,
      `- Importe por pago: ${paymentLine}`,
      `- Monto financiado: ${fmt(result.financedPrincipal)}`,
      `- Intereses estimados: ${fmt(result.totalInterest)}`,
      `- Costo total: ${fmt(result.totalCost)}`
    ];

    return lines.join('\n');
  }

  function buildWhatsAppUrl(result, config) {
    const safeConfig = config || {};
    const digits = String(safeConfig.whatsappNumber || '').replace(/\D/g, '');
    const message = buildWhatsAppMessage(result, safeConfig);
    const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(message)}`;
  }

  return {
    FINANCING_METHODS,
    round2,
    addMonths,
    formatDateAR,
    formatCurrencyARS,
    formatPercent,
    getDownPaymentBounds,
    validateFinancingInput,
    calculateFinancing,
    buildWhatsAppMessage,
    buildWhatsAppUrl
  };
}));
