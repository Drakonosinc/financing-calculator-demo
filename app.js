(function (global) {
  'use strict';

  const config = global.APP_CONFIG;
  const calc = global.DosingCalc;

  if (!config || !calc) {
    return;
  }

  const METHOD_LABELS = {
    simpleMonthly: 'Interés simple mensual',
    frenchAmortized: 'Sistema francés'
  };

  const defaultMachine = config.machines[0];
  const defaultModality =
    config.modalities.cuotas || Object.values(config.modalities)[0];
  const defaultBounds = calc.getDownPaymentBounds(
    defaultMachine.cashPrice,
    config
  );
  const initialPercent = Number.isFinite(config.downPayment.defaultPercent)
    ? config.downPayment.defaultPercent
    : defaultBounds.minPercent;
  const initialDownPayment = calc.round2(
    (defaultMachine.cashPrice * initialPercent) / 100
  );

  const state = {
    machineId: defaultMachine.id,
    modalityId: defaultModality.id,
    paymentCount:
      defaultModality.defaultPaymentCount || defaultModality.paymentCounts[0],
    downPaymentRaw: String(initialDownPayment),
    lastValidPercent: initialPercent,
    renderedPaymentCountsKey: ''
  };

  const els = {
    companyName: document.getElementById('company-name'),
    companyTagline: document.getElementById('company-tagline'),
    headerDemoBadge: document.getElementById('header-demo-badge'),
    machineOptions: document.getElementById('machine-options'),
    machineImage: document.getElementById('machine-image'),
    machineCategory: document.getElementById('machine-category'),
    machineCode: document.getElementById('machine-code'),
    machineName: document.getElementById('machine-name'),
    machineDescription: document.getElementById('machine-description'),
    machineSpecs: document.getElementById('machine-specs'),
    cashPriceValue: document.getElementById('cash-price-value'),
    downPaymentPercentBadge: document.getElementById('down-payment-percent-badge'),
    downPaymentInput: document.getElementById('down-payment-input'),
    downPaymentWrap: document
      .getElementById('down-payment-input')
      .closest('.currency-input-wrap'),
    downPaymentPresets: document.getElementById('down-payment-presets'),
    downPaymentSlider: document.getElementById('down-payment-slider'),
    downPaymentMinLabel: document.getElementById('down-payment-min-label'),
    downPaymentMaxLabel: document.getElementById('down-payment-max-label'),
    downPaymentHint: document.getElementById('down-payment-hint'),
    downPaymentError: document.getElementById('down-payment-error'),
    modalityOptions: document.getElementById('modality-options'),
    paymentCountOptions: document.getElementById('payment-count-options'),
    methodBadge: document.getElementById('method-badge'),
    resultsInvalidState: document.getElementById('results-invalid-state'),
    resultsInvalidMessage: document.getElementById('results-invalid-message'),
    fixDownPaymentBtn: document.getElementById('fix-down-payment-btn'),
    resultsValidState: document.getElementById('results-valid-state'),
    summaryFinanced: document.getElementById('summary-financed'),
    summaryDownPaymentLine: document.getElementById('summary-down-payment-line'),
    summaryInterest: document.getElementById('summary-interest'),
    summaryRateLine: document.getElementById('summary-rate-line'),
    summaryInstallmentLabel: document.getElementById('summary-installment-label'),
    summaryInstallment: document.getElementById('summary-installment'),
    summaryInstallmentNote: document.getElementById('summary-installment-note'),
    summaryTotalCost: document.getElementById('summary-total-cost'),
    whatsappCta: document.getElementById('whatsapp-cta'),
    whatsappNote: document.getElementById('whatsapp-note'),
    whatsappPreviewText: document.getElementById('whatsapp-preview-text'),
    scheduleReferenceDate: document.getElementById('schedule-reference-date'),
    scheduleTbody: document.getElementById('schedule-tbody'),
    scheduleSumPayments: document.getElementById('schedule-sum-payments'),
    scheduleTotalCheck: document.getElementById('schedule-total-check'),
    footerMethodNote: document.getElementById('footer-method-note')
  };

  function fmtMoney(amount) {
    return calc.formatCurrencyARS(
      amount,
      config.currencyLocale,
      config.currencyCode
    );
  }

  function fmtPct(percent) {
    return calc.formatPercent(percent, config.currencyLocale);
  }

  function getSelectedMachine() {
    return (
      config.machines.find((m) => m.id === state.machineId) || config.machines[0]
    );
  }

  function getSelectedModality() {
    return (
      config.modalities[state.modalityId] || Object.values(config.modalities)[0]
    );
  }

  function initHeaderAndMeta() {
    if (els.companyName && config.companyName) {
      els.companyName.textContent = config.companyName;
    }
    if (els.companyTagline && config.companyTagline) {
      els.companyTagline.textContent = config.companyTagline;
    }
    if (els.headerDemoBadge) {
      els.headerDemoBadge.hidden = !config.demoMode;
    }
    if (els.whatsappNote) {
      const digits = String(config.whatsappNumber || '').replace(/\D/g, '');
      els.whatsappNote.textContent = digits
        ? 'Se abrirá wa.me con el detalle completo (número configurado en config.js).'
        : 'En la demo elegís a quién enviar el mensaje';
    }
    if (els.footerMethodNote) {
      const activeMethodName =
        METHOD_LABELS[config.financingMethod] || config.financingMethod;
      els.footerMethodNote.textContent = `Método de cálculo activo: ${activeMethodName}.`;
    }
  }

  function buildMachineOptions() {
    els.machineOptions.replaceChildren();

    config.machines.forEach((machine) => {
      const label = document.createElement('label');
      label.className = 'choice-card';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'machine';
      radio.value = machine.id;

      const topRow = document.createElement('span');
      topRow.className = 'choice-card-top';

      const title = document.createElement('span');
      title.className = 'choice-card-title';
      title.textContent = machine.name;

      const code = document.createElement('span');
      code.className = 'choice-card-badge';
      code.textContent = machine.code || 'DEMO';

      topRow.append(title, code);

      const category = document.createElement('span');
      category.className = 'choice-card-sub';
      category.textContent = machine.category || '';

      const price = document.createElement('span');
      price.className = 'choice-card-price';
      price.textContent = `Contado: ${fmtMoney(machine.cashPrice)}`;

      label.append(radio, topRow, category, price);
      els.machineOptions.appendChild(label);
    });
  }

  function buildModalityOptions() {
    els.modalityOptions.replaceChildren();

    Object.values(config.modalities).forEach((modality) => {
      const label = document.createElement('label');
      label.className = 'choice-card';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'modality';
      radio.value = modality.id;

      const topRow = document.createElement('span');
      topRow.className = 'choice-card-top';

      const title = document.createElement('span');
      title.className = 'choice-card-title';
      title.textContent = modality.label;

      const rateBadge = document.createElement('span');
      rateBadge.className = 'choice-card-price';
      rateBadge.textContent = `${fmtPct(modality.monthlyInterestRate * 100)} / mes`;

      topRow.append(title, rateBadge);

      const desc = document.createElement('span');
      desc.className = 'choice-card-sub';
      desc.textContent = modality.description || '';

      label.append(radio, topRow, desc);
      els.modalityOptions.appendChild(label);
    });
  }

  function buildDownPaymentPresets() {
    const minPct = Number.isFinite(config.downPayment.minPercent)
      ? config.downPayment.minPercent
      : 0;
    const maxPct = Number.isFinite(config.downPayment.maxPercent)
      ? config.downPayment.maxPercent
      : 100;
    const presets = Array.isArray(config.downPayment.quickPercents)
      ? config.downPayment.quickPercents
      : [minPct, maxPct];

    els.downPaymentPresets.replaceChildren();
    presets
      .filter((pct) => pct >= minPct && pct <= maxPct)
      .forEach((pct) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn';
        btn.dataset.percent = String(pct);
        btn.textContent = pct === maxPct ? `Máx (${pct}%)` : `${pct}%`;
        els.downPaymentPresets.appendChild(btn);
      });
  }

  function syncRadioGroupSelection(container, activeValue) {
    const cards = container.querySelectorAll('label');
    cards.forEach((label) => {
      const input = label.querySelector('input[type="radio"]');
      if (!input) return;
      const isSelected = input.value === String(activeValue);
      input.checked = isSelected;
      label.classList.toggle('is-selected', isSelected);
    });
  }

  function renderMachinePreview(machine) {
    els.machineImage.src = machine.image;
    els.machineImage.alt = machine.imageAlt || `${machine.name} (DEMO)`;
    els.machineCategory.textContent = machine.category || 'Equipo industrial';
    els.machineCode.textContent = machine.code || 'DEMO';
    els.machineName.textContent = machine.name;
    els.machineDescription.textContent = machine.description || '';
    els.cashPriceValue.textContent = fmtMoney(machine.cashPrice);

    els.machineSpecs.replaceChildren();
    (machine.specs || []).forEach((spec) => {
      const li = document.createElement('li');
      li.textContent = spec;
      els.machineSpecs.appendChild(li);
    });
  }

  function syncPaymentCountOptions(modality) {
    const counts = Array.isArray(modality.paymentCounts)
      ? modality.paymentCounts
      : config.paymentCounts || [1, 3, 6, 12];

    if (!counts.includes(state.paymentCount)) {
      state.paymentCount =
        modality.defaultPaymentCount && counts.includes(modality.defaultPaymentCount)
          ? modality.defaultPaymentCount
          : counts[0];
    }

    const key = counts.join(',');
    if (key !== state.renderedPaymentCountsKey) {
      state.renderedPaymentCountsKey = key;
      els.paymentCountOptions.replaceChildren();

      counts.forEach((count) => {
        const label = document.createElement('label');
        label.className = 'pill-option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'paymentCount';
        radio.value = String(count);

        const text = document.createElement('span');
        text.textContent = count === 1 ? '1 pago' : `${count} pagos`;

        label.append(radio, text);
        els.paymentCountOptions.appendChild(label);
      });
    }

    syncRadioGroupSelection(els.paymentCountOptions, state.paymentCount);
  }

  function renderDownPaymentControls(machine, activePercent, isValid) {
    const bounds = calc.getDownPaymentBounds(machine.cashPrice, config);
    const stepPercent = Number.isFinite(config.downPayment.stepPercent)
      ? config.downPayment.stepPercent
      : 1;

    els.downPaymentInput.min = String(bounds.minAmount);
    els.downPaymentInput.max = String(bounds.maxAmount);
    els.downPaymentSlider.min = String(bounds.minPercent);
    els.downPaymentSlider.max = String(bounds.maxPercent);
    els.downPaymentSlider.step = String(stepPercent);
    els.downPaymentMinLabel.textContent = `${fmtPct(bounds.minPercent)} (${fmtMoney(
      bounds.minAmount
    )})`;
    els.downPaymentMaxLabel.textContent = `${fmtPct(bounds.maxPercent)} (${fmtMoney(
      bounds.maxAmount
    )})`;
    els.downPaymentHint.textContent = `Rango permitido: ${fmtMoney(
      bounds.minAmount
    )} a ${fmtMoney(bounds.maxAmount)}.`;

    if (els.downPaymentInput.value !== state.downPaymentRaw) {
      els.downPaymentInput.value = state.downPaymentRaw;
    }

    if (isValid) {
      els.downPaymentSlider.value = String(
        Math.min(bounds.maxPercent, Math.max(bounds.minPercent, Math.round(activePercent)))
      );
      els.downPaymentPercentBadge.textContent = fmtPct(activePercent);
    } else {
      els.downPaymentPercentBadge.textContent = '--%';
    }

    const presetButtons = els.downPaymentPresets.querySelectorAll('button[data-percent]');
    presetButtons.forEach((btn) => {
      const pct = Number(btn.dataset.percent);
      btn.classList.toggle('is-active', isValid && Math.abs(activePercent - pct) < 0.05);
    });
  }

  function renderValidationState(validation) {
    const errorMsg = validation.errors.downPayment || '';
    const hasError = !validation.valid;

    els.downPaymentInput.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    els.downPaymentWrap.classList.toggle('has-error', hasError);
    els.downPaymentError.hidden = !hasError;
    els.downPaymentError.textContent = errorMsg;

    els.resultsInvalidState.hidden = !hasError;
    els.resultsValidState.hidden = hasError;

    if (hasError) {
      els.resultsInvalidMessage.textContent =
        errorMsg || 'Corregí los datos para ver la tabla de pagos.';
      els.whatsappCta.classList.add('is-disabled');
      els.whatsappCta.setAttribute('aria-disabled', 'true');
      els.whatsappCta.setAttribute('tabindex', '-1');
      els.whatsappCta.removeAttribute('href');
    } else {
      els.whatsappCta.classList.remove('is-disabled');
      els.whatsappCta.removeAttribute('aria-disabled');
      els.whatsappCta.removeAttribute('tabindex');
    }
  }

  function renderCalculationResult(result, referenceDate) {
    const methodLabel = METHOD_LABELS[result.method] || result.method;
    const ratePct = fmtPct(result.monthlyInterestRate * 100);
    els.methodBadge.textContent = `${methodLabel} · ${ratePct}/mes`;

    els.summaryFinanced.textContent = fmtMoney(result.financedPrincipal);
    els.summaryDownPaymentLine.textContent = `Anticipo: ${fmtMoney(
      result.downPaymentAmount
    )} (${fmtPct(result.downPaymentPercent)})`;

    els.summaryInterest.textContent = fmtMoney(result.totalInterest);
    els.summaryRateLine.textContent = `${ratePct} mensual x ${result.paymentCount} ${
      result.paymentCount === 1 ? 'mes' : 'meses'
    }`;

    const unitNoun =
      result.modality.shortLabel === 'Cheques' ? 'cheque' : 'cuota';
    els.summaryInstallmentLabel.textContent =
      result.paymentCount === 1
        ? `Importe del pago (${unitNoun})`
        : `Importe por ${unitNoun}`;
    els.summaryInstallment.textContent = fmtMoney(result.firstPaymentAmount);

    if (result.hasUniformPayments) {
      els.summaryInstallmentNote.textContent =
        result.paymentCount === 1
          ? 'Pago único a 30 días'
          : `${result.paymentCount} pagos iguales`;
    } else {
      els.summaryInstallmentNote.textContent =
        'Algunos pagos se ajustan $0,01 por redondeo';
    }

    els.summaryTotalCost.textContent = fmtMoney(result.totalCost);

    const whatsappUrl = calc.buildWhatsAppUrl(result, config);
    const whatsappMessage = calc.buildWhatsAppMessage(result, config);
    els.whatsappCta.href = whatsappUrl;
    els.whatsappPreviewText.textContent = whatsappMessage;

    els.scheduleReferenceDate.textContent = `Calculado al ${calc.formatDateAR(
      referenceDate
    )}`;

    els.scheduleTbody.replaceChildren();
    result.schedule.forEach((row) => {
      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.textContent = String(row.number);

      const tdDate = document.createElement('td');
      tdDate.textContent = row.dueDateFormatted;

      const tdAmount = document.createElement('td');
      tdAmount.className = 'col-amount';
      tdAmount.textContent = fmtMoney(row.amount);

      tr.append(tdNum, tdDate, tdAmount);
      els.scheduleTbody.appendChild(tr);
    });

    els.scheduleSumPayments.textContent = fmtMoney(result.sumOfPayments);
    els.scheduleTotalCheck.textContent = fmtMoney(
      calc.round2(result.sumOfPayments + result.downPaymentAmount)
    );
  }

  function updateUI() {
    const machine = getSelectedMachine();
    const modality = getSelectedModality();

    syncRadioGroupSelection(els.machineOptions, state.machineId);
    renderMachinePreview(machine);
    syncRadioGroupSelection(els.modalityOptions, state.modalityId);
    syncPaymentCountOptions(modality);

    const validation = calc.validateFinancingInput(
      {
        machineId: machine.id,
        downPaymentAmount: state.downPaymentRaw,
        modalityId: modality.id,
        paymentCount: state.paymentCount
      },
      config
    );

    if (validation.valid) {
      state.lastValidPercent = validation.resolved.downPaymentPercent;
    }

    renderDownPaymentControls(
      machine,
      validation.resolved.downPaymentPercent,
      validation.valid
    );
    renderValidationState(validation);

    if (validation.valid) {
      const today = new Date();
      const result = calc.calculateFinancing(
        {
          machineId: machine.id,
          downPaymentAmount: validation.resolved.downPaymentAmount,
          modalityId: modality.id,
          paymentCount: state.paymentCount
        },
        config,
        { referenceDate: today }
      );
      renderCalculationResult(result, today);
    } else {
      els.methodBadge.textContent = `${
        METHOD_LABELS[config.financingMethod] || config.financingMethod
      } · ${fmtPct(modality.monthlyInterestRate * 100)}/mes`;
    }
  }

  function applyPercent(percent) {
    const machine = getSelectedMachine();
    const bounds = calc.getDownPaymentBounds(machine.cashPrice, config);
    const clampedPct = Math.min(
      bounds.maxPercent,
      Math.max(bounds.minPercent, percent)
    );
    const amount = calc.round2((machine.cashPrice * clampedPct) / 100);
    state.downPaymentRaw = String(amount);
    state.lastValidPercent = clampedPct;
    els.downPaymentInput.value = state.downPaymentRaw;
    updateUI();
  }

  function bindEvents() {
    els.machineOptions.addEventListener('change', (event) => {
      if (event.target && event.target.name === 'machine') {
        state.machineId = event.target.value;
        const machine = getSelectedMachine();
        const bounds = calc.getDownPaymentBounds(machine.cashPrice, config);
        const pct = Math.min(
          bounds.maxPercent,
          Math.max(bounds.minPercent, state.lastValidPercent)
        );
        const nextAmount = calc.round2((machine.cashPrice * pct) / 100);
        state.downPaymentRaw = String(nextAmount);
        els.downPaymentInput.value = state.downPaymentRaw;
        updateUI();
      }
    });

    els.modalityOptions.addEventListener('change', (event) => {
      if (event.target && event.target.name === 'modality') {
        state.modalityId = event.target.value;
        updateUI();
      }
    });

    els.paymentCountOptions.addEventListener('change', (event) => {
      if (event.target && event.target.name === 'paymentCount') {
        state.paymentCount = Number(event.target.value);
        updateUI();
      }
    });

    els.downPaymentInput.addEventListener('input', (event) => {
      state.downPaymentRaw = event.target.value;
      updateUI();
    });

    els.downPaymentSlider.addEventListener('input', (event) => {
      applyPercent(Number(event.target.value));
    });

    els.downPaymentPresets.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-percent]');
      if (!btn) return;
      applyPercent(Number(btn.dataset.percent));
    });

    els.fixDownPaymentBtn.addEventListener('click', () => {
      const suggested = Number.isFinite(config.downPayment.defaultPercent)
        ? config.downPayment.defaultPercent
        : 0;
      applyPercent(suggested);
      els.downPaymentInput.focus();
    });

    els.whatsappCta.addEventListener('click', (event) => {
      if (els.whatsappCta.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
      }
    });
  }

  initHeaderAndMeta();
  buildMachineOptions();
  buildModalityOptions();
  buildDownPaymentPresets();
  bindEvents();
  updateUI();
}(window));
