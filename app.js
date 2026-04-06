/* ===================================================================
   PromoFácil v2.0 Pro - Viabilidade Imobiliária SaaS
   Full Financial Engine + Charts + PDF + Risk + Comparison + Gantt
   =================================================================== */

const P = {
  currentProject: null,
  previousScreen: 'screen-dashboard',
  charts: {},

  // ===== MARKET BENCHMARKS (Portugal 2025) =====
  BENCHMARKS: {
    'Lisboa':  { price:5200, cost:1400, yield:4.2, roi:14 },
    'Porto':   { price:3600, cost:1100, yield:5.0, roi:17 },
    'Algarve': { price:4200, cost:1200, yield:5.8, roi:15 },
    'Setúbal': { price:3000, cost:950,  yield:5.5, roi:18 },
    'Braga':   { price:2400, cost:900,  yield:5.6, roi:19 },
    'Coimbra': { price:2200, cost:850,  yield:5.2, roi:17 },
    'Nacional':{ price:2800, cost:1000, yield:5.0, roi:16 }
  },

  // ===== RISK THRESHOLDS =====
  RISK: {
    roi:     { green:15, yellow:0 },
    roe:     { green:20, yellow:0 },
    ltv:     { green:60, yellow:80 },
    margin:  { green:15, yellow:5 },
    payback: { green:3,  yellow:5 },
    irr:     { green:12, yellow:6 }
  },

  // ===== INIT =====
  init() {
    const user = this.getUser();
    // Check for shared project in URL
    this.checkShareURL();
    if (user) this.showScreen('screen-dashboard');
    else this.showScreen('screen-splash');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    ['proj-impl-area','proj-floors-above','proj-floors-below'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.calcABC());
    });
  },

  // ===== NAVIGATION =====
  showScreen(id) {
    const current = document.querySelector('.screen.active');
    if (current) this.previousScreen = current.id;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    if (id === 'screen-dashboard') this.renderDashboard();
    if (id === 'screen-projects') this.renderProjects();
    if (id === 'screen-project-detail') this.renderProjectDetail();
    if (id === 'screen-analysis') this.renderAnalysis();
    if (id === 'screen-settings') this.renderSettings();
    if (id === 'screen-compare') this.renderCompareList();
    if (id === 'screen-new-project') this.resetNewProjectForm();
    window.scrollTo(0, 0);
  },

  goBack() { this.showScreen(this.previousScreen || 'screen-dashboard'); },

  switchTab(tabId, btn) {
    const parent = btn ? btn.closest('.screen') : null;
    const scope = parent || document;
    scope.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    scope.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const el = document.getElementById(tabId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
  },

  // ===== AUTH =====
  login(e) {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const email = document.getElementById('login-email').value.trim();
    const empresa = document.getElementById('login-empresa').value.trim();
    if (!name || !email) return;
    localStorage.setItem('pf_user', JSON.stringify({ name, email, empresa }));
    this.toast('Bem-vindo, ' + name + '!');
    this.showScreen('screen-dashboard');
  },

  logout() {
    if (confirm('Terminar sessão?')) {
      localStorage.removeItem('pf_user');
      this.showScreen('screen-splash');
    }
  },

  getUser() { try { return JSON.parse(localStorage.getItem('pf_user')); } catch { return null; } },

  // ===== DATA =====
  getData(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  getProjects() { return this.getData('pf_projects'); },
  saveProjects(d) { this.setData('pf_projects', d); },

  // ===== AUTO-CALC ABC =====
  calcABC() {
    const impl = parseFloat(document.getElementById('proj-impl-area')?.value) || 0;
    const above = parseInt(document.getElementById('proj-floors-above')?.value) || 0;
    const below = parseInt(document.getElementById('proj-floors-below')?.value) || 0;
    const abc = impl * (above + below);
    const el = document.getElementById('proj-abc');
    if (el) el.value = abc > 0 ? abc.toLocaleString('pt-PT') + ' m²' : '';
  },

  // ===== NEW PROJECT =====
  newProject() {
    document.getElementById('edit-project-id').value = '';
    document.getElementById('form-title').textContent = 'Novo Projeto';
    this.showScreen('screen-new-project');
  },

  resetNewProjectForm() {
    const editId = document.getElementById('edit-project-id').value;
    if (editId) return; // Don't reset if editing
    const form = document.querySelector('#screen-new-project form');
    if (form) form.reset();
    const defaults = {
      'proj-soft-pct':'12','proj-contingency':'5','proj-equity-pct':'40',
      'proj-interest':'4','proj-loan-term':'3','proj-vat':'23','proj-irc':'21',
      'proj-imt':'6.5','proj-imi':'0.3','proj-sales-fee':'5','proj-marketing':'1',
      'proj-build-months':'24','proj-licensing-months':'6','proj-sales-y1':'20',
      'proj-sales-y2':'40','proj-sales-y3':'30','proj-sales-y4':'10',
      'proj-discount-rate':'8','proj-appreciation':'2','proj-hotel-gop':'35',
      'proj-hotel-years':'10','proj-loan-type':'bullet'
    };
    Object.entries(defaults).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    // Clear tipologias
    ['apt','villa','comm','office'].forEach(t => {
      const rows = document.getElementById(t + '-tip-rows');
      if (rows) rows.innerHTML = '';
      const sec = document.getElementById(t + '-tip-section');
      if (sec) sec.style.display = 'none';
    });
    document.getElementById('validation-summary').style.display = 'none';
    document.getElementById('proj-abc').value = '';
  },

  // ===== TIPOLOGIAS =====
  toggleTip(type) {
    const sec = document.getElementById(type + '-tip-section');
    if (!sec) return;
    const isHidden = sec.style.display === 'none';
    sec.style.display = isHidden ? 'block' : 'none';
    if (isHidden && !sec.querySelector('.tip-row')) this.addTipRow(type);
  },

  addTipRow(type, data) {
    const container = document.getElementById(type + '-tip-rows');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'tip-row';
    const defaults = { apt: ['T0','T1','T2','T3','T4+'], villa: ['V3','V4','V5'], comm: ['Loja A','Loja B'], office: ['Sala A','Sala B'] };
    const existing = container.querySelectorAll('.tip-row').length;
    const label = data?.type || (defaults[type]?.[existing] || 'Tipo ' + (existing + 1));
    row.innerHTML = `
      <input type="text" value="${label}" placeholder="Tipo" class="tip-type">
      <input type="number" value="${data?.qty || ''}" placeholder="Qtd" class="tip-qty" min="0">
      <input type="number" value="${data?.area || ''}" placeholder="m²" class="tip-area" min="0">
      <input type="number" value="${data?.price || ''}" placeholder="€/m²" class="tip-price" min="0">
      <button type="button" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(row);
  },

  getTipologias(type) {
    const container = document.getElementById(type + '-tip-rows');
    if (!container) return [];
    const rows = container.querySelectorAll('.tip-row');
    const tips = [];
    rows.forEach(r => {
      const qty = parseInt(r.querySelector('.tip-qty')?.value) || 0;
      const area = parseFloat(r.querySelector('.tip-area')?.value) || 0;
      const price = parseFloat(r.querySelector('.tip-price')?.value) || 0;
      if (qty > 0) tips.push({ type: r.querySelector('.tip-type')?.value || '', qty, area, price });
    });
    return tips;
  },

  // ===== VALIDATION (Improvement #4) =====
  validateProject(p) {
    const warnings = [];
    if (p.equityPct < 20) warnings.push('Equity inferior a 20% — risco bancário elevado');
    if (p.cos > 1.5) warnings.push('COS superior a 1.5 — verificar limites legais do PDM');
    const salesSum = p.salesRhythm.reduce((a, b) => a + b, 0);
    if (Math.abs(salesSum - 100) > 1) warnings.push('Ritmo de vendas soma ' + salesSum + '% (deveria ser 100%)');
    if (p.buildCostSqm < 600) warnings.push('Custo de construção muito baixo — verificar realismo');
    if (p.buildCostSqm > 2500) warnings.push('Custo de construção muito elevado');
    if (p.interestRate > 8) warnings.push('Taxa de juro acima de 8% — confirmar condições bancárias');
    if (p.acquisitionCost <= 0) warnings.push('Custo de aquisição não definido');
    const abc = p.implArea * (p.floorsAbove + p.floorsBelow);
    if (abc <= 0) warnings.push('ABC é 0 — verificar área e pisos');
    return warnings;
  },

  // ===== SAVE PROJECT =====
  saveProject(e) {
    e.preventDefault();
    const v = id => document.getElementById(id)?.value?.trim() || '';
    const n = id => parseFloat(document.getElementById(id)?.value) || 0;
    const i = id => parseInt(document.getElementById(id)?.value) || 0;

    const editId = document.getElementById('edit-project-id').value;

    const project = {
      id: editId || 'proj_' + Date.now(),
      name: v('proj-name'), location: v('proj-location'), type: v('proj-type'),
      status: v('proj-status'), description: v('proj-desc'),
      acquisitionCost: n('proj-acquisition'), plotArea: n('proj-plot-area'),
      implArea: n('proj-impl-area'), cos: n('proj-cos'),
      floorsAbove: i('proj-floors-above'), floorsBelow: i('proj-floors-below'),
      units: {
        apartments: { qty: i('proj-apt-qty'), area: n('proj-apt-area'), price: n('proj-apt-price'), tipologias: this.getTipologias('apt') },
        villas: { qty: i('proj-villa-qty'), area: n('proj-villa-area'), price: n('proj-villa-price'), tipologias: this.getTipologias('villa') },
        commercial: { qty: i('proj-comm-qty'), area: n('proj-comm-area'), price: n('proj-comm-price'), tipologias: this.getTipologias('comm') },
        offices: { qty: i('proj-office-qty'), area: n('proj-office-area'), price: n('proj-office-price'), tipologias: this.getTipologias('office') },
        parking: { qty: i('proj-park-qty'), price: n('proj-park-price') },
        hotel: { qty: i('proj-hotel-qty'), adr: n('proj-hotel-adr'), occupancy: n('proj-hotel-occ'), gopMargin: n('proj-hotel-gop'), operYears: i('proj-hotel-years') }
      },
      buildCostSqm: n('proj-build-cost'), softPct: n('proj-soft-pct'),
      contingencyPct: n('proj-contingency'), exteriorCost: n('proj-exterior-cost'),
      decorationCost: n('proj-decoration'),
      loanType: v('proj-loan-type'), equityPct: n('proj-equity-pct'),
      interestRate: n('proj-interest'), loanTerm: i('proj-loan-term'),
      vatPct: n('proj-vat'), ircPct: n('proj-irc'), imtPct: n('proj-imt'),
      imiPct: n('proj-imi'), salesFeePct: n('proj-sales-fee'), marketingPct: n('proj-marketing'),
      licensingMonths: i('proj-licensing-months'), buildMonths: i('proj-build-months'),
      salesRhythm: [n('proj-sales-y1'), n('proj-sales-y2'), n('proj-sales-y3'), n('proj-sales-y4')],
      discountRate: n('proj-discount-rate'), appreciationRate: n('proj-appreciation'),
      createdAt: editId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validation
    const warnings = this.validateProject(project);
    if (warnings.length) {
      const box = document.getElementById('validation-summary');
      box.style.display = 'block';
      box.innerHTML = `<div class="validation-box warn"><strong>⚠️ Avisos (${warnings.length}):</strong><ul>${warnings.map(w => '<li>' + w + '</li>').join('')}</ul><p style="margin-top:.5rem;font-size:.82rem">O projeto será guardado mesmo assim.</p></div>`;
    }

    project.calc = this.calculate(project);

    const projects = this.getProjects();
    if (editId) {
      const idx = projects.findIndex(x => x.id === editId);
      if (idx >= 0) {
        project.createdAt = projects[idx].createdAt;
        projects[idx] = project;
      }
    } else {
      projects.unshift(project);
    }
    this.saveProjects(projects);
    this.toast(editId ? 'Projeto atualizado!' : 'Projeto criado!');
    this.currentProject = project.id;
    document.getElementById('edit-project-id').value = '';
    this.showScreen('screen-project-detail');
  },

  // ===== EDIT PROJECT (Improvement #1) =====
  editProject() {
    const p = this.getProjects().find(x => x.id === this.currentProject);
    if (!p) return;
    document.getElementById('edit-project-id').value = p.id;
    document.getElementById('form-title').textContent = 'Editar Projeto';
    this.showScreen('screen-new-project');
    // Populate form
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('proj-name', p.name); set('proj-location', p.location); set('proj-type', p.type);
    set('proj-status', p.status); set('proj-desc', p.description);
    set('proj-acquisition', p.acquisitionCost); set('proj-plot-area', p.plotArea);
    set('proj-impl-area', p.implArea); set('proj-cos', p.cos);
    set('proj-floors-above', p.floorsAbove); set('proj-floors-below', p.floorsBelow);
    set('proj-apt-qty', p.units.apartments.qty); set('proj-apt-area', p.units.apartments.area);
    set('proj-apt-price', p.units.apartments.price);
    set('proj-villa-qty', p.units.villas.qty); set('proj-villa-area', p.units.villas.area);
    set('proj-villa-price', p.units.villas.price);
    set('proj-comm-qty', p.units.commercial.qty); set('proj-comm-area', p.units.commercial.area);
    set('proj-comm-price', p.units.commercial.price);
    set('proj-office-qty', p.units.offices.qty); set('proj-office-area', p.units.offices.area);
    set('proj-office-price', p.units.offices.price);
    set('proj-park-qty', p.units.parking.qty); set('proj-park-price', p.units.parking.price);
    set('proj-hotel-qty', p.units.hotel.qty); set('proj-hotel-adr', p.units.hotel.adr);
    set('proj-hotel-occ', p.units.hotel.occupancy);
    set('proj-hotel-gop', p.units.hotel.gopMargin || 35);
    set('proj-hotel-years', p.units.hotel.operYears || 10);
    set('proj-build-cost', p.buildCostSqm); set('proj-soft-pct', p.softPct);
    set('proj-contingency', p.contingencyPct); set('proj-exterior-cost', p.exteriorCost);
    set('proj-decoration', p.decorationCost);
    set('proj-loan-type', p.loanType || 'bullet'); set('proj-equity-pct', p.equityPct);
    set('proj-interest', p.interestRate); set('proj-loan-term', p.loanTerm);
    set('proj-vat', p.vatPct); set('proj-irc', p.ircPct); set('proj-imt', p.imtPct);
    set('proj-imi', p.imiPct); set('proj-sales-fee', p.salesFeePct); set('proj-marketing', p.marketingPct);
    set('proj-licensing-months', p.licensingMonths || 6); set('proj-build-months', p.buildMonths);
    set('proj-sales-y1', p.salesRhythm[0]); set('proj-sales-y2', p.salesRhythm[1]);
    set('proj-sales-y3', p.salesRhythm[2]); set('proj-sales-y4', p.salesRhythm[3]);
    set('proj-discount-rate', p.discountRate); set('proj-appreciation', p.appreciationRate);
    this.calcABC();
    // Populate tipologias
    ['apt','villa','comm','office'].forEach(type => {
      const key = { apt:'apartments', villa:'villas', comm:'commercial', office:'offices' }[type];
      const tips = p.units[key]?.tipologias || [];
      const rows = document.getElementById(type + '-tip-rows');
      const sec = document.getElementById(type + '-tip-section');
      if (rows) rows.innerHTML = '';
      if (tips.length) {
        if (sec) sec.style.display = 'block';
        tips.forEach(t => this.addTipRow(type, t));
      } else {
        if (sec) sec.style.display = 'none';
      }
    });
  },

  // ===== DUPLICATE PROJECT (Improvement #2) =====
  duplicateProject() {
    const p = this.getProjects().find(x => x.id === this.currentProject);
    if (!p) return;
    const clone = JSON.parse(JSON.stringify(p));
    clone.id = 'proj_' + Date.now();
    clone.name = p.name + ' (Cópia)';
    clone.createdAt = new Date().toISOString();
    clone.updatedAt = new Date().toISOString();
    const projects = this.getProjects();
    projects.unshift(clone);
    this.saveProjects(projects);
    this.currentProject = clone.id;
    this.toast('Projeto duplicado!');
    this.showScreen('screen-project-detail');
  },

  // ===== DELETE =====
  deleteProject() {
    if (!confirm('Eliminar este projeto?')) return;
    this.saveProjects(this.getProjects().filter(p => p.id !== this.currentProject));
    this.toast('Projeto eliminado');
    this.showScreen('screen-projects');
  },

  // ===== FINANCIAL ENGINE =====
  calculate(p) {
    const c = {};

    // 1. AREAS
    c.abc = p.implArea * (p.floorsAbove + p.floorsBelow);

    // Calculate from tipologias if available
    const calcUnitRevenue = (unit) => {
      if (unit.tipologias && unit.tipologias.length > 0) {
        let totalQty = 0, totalArea = 0, totalRev = 0;
        unit.tipologias.forEach(t => {
          totalQty += t.qty;
          totalArea += t.qty * t.area;
          totalRev += t.qty * t.area * t.price;
        });
        return { qty: totalQty, area: totalArea, revenue: totalRev };
      }
      return {
        qty: unit.qty || 0,
        area: (unit.qty || 0) * (unit.area || 0),
        revenue: (unit.qty || 0) * (unit.area || 0) * (unit.price || 0)
      };
    };

    const apt = calcUnitRevenue(p.units.apartments);
    const vil = calcUnitRevenue(p.units.villas);
    const com = calcUnitRevenue(p.units.commercial);
    const off = calcUnitRevenue(p.units.offices);

    c.sellableArea = apt.area + vil.area + com.area + off.area;
    c.totalUnits = apt.qty + vil.qty + com.qty + off.qty + (p.units.parking.qty || 0) + (p.units.hotel.qty || 0);
    c.sellableRatio = c.abc > 0 ? (c.sellableArea / c.abc) * 100 : 0;

    // 2. HARD COSTS
    c.hardCostBase = c.abc * p.buildCostSqm;
    c.exteriorCosts = Math.max(0, (p.plotArea - p.implArea) * p.exteriorCost);
    c.decorationCosts = c.sellableArea * p.decorationCost;
    c.hardCostSubtotal = c.hardCostBase + c.exteriorCosts + c.decorationCosts;
    c.contingency = c.hardCostSubtotal * (p.contingencyPct / 100);
    c.hardCostTotal = c.hardCostSubtotal + c.contingency;
    c.hardCostVAT = c.hardCostTotal * (p.vatPct / 100);
    c.hardCostWithVAT = c.hardCostTotal + c.hardCostVAT;

    // 3. SOFT COSTS
    c.softCostBase = c.hardCostTotal * (p.softPct / 100);
    c.softCostVAT = c.softCostBase * (p.vatPct / 100);
    c.softCostWithVAT = c.softCostBase + c.softCostVAT;

    // 4. ACQUISITION
    c.imtCost = p.acquisitionCost * (p.imtPct / 100);
    c.stampTax = p.acquisitionCost * 0.008;
    c.acquisitionTotal = p.acquisitionCost + c.imtCost + c.stampTax;

    // 5. TOTAL INVESTMENT
    c.totalInvestment = c.acquisitionTotal + c.hardCostWithVAT + c.softCostWithVAT;

    // 6. REVENUE
    c.revenueApartments = apt.revenue;
    c.revenueVillas = vil.revenue;
    c.revenueCommercial = com.revenue;
    c.revenueOffices = off.revenue;
    c.revenueParking = (p.units.parking.qty || 0) * (p.units.parking.price || 0);

    // Hotel
    const hotelU = p.units.hotel;
    const hotelYears = hotelU.operYears || p.loanTerm || 1;
    c.hotelAnnualRevenue = (hotelU.qty || 0) * (hotelU.adr || 0) * 365 * ((hotelU.occupancy || 0) / 100);
    c.revenueHotel = c.hotelAnnualRevenue * hotelYears;
    c.revPAR = (hotelU.adr || 0) * ((hotelU.occupancy || 0) / 100);
    c.hotelGOP = c.hotelAnnualRevenue * ((hotelU.gopMargin || 35) / 100);
    c.hotelEBITDAperRoom = hotelU.qty > 0 ? c.hotelGOP / hotelU.qty : 0;
    c.hotelYield = c.totalInvestment > 0 && c.hotelAnnualRevenue > 0 ? (c.hotelAnnualRevenue / c.totalInvestment) * 100 : 0;

    c.grossRevenue = c.revenueApartments + c.revenueVillas + c.revenueCommercial +
      c.revenueOffices + c.revenueParking + c.revenueHotel;

    // 7. SALES COSTS
    c.salesFees = c.grossRevenue * (p.salesFeePct / 100);
    c.marketingCosts = c.grossRevenue * (p.marketingPct / 100);
    c.totalSalesCosts = c.salesFees + c.marketingCosts;

    // 8. FINANCING
    c.equityAmount = c.totalInvestment * (p.equityPct / 100);
    c.debtAmount = c.totalInvestment - c.equityAmount;
    c.annualInterest = c.debtAmount * (p.interestRate / 100);
    c.totalInterest = c.annualInterest * (p.loanTerm || 1);
    c.debtService = c.debtAmount + c.totalInterest;

    // Amortization schedule
    c.amortization = this.buildAmortization(p, c);

    // 9. PROFIT
    c.grossProfit = c.grossRevenue - c.totalInvestment;
    c.grossMarginPct = c.grossRevenue > 0 ? (c.grossProfit / c.grossRevenue) * 100 : 0;
    c.profitBeforeTax = c.grossProfit - c.totalSalesCosts - c.totalInterest;
    c.ircTax = c.profitBeforeTax > 0 ? c.profitBeforeTax * (p.ircPct / 100) : 0;
    c.netProfit = c.profitBeforeTax - c.ircTax;
    c.netMarginPct = c.grossRevenue > 0 ? (c.netProfit / c.grossRevenue) * 100 : 0;

    // 10. RATIOS
    c.roi = c.totalInvestment > 0 ? (c.netProfit / c.totalInvestment) * 100 : 0;
    c.roe = c.equityAmount > 0 ? (c.netProfit / c.equityAmount) * 100 : 0;
    c.equityMultiple = c.equityAmount > 0 ? (c.equityAmount + c.netProfit) / c.equityAmount : 0;
    c.profitPerSqm = c.sellableArea > 0 ? c.netProfit / c.sellableArea : 0;
    c.costPerSqm = c.abc > 0 ? c.totalInvestment / c.abc : 0;
    c.revenuePerSqm = c.sellableArea > 0 ? c.grossRevenue / c.sellableArea : 0;
    c.ltv = c.grossRevenue > 0 ? (c.debtAmount / c.grossRevenue) * 100 : 0;
    c.ltc = c.totalInvestment > 0 ? (c.debtAmount / c.totalInvestment) * 100 : 0;

    // 11. CASH FLOWS
    c.cashFlows = this.buildCashFlows(p, c);
    c.irr = this.calcIRR(c.cashFlows.netCFs);
    c.npv = this.calcNPV(c.cashFlows.netCFs, p.discountRate / 100);
    c.paybackPeriod = this.calcPayback(c.cashFlows.netCFs);

    return c;
  },

  // ===== AMORTIZATION TABLE (Improvement #15) =====
  buildAmortization(p, c) {
    const years = p.loanTerm || 1;
    const debt = c.debtAmount;
    const rate = p.interestRate / 100;
    const type = p.loanType || 'bullet';
    const schedule = [];
    let balance = debt;

    for (let y = 1; y <= years; y++) {
      const interest = balance * rate;
      let principal = 0;
      if (type === 'amortizing') {
        principal = debt / years;
      } else if (type === 'bullet' && y === years) {
        principal = debt;
      }
      // interest-only: principal=0 throughout
      const payment = interest + principal;
      balance = Math.max(0, balance - principal);
      schedule.push({ year: y, opening: balance + principal, interest, principal, payment, closing: balance });
    }
    return schedule;
  },

  // ===== CASH FLOW BUILDER =====
  buildCashFlows(p, c) {
    const years = Math.max(p.loanTerm || 3, Math.ceil(p.buildMonths / 12) + 2);
    const buildYears = Math.ceil(p.buildMonths / 12);
    const costs = [], revenues = [], netCFs = [];

    for (let y = 0; y < years; y++) {
      let costY = 0, revY = 0;
      if (y < buildYears) {
        const pct = y === 0 ? 0.7 : (buildYears > 1 ? 0.3 / (buildYears - 1) : 0);
        costY += (c.hardCostWithVAT + c.softCostWithVAT) * pct;
      }
      if (y === 0) costY += c.acquisitionTotal;
      if (y < p.loanTerm) costY += c.annualInterest;
      const rhythm = p.salesRhythm;
      if (y < rhythm.length) {
        const appreciationFactor = Math.pow(1 + (p.appreciationRate / 100), y);
        revY = c.grossRevenue * (rhythm[y] / 100) * appreciationFactor;
        revY -= revY * ((p.salesFeePct + p.marketingPct) / 100);
      }
      costs.push(costY);
      revenues.push(revY);
      netCFs.push(revY - costY);
    }
    return { costs, revenues, netCFs, years };
  },

  // ===== IRR (Newton-Raphson) =====
  calcIRR(cashFlows, guess = 0.1) {
    if (!cashFlows || cashFlows.length < 2) return 0;
    if (!cashFlows.some(v => v < 0) || !cashFlows.some(v => v > 0)) return 0;
    let rate = guess;
    for (let i = 0; i < 1000; i++) {
      let npv = 0, dnpv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        const denom = Math.pow(1 + rate, t);
        if (denom === 0) return 0;
        npv += cashFlows[t] / denom;
        dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const newRate = rate - npv / dnpv;
      if (Math.abs(newRate - rate) < 1e-8) return newRate * 100;
      rate = newRate;
      if (rate < -1 || rate > 100) return 0;
    }
    return rate * 100;
  },

  calcNPV(cashFlows, rate) {
    if (!cashFlows || !rate) return 0;
    return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
  },

  calcPayback(cashFlows) {
    if (!cashFlows) return 0;
    let cum = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      cum += cashFlows[t];
      if (cum >= 0) {
        const prev = cum - cashFlows[t];
        return cashFlows[t] > 0 ? t + (-prev / cashFlows[t]) : t;
      }
    }
    return cashFlows.length;
  },

  // ===== SENSITIVITY ANALYSIS =====
  runSensitivity(projectId) {
    const proj = this.getProjects().find(x => x.id === projectId);
    if (!proj) return;
    const worst = parseFloat(document.getElementById('cen-worst')?.value) || -15;
    const bau = parseFloat(document.getElementById('cen-bau')?.value) || 0;
    const best = parseFloat(document.getElementById('cen-best')?.value) || 15;

    const scenarios = [
      { name: 'Pessimista', pct: worst, css: 'worst' },
      { name: 'Base (BAU)', pct: bau, css: 'bau' },
      { name: 'Otimista', pct: best, css: 'best' }
    ];

    const results = scenarios.map(s => {
      const clone = JSON.parse(JSON.stringify(proj));
      const f = 1 + (s.pct / 100);
      clone.units.apartments.price *= f;
      clone.units.villas.price *= f;
      clone.units.commercial.price *= f;
      clone.units.offices.price *= f;
      clone.units.parking.price *= f;
      if (clone.units.apartments.tipologias) clone.units.apartments.tipologias.forEach(t => t.price *= f);
      if (clone.units.villas.tipologias) clone.units.villas.tipologias.forEach(t => t.price *= f);
      if (clone.units.commercial.tipologias) clone.units.commercial.tipologias.forEach(t => t.price *= f);
      if (clone.units.offices.tipologias) clone.units.offices.tipologias.forEach(t => t.price *= f);
      delete clone.calc;
      return { ...s, calc: this.calculate(clone) };
    });

    document.getElementById('cenarios-result').innerHTML = results.map(r => `
      <div class="scenario-card ${r.css}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
          <h3 style="font-size:1.05rem;font-weight:700">${r.name}</h3>
          <span class="card-badge badge-${r.css === 'worst' ? 'red' : r.css === 'best' ? 'green' : 'navy'}">${r.pct > 0 ? '+' : ''}${r.pct}%</span>
        </div>
        <div class="cost-row"><span class="cost-label">Receita Bruta</span><span class="cost-value">${this.fmt(r.calc.grossRevenue)}</span></div>
        <div class="cost-row"><span class="cost-label">Lucro Líquido</span><span class="cost-value" style="color:${r.calc.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${this.fmt(r.calc.netProfit)}</span></div>
        <div class="cost-row"><span class="cost-label">Margem</span><span class="cost-value">${r.calc.netMarginPct.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">ROI</span><span class="cost-value">${r.calc.roi.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">ROE</span><span class="cost-value">${r.calc.roe.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">TIR</span><span class="cost-value">${r.calc.irr.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">VAL</span><span class="cost-value">${this.fmt(r.calc.npv)}</span></div>
        <div class="cost-row"><span class="cost-label">Equity Multiple</span><span class="cost-value">${r.calc.equityMultiple.toFixed(2)}x</span></div>
      </div>`).join('');
  },

  // ===== BREAK-EVEN (Improvement #9) =====
  calcBreakEven() {
    const proj = this.getProjects().find(x => x.id === this.currentProject);
    if (!proj) return;
    let lo = -0.99, hi = 0, mid;
    // Binary search for factor where netProfit ~= 0
    for (let i = 0; i < 100; i++) {
      mid = (lo + hi) / 2;
      const clone = JSON.parse(JSON.stringify(proj));
      const f = 1 + mid;
      clone.units.apartments.price *= f;
      clone.units.villas.price *= f;
      clone.units.commercial.price *= f;
      clone.units.offices.price *= f;
      clone.units.parking.price *= f;
      if (clone.units.apartments.tipologias) clone.units.apartments.tipologias.forEach(t => t.price *= f);
      if (clone.units.villas.tipologias) clone.units.villas.tipologias.forEach(t => t.price *= f);
      if (clone.units.commercial.tipologias) clone.units.commercial.tipologias.forEach(t => t.price *= f);
      if (clone.units.offices.tipologias) clone.units.offices.tipologias.forEach(t => t.price *= f);
      delete clone.calc;
      const calc = this.calculate(clone);
      if (calc.netProfit > 0) hi = mid;
      else lo = mid;
    }
    const breakEvenPct = (mid * 100).toFixed(1);
    const avgPrice = proj.calc?.revenuePerSqm || 0;
    const bePrice = avgPrice * (1 + mid);

    document.getElementById('breakeven-result').innerHTML = `
      <div class="breakeven-card">
        <div class="breakeven-value">${this.fmt(bePrice)}/m²</div>
        <div class="breakeven-label">Preço Mínimo de Venda</div>
        <div style="margin-top:.8rem;font-size:.88rem;color:var(--text-2)">
          Variação: <strong>${breakEvenPct}%</strong> face ao preço atual (${this.fmt(avgPrice)}/m²)
        </div>
        <div style="margin-top:.5rem;font-size:.82rem;color:var(--text-3)">
          Abaixo deste preço, o projeto torna-se inviável
        </div>
      </div>`;
  },

  // ===== RISK DASHBOARD (Improvement #16) =====
  getRiskColor(metric, value) {
    const t = this.RISK[metric];
    if (!t) return 'yellow';
    if (metric === 'ltv' || metric === 'payback') {
      // Inverted: lower is better
      if (value <= t.green) return 'green';
      if (value <= t.yellow) return 'yellow';
      return 'red';
    }
    if (value >= t.green) return 'green';
    if (value >= t.yellow) return 'yellow';
    return 'red';
  },

  // ===== RENDER DASHBOARD =====
  renderDashboard() {
    const user = this.getUser();
    document.getElementById('dash-user').textContent = user ? (user.empresa || user.name) : '';
    const projects = this.getProjects();
    let totalInv = 0, totalProfit = 0, totalROI = 0;
    projects.forEach(p => { if (p.calc) { totalInv += p.calc.totalInvestment; totalProfit += p.calc.netProfit; totalROI += p.calc.roi; } });
    const avgROI = projects.length > 0 ? totalROI / projects.length : 0;
    document.getElementById('stat-projetos').textContent = projects.length;
    document.getElementById('stat-investimento').textContent = this.fmtShort(totalInv);
    document.getElementById('stat-lucro').textContent = this.fmtShort(totalProfit);
    document.getElementById('stat-roi').textContent = avgROI.toFixed(1) + '%';

    const container = document.getElementById('dash-projects');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏗️</div><h3>Sem projetos</h3><p>Crie o primeiro estudo de viabilidade</p></div>';
      document.getElementById('dash-chart-wrap').style.display = 'none';
      return;
    }
    container.innerHTML = projects.slice(0, 5).map(p => this.renderProjectCard(p)).join('');

    // Dashboard chart
    if (projects.length >= 1 && typeof Chart !== 'undefined') {
      document.getElementById('dash-chart-wrap').style.display = 'block';
      this.renderDashChart(projects);
    }
  },

  renderDashChart(projects) {
    const ctx = document.getElementById('chart-dash');
    if (!ctx) return;
    if (this.charts.dash) this.charts.dash.destroy();
    const labels = projects.slice(0, 8).map(p => p.name.substring(0, 15));
    this.charts.dash = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Investimento', data: projects.slice(0, 8).map(p => (p.calc?.totalInvestment || 0) / 1e6), backgroundColor: 'rgba(30,58,95,0.7)' },
          { label: 'Receita', data: projects.slice(0, 8).map(p => (p.calc?.grossRevenue || 0) / 1e6), backgroundColor: 'rgba(212,165,116,0.7)' },
          { label: 'Lucro', data: projects.slice(0, 8).map(p => (p.calc?.netProfit || 0) / 1e6), backgroundColor: projects.slice(0, 8).map(p => (p.calc?.netProfit || 0) >= 0 ? 'rgba(22,163,74,0.7)' : 'rgba(220,38,38,0.7)') }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: v => v + 'M€' } } } }
    });
  },

  renderProjectCard(p) {
    const c = p.calc || {};
    const profitColor = (c.netProfit || 0) >= 0 ? 'green' : 'red';
    const statusBadge = p.status ? `<span class="card-badge badge-navy">${this.esc(p.status)}</span>` : '';
    return `
      <div class="card-item ${profitColor}-border" onclick="P.openProject('${p.id}')">
        <div class="card-header">
          <div class="card-title">${this.esc(p.name)}</div>
          <span class="card-badge badge-${profitColor}">${(c.roi || 0).toFixed(1)}% ROI</span>
        </div>
        <div class="card-sub">${this.esc(p.type)} ${p.location ? '• ' + this.esc(p.location) : ''} ${statusBadge}</div>
        <div class="card-meta">💰 ${this.fmtShort(c.totalInvestment || 0)} 📈 ${this.fmtShort(c.grossRevenue || 0)} 💵 ${this.fmtShort(c.netProfit || 0)} 🏠 ${c.totalUnits || 0} un.</div>
      </div>`;
  },

  // ===== RENDER PROJECTS =====
  renderProjects() {
    let projects = this.getProjects();
    const search = (document.getElementById('projects-search')?.value || '').toLowerCase();
    if (search) projects = projects.filter(p => p.name.toLowerCase().includes(search) || (p.location || '').toLowerCase().includes(search) || (p.type || '').toLowerCase().includes(search));
    const container = document.getElementById('projects-list');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏢</div><h3>Sem projetos</h3><p>Crie o primeiro projeto</p></div>';
      return;
    }
    container.innerHTML = projects.map(p => this.renderProjectCard(p)).join('');
  },

  openProject(id) { this.currentProject = id; this.showScreen('screen-project-detail'); },

  // ===== RENDER PROJECT DETAIL =====
  renderProjectDetail() {
    const projects = this.getProjects();
    const p = projects.find(x => x.id === this.currentProject);
    if (!p) return;
    // Recalculate with v2 engine to ensure all fields exist
    p.calc = this.calculate(p);
    this.saveProjects(projects);
    const c = p.calc;

    document.getElementById('proj-detail-title').textContent = p.name;
    document.getElementById('proj-detail-hero').innerHTML = `
      <h2>🏗️ ${this.esc(p.name)}</h2>
      <div class="meta">
        <span>📍 ${this.esc(p.location || 'N/A')}</span><span>🏢 ${this.esc(p.type)}</span>
        <span>📐 ${c.abc.toLocaleString('pt-PT')} m² ABC</span><span>🏠 ${c.totalUnits} un.</span>
        ${p.status ? '<span>📋 ' + this.esc(p.status) + '</span>' : ''}
      </div>`;

    // TAB 1: RESUMO + RISK DASHBOARD
    const viability = c.netProfit >= 0 ? '✅ VIÁVEL' : '❌ INVIÁVEL';
    const viabilityClass = c.netProfit >= 0 ? 'positive' : 'negative';
    const riskMetrics = [
      { key: 'roi', label: 'ROI', value: c.roi, display: c.roi.toFixed(1) + '%' },
      { key: 'roe', label: 'ROE', value: c.roe, display: c.roe.toFixed(1) + '%' },
      { key: 'ltv', label: 'LTV', value: c.ltv, display: c.ltv.toFixed(1) + '%' },
      { key: 'margin', label: 'Margem', value: c.netMarginPct, display: c.netMarginPct.toFixed(1) + '%' },
      { key: 'payback', label: 'Payback', value: c.paybackPeriod, display: c.paybackPeriod.toFixed(1) + 'a' },
      { key: 'irr', label: 'TIR', value: c.irr, display: c.irr.toFixed(1) + '%' }
    ];

    document.getElementById('ptab-resumo').innerHTML = `
      <div style="text-align:center;padding:1rem;margin:1rem 1.25rem;background:${c.netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'};border-radius:var(--radius);font-size:1.3rem;font-weight:800;color:${c.netProfit >= 0 ? 'var(--green-dark)' : 'var(--red)'}">
        ${viability}
      </div>
      <h3 style="padding:0 1.25rem;font-size:.95rem;font-weight:700;color:var(--navy);margin-bottom:.5rem">🚦 Painel de Risco</h3>
      <div class="risk-grid">
        ${riskMetrics.map(m => `<div class="risk-item"><div class="risk-dot ${this.getRiskColor(m.key, m.value)}"></div><div class="risk-value">${m.display}</div><div class="risk-label">${m.label}</div></div>`).join('')}
      </div>
      <div class="kpi-grid" style="padding-top:0">
        <div class="kpi-card ${viabilityClass}"><div class="kpi-value">${this.fmt(c.netProfit)}</div><div class="kpi-label">Lucro Líquido</div></div>
        <div class="kpi-card ${viabilityClass}"><div class="kpi-value">${c.roi.toFixed(1)}%</div><div class="kpi-label">ROI</div></div>
        <div class="kpi-card ${viabilityClass}"><div class="kpi-value">${c.roe.toFixed(1)}%</div><div class="kpi-label">ROE</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.irr.toFixed(1)}%</div><div class="kpi-label">TIR (IRR)</div></div>
        <div class="kpi-card"><div class="kpi-value">${this.fmt(c.npv)}</div><div class="kpi-label">VAL (NPV)</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.equityMultiple.toFixed(2)}x</div><div class="kpi-label">Equity Multiple</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.grossMarginPct.toFixed(1)}%</div><div class="kpi-label">Margem Bruta</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.netMarginPct.toFixed(1)}%</div><div class="kpi-label">Margem Líquida</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.paybackPeriod.toFixed(1)} anos</div><div class="kpi-label">Payback</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.ltv.toFixed(1)}%</div><div class="kpi-label">LTV</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.ltc.toFixed(1)}%</div><div class="kpi-label">LTC</div></div>
        <div class="kpi-card"><div class="kpi-value">${this.fmt(c.profitPerSqm)}/m²</div><div class="kpi-label">Lucro/m² Vendável</div></div>
      </div>
      ${c.hotelAnnualRevenue > 0 ? `
      <h3 style="padding:0 1.25rem;font-size:.95rem;font-weight:700;color:var(--navy);margin:.5rem 0">🏨 KPIs Hotel</h3>
      <div class="kpi-grid" style="padding-top:0">
        <div class="kpi-card"><div class="kpi-value">${this.fmt(c.revPAR)}</div><div class="kpi-label">RevPAR</div></div>
        <div class="kpi-card"><div class="kpi-value">${this.fmt(c.hotelGOP)}</div><div class="kpi-label">GOP Anual</div></div>
        <div class="kpi-card"><div class="kpi-value">${this.fmt(c.hotelEBITDAperRoom)}</div><div class="kpi-label">EBITDA/Quarto</div></div>
        <div class="kpi-card"><div class="kpi-value">${c.hotelYield.toFixed(1)}%</div><div class="kpi-label">Yield</div></div>
      </div>` : ''}
      <div style="padding:0 1.25rem 1rem">
        <div class="cost-row subtotal"><span class="cost-label">Investimento Total</span><span class="cost-value">${this.fmt(c.totalInvestment)}</span></div>
        <div class="cost-row subtotal"><span class="cost-label">Receita Bruta</span><span class="cost-value">${this.fmt(c.grossRevenue)}</span></div>
        <div class="cost-row total"><span class="cost-label">Lucro Líquido</span><span class="cost-value" style="color:${c.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${this.fmt(c.netProfit)}</span></div>
      </div>`;

    // TAB 2: CUSTOS (same as v1 with minor improvements)
    document.getElementById('ptab-custos').innerHTML = `
      <div style="padding:0 1rem 1rem">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--navy)">🏗️ Hard Costs</h3>
        <div class="cost-row"><span class="cost-label">Construção Base (${c.abc.toLocaleString('pt-PT')} m² × ${this.fmt(p.buildCostSqm)}/m²)</span><span class="cost-value">${this.fmt(c.hardCostBase)}</span></div>
        <div class="cost-row"><span class="cost-label">Arranjos Exteriores</span><span class="cost-value">${this.fmt(c.exteriorCosts)}</span></div>
        <div class="cost-row"><span class="cost-label">Decoração</span><span class="cost-value">${this.fmt(c.decorationCosts)}</span></div>
        <div class="cost-row"><span class="cost-label">Contingência (${p.contingencyPct}%)</span><span class="cost-value">${this.fmt(c.contingency)}</span></div>
        <div class="cost-row subtotal"><span class="cost-label">Subtotal s/ IVA</span><span class="cost-value">${this.fmt(c.hardCostTotal)}</span></div>
        <div class="cost-row"><span class="cost-label">IVA (${p.vatPct}%)</span><span class="cost-value">${this.fmt(c.hardCostVAT)}</span></div>
        <div class="cost-row total"><span class="cost-label">Hard Costs c/ IVA</span><span class="cost-value">${this.fmt(c.hardCostWithVAT)}</span></div>
        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📋 Soft Costs</h3>
        <div class="cost-row"><span class="cost-label">Projetos (${p.softPct}% Hard)</span><span class="cost-value">${this.fmt(c.softCostBase)}</span></div>
        <div class="cost-row"><span class="cost-label">IVA (${p.vatPct}%)</span><span class="cost-value">${this.fmt(c.softCostVAT)}</span></div>
        <div class="cost-row total"><span class="cost-label">Soft Costs c/ IVA</span><span class="cost-value">${this.fmt(c.softCostWithVAT)}</span></div>
        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">🏠 Aquisição</h3>
        <div class="cost-row"><span class="cost-label">Terreno</span><span class="cost-value">${this.fmt(p.acquisitionCost)}</span></div>
        <div class="cost-row"><span class="cost-label">IMT (${p.imtPct}%)</span><span class="cost-value">${this.fmt(c.imtCost)}</span></div>
        <div class="cost-row"><span class="cost-label">Imposto Selo (0.8%)</span><span class="cost-value">${this.fmt(c.stampTax)}</span></div>
        <div class="cost-row total"><span class="cost-label">Total Aquisição</span><span class="cost-value">${this.fmt(c.acquisitionTotal)}</span></div>
        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">💰 Financiamento</h3>
        <div class="cost-row"><span class="cost-label">Equity (${p.equityPct}%)</span><span class="cost-value">${this.fmt(c.equityAmount)}</span></div>
        <div class="cost-row"><span class="cost-label">Dívida (${(100 - p.equityPct).toFixed(0)}%)</span><span class="cost-value">${this.fmt(c.debtAmount)}</span></div>
        <div class="cost-row"><span class="cost-label">Juros Total (${p.loanTerm}a @ ${p.interestRate}%)</span><span class="cost-value">${this.fmt(c.totalInterest)}</span></div>
        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📊 Custos Venda & Impostos</h3>
        <div class="cost-row"><span class="cost-label">Comissão (${p.salesFeePct}%)</span><span class="cost-value">${this.fmt(c.salesFees)}</span></div>
        <div class="cost-row"><span class="cost-label">Marketing (${p.marketingPct}%)</span><span class="cost-value">${this.fmt(c.marketingCosts)}</span></div>
        <div class="cost-row"><span class="cost-label">IRC (${p.ircPct}%)</span><span class="cost-value">${this.fmt(c.ircTax)}</span></div>
        <div class="cost-row total" style="margin-top:1rem;font-size:1.1rem"><span class="cost-label">INVESTIMENTO TOTAL</span><span class="cost-value">${this.fmt(c.totalInvestment)}</span></div>
        <div class="cost-row" style="font-size:.82rem"><span class="cost-label">Custo/m² ABC</span><span class="cost-value">${this.fmt(c.costPerSqm)}/m²</span></div>
      </div>`;

    // TAB 3: RECEITAS
    const unitTypes = [
      { key: 'apartments', label: '🏢 Apartamentos', rev: c.revenueApartments, u: p.units.apartments },
      { key: 'villas', label: '🏠 Moradias', rev: c.revenueVillas, u: p.units.villas },
      { key: 'commercial', label: '🏪 Comércio', rev: c.revenueCommercial, u: p.units.commercial },
      { key: 'offices', label: '🏢 Escritórios', rev: c.revenueOffices, u: p.units.offices },
      { key: 'parking', label: '🅿️ Estacionamento', rev: c.revenueParking, u: p.units.parking },
      { key: 'hotel', label: '🏨 Hotel', rev: c.revenueHotel, u: p.units.hotel }
    ].filter(t => t.rev > 0);

    document.getElementById('ptab-receitas').innerHTML = `
      <div style="padding:1rem">
        <div class="chart-container" style="margin:0 0 1rem"><canvas id="chart-revenue"></canvas></div>
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--navy)">💰 Receitas por Tipo</h3>
        ${unitTypes.map(t => {
          const pctOfTotal = c.grossRevenue > 0 ? ((t.rev / c.grossRevenue) * 100).toFixed(1) : 0;
          const tips = t.u.tipologias && t.u.tipologias.length > 0 ? t.u.tipologias : null;
          return `
          <div class="card-item gold-border" style="cursor:default;margin-bottom:.8rem">
            <div class="card-header"><div class="card-title">${t.label}</div><span class="card-badge badge-gold">${pctOfTotal}%</span></div>
            ${tips ? tips.map(tp => `<div class="cost-row" style="padding:6px 0"><span class="cost-label">${this.esc(tp.type)} (${tp.qty} × ${tp.area}m² × ${this.fmt(tp.price)}/m²)</span><span class="cost-value">${this.fmt(tp.qty * tp.area * tp.price)}</span></div>`).join('') : `
            <div class="card-meta">${t.u.qty} un. ${t.u.area ? t.u.area + ' m²/un.' : ''} ${t.u.price ? this.fmt(t.u.price) + '/m²' : ''} ${t.u.adr ? 'ADR: ' + this.fmt(t.u.adr) : ''}</div>`}
            <div class="cost-row total" style="margin-top:.5rem"><span class="cost-label">Receita</span><span class="cost-value" style="color:var(--green)">${this.fmt(t.rev)}</span></div>
          </div>`;
        }).join('')}
        <div class="cost-row total" style="font-size:1.1rem"><span class="cost-label">RECEITA BRUTA TOTAL</span><span class="cost-value" style="color:var(--green)">${this.fmt(c.grossRevenue)}</span></div>
        <div class="cost-row"><span class="cost-label">Receita/m² Vendável</span><span class="cost-value">${this.fmt(c.revenuePerSqm)}/m²</span></div>
        <div class="cost-row"><span class="cost-label">Área Vendável</span><span class="cost-value">${c.sellableArea.toLocaleString('pt-PT')} m² (${c.sellableRatio.toFixed(0)}% ABC)</span></div>
      </div>`;

    // Revenue chart
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;
      const ctx = document.getElementById('chart-revenue');
      if (!ctx) return;
      if (this.charts.revenue) this.charts.revenue.destroy();
      const revData = unitTypes.map(t => t.rev);
      const revLabels = unitTypes.map(t => t.label.replace(/^.+\s/, ''));
      this.charts.revenue = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: revLabels, datasets: [{ data: revData, backgroundColor: ['#1e3a5f','#d4a574','#16a34a','#2563eb','#7c3aed','#ea580c'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
      });
    }, 100);

    // TAB 4: CASH FLOW
    const cf = c.cashFlows;
    let cumCF = 0;
    const maxAbs = Math.max(...cf.netCFs.map(v => Math.abs(v)), 1);
    document.getElementById('ptab-cashflow').innerHTML = `
      <div style="padding:1rem"><div class="chart-container" style="margin:0 0 1rem"><canvas id="chart-cf"></canvas></div></div>
      <div class="cf-timeline">
        ${cf.netCFs.map((v, i) => {
          cumCF += v;
          const barPct = Math.abs(v) / maxAbs * 100;
          return `
          <div class="cf-period">
            <div class="cf-period-header"><span>Ano ${i + 1}</span><span style="font-weight:700">${this.fmt(v)}</span></div>
            <div style="padding:.8rem">
              <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.3rem">
                <span>Custos: ${this.fmt(cf.costs[i])}</span><span>Receitas: ${this.fmt(cf.revenues[i])}</span>
              </div>
              <div class="cf-bar"><div class="cf-bar-fill ${v < 0 ? 'negative' : ''}" style="width:${barPct}%"></div></div>
              <div style="text-align:right;font-size:.78rem;color:var(--text-3);margin-top:.3rem">
                Acumulado: <strong style="color:${cumCF >= 0 ? 'var(--green)' : 'var(--red)'}">${this.fmt(cumCF)}</strong>
              </div>
            </div>
          </div>`;
        }).join('')}
        <div style="margin-top:1rem;padding:1rem;background:var(--navy-light);border-radius:var(--radius)">
          <div class="cost-row"><span class="cost-label">TIR (IRR)</span><span class="cost-value">${c.irr.toFixed(2)}%</span></div>
          <div class="cost-row"><span class="cost-label">VAL (NPV) @ ${p.discountRate}%</span><span class="cost-value">${this.fmt(c.npv)}</span></div>
          <div class="cost-row"><span class="cost-label">Payback</span><span class="cost-value">${c.paybackPeriod.toFixed(1)} anos</span></div>
        </div>
      </div>`;

    // Cash flow chart
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;
      const ctx = document.getElementById('chart-cf');
      if (!ctx) return;
      if (this.charts.cf) this.charts.cf.destroy();
      const labels = cf.netCFs.map((_, i) => 'Ano ' + (i + 1));
      let cumul = 0;
      const cumData = cf.netCFs.map(v => { cumul += v; return cumul; });
      this.charts.cf = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Cash Flow', data: cf.netCFs, backgroundColor: cf.netCFs.map(v => v >= 0 ? 'rgba(22,163,74,0.7)' : 'rgba(220,38,38,0.7)'), order: 2 },
            { label: 'Acumulado', data: cumData, type: 'line', borderColor: '#1e3a5f', borderWidth: 2, pointRadius: 4, fill: false, order: 1 }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: v => (v / 1e6).toFixed(1) + 'M' } } } }
      });
    }, 100);

    // TAB 5: CENARIOS (static HTML, populated by buttons)
    document.getElementById('cenarios-result').innerHTML = '<div class="empty-state"><p>Ajuste e clique "Recalcular"</p></div>';
    document.getElementById('breakeven-result').innerHTML = '';

    // TAB 6: GANTT (Improvement #7)
    this.renderGantt(p, c);

    // TAB 7: FINANCIAMENTO (Improvement #15)
    this.renderFinanciamento(p, c);

    // Reset to first tab
    const firstTab = document.querySelector('#screen-project-detail .tab');
    if (firstTab) this.switchTab('ptab-resumo', firstTab);
  },

  // ===== GANTT TIMELINE (Improvement #7) =====
  renderGantt(p, c) {
    const licMonths = p.licensingMonths || 6;
    const buildMonths = p.buildMonths || 24;
    const salesYears = p.salesRhythm.filter(v => v > 0).length;
    const salesMonths = salesYears * 12;
    const totalMonths = licMonths + buildMonths + salesMonths;
    const paybackMonths = c.paybackPeriod * 12;

    const pct = (start, dur) => ({ left: (start / totalMonths * 100).toFixed(1), width: Math.max(dur / totalMonths * 100, 3).toFixed(1) });

    const phases = [
      { label: '📋 Licenciamento', start: 0, dur: licMonths, css: 'phase-lic', desc: `${licMonths} meses` },
      { label: '🔨 Construção', start: licMonths, dur: buildMonths, css: 'phase-build', desc: `${buildMonths} meses` },
      { label: '🏠 Vendas', start: licMonths + Math.floor(buildMonths * 0.7), dur: salesMonths, css: 'phase-sales', desc: `${salesYears} anos` },
      { label: '💰 Payback', start: 0, dur: Math.min(paybackMonths, totalMonths), css: 'phase-payback', desc: `${c.paybackPeriod.toFixed(1)} anos` }
    ];

    document.getElementById('ptab-cronograma').innerHTML = `
      <div class="gantt-container">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:1rem;color:var(--navy)">📅 Cronograma do Projeto</h3>
        <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--text-3);margin-bottom:.5rem;padding:0 4px">
          <span>Mês 0</span><span>Mês ${Math.round(totalMonths / 2)}</span><span>Mês ${totalMonths}</span>
        </div>
        ${phases.map(ph => {
          const pos = pct(ph.start, ph.dur);
          return `
          <div class="gantt-phase">
            <div class="gantt-phase-title"><span>${ph.label}</span><span style="font-size:.78rem;color:var(--text-3);font-weight:400">${ph.desc}</span></div>
            <div class="gantt-bar-track">
              <div class="gantt-bar-fill ${ph.css}" style="left:${pos.left}%;width:${pos.width}%">${ph.desc}</div>
            </div>
          </div>`;
        }).join('')}
        <div class="gantt-legend">
          <span><div class="gantt-legend-dot" style="background:#7c3aed"></div> Licenciamento</span>
          <span><div class="gantt-legend-dot" style="background:var(--navy)"></div> Construção</span>
          <span><div class="gantt-legend-dot" style="background:var(--green)"></div> Vendas</span>
          <span><div class="gantt-legend-dot" style="background:var(--gold)"></div> Payback</span>
        </div>
        <div style="margin-top:1.5rem">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--navy)">📋 Fases Detalhadas</h3>
          <div class="cost-row"><span class="cost-label">Licenciamento</span><span class="cost-value">Mês 1 → ${licMonths}</span></div>
          <div class="cost-row"><span class="cost-label">Início Construção</span><span class="cost-value">Mês ${licMonths + 1}</span></div>
          <div class="cost-row"><span class="cost-label">Fim Construção</span><span class="cost-value">Mês ${licMonths + buildMonths}</span></div>
          <div class="cost-row"><span class="cost-label">Início Vendas (pré-venda)</span><span class="cost-value">Mês ${licMonths + Math.floor(buildMonths * 0.7)}</span></div>
          <div class="cost-row"><span class="cost-label">Fim Vendas</span><span class="cost-value">Mês ${licMonths + Math.floor(buildMonths * 0.7) + salesMonths}</span></div>
          <div class="cost-row total"><span class="cost-label">Payback Estimado</span><span class="cost-value">${c.paybackPeriod.toFixed(1)} anos</span></div>
          <div class="cost-row total"><span class="cost-label">Duração Total</span><span class="cost-value">${(totalMonths / 12).toFixed(1)} anos (${totalMonths} meses)</span></div>
        </div>
      </div>`;
  },

  // ===== LOAN / AMORTIZATION (Improvement #15) =====
  renderFinanciamento(p, c) {
    const amort = c.amortization || [];
    const loanTypeLabel = { bullet: 'Bullet (Capital no final)', amortizing: 'Amortização Constante', 'interest-only': 'Juros Periódicos' }[p.loanType || 'bullet'];
    const totalInt = amort.reduce((s, r) => s + r.interest, 0);
    const totalPrinc = amort.reduce((s, r) => s + r.principal, 0);
    const totalPay = amort.reduce((s, r) => s + r.payment, 0);

    document.getElementById('ptab-financiamento').innerHTML = `
      <div style="padding:1rem">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:1rem;color:var(--navy)">🏦 Detalhes do Financiamento</h3>
        <div class="cost-row"><span class="cost-label">Tipo de Crédito</span><span class="cost-value">${loanTypeLabel}</span></div>
        <div class="cost-row"><span class="cost-label">Investimento Total</span><span class="cost-value">${this.fmt(c.totalInvestment)}</span></div>
        <div class="cost-row"><span class="cost-label">Equity (${p.equityPct}%)</span><span class="cost-value">${this.fmt(c.equityAmount)}</span></div>
        <div class="cost-row"><span class="cost-label">Dívida (${(100 - p.equityPct).toFixed(0)}%)</span><span class="cost-value">${this.fmt(c.debtAmount)}</span></div>
        <div class="cost-row"><span class="cost-label">Taxa de Juro</span><span class="cost-value">${p.interestRate}%</span></div>
        <div class="cost-row"><span class="cost-label">Prazo</span><span class="cost-value">${p.loanTerm} anos</span></div>
        <div class="cost-row total"><span class="cost-label">Serviço da Dívida Total</span><span class="cost-value">${this.fmt(c.debtService)}</span></div>
        <div class="cost-row"><span class="cost-label">LTV</span><span class="cost-value">${c.ltv.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">LTC</span><span class="cost-value">${c.ltc.toFixed(1)}%</span></div>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .5rem;color:var(--navy)">📋 Tabela de Amortização</h3>
        <div style="overflow-x:auto">
        <table class="amort-table">
          <thead><tr><th>Ano</th><th>Saldo</th><th>Juros</th><th>Capital</th><th>Prestação</th><th>Saldo Final</th></tr></thead>
          <tbody>
            ${amort.map(r => `<tr><td>${r.year}</td><td>${this.fmtShort(r.opening)}</td><td>${this.fmtShort(r.interest)}</td><td>${this.fmtShort(r.principal)}</td><td>${this.fmtShort(r.payment)}</td><td>${this.fmtShort(r.closing)}</td></tr>`).join('')}
            <tr><td>Total</td><td></td><td>${this.fmtShort(totalInt)}</td><td>${this.fmtShort(totalPrinc)}</td><td>${this.fmtShort(totalPay)}</td><td></td></tr>
          </tbody>
        </table>
        </div>
      </div>`;
  },

  // ===== COMPARISON (Improvement #8) =====
  renderCompareList() {
    const projects = this.getProjects();
    const container = document.getElementById('compare-list');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><p>Sem projetos para comparar</p></div>';
      return;
    }
    container.innerHTML = projects.map(p => `
      <label class="compare-check">
        <input type="checkbox" value="${p.id}">
        <label>${this.esc(p.name)} <span style="color:var(--text-3);font-weight:400">(${this.esc(p.type)})</span></label>
      </label>`).join('');
    document.getElementById('compare-result').innerHTML = '';
  },

  runComparison() {
    const checks = document.querySelectorAll('#compare-list input[type=checkbox]:checked');
    const ids = Array.from(checks).map(c => c.value);
    if (ids.length < 2) { this.toast('Selecione pelo menos 2 projetos'); return; }
    const projects = this.getProjects().filter(p => ids.includes(p.id));
    const metrics = [
      { label: 'Investimento', fn: p => this.fmt(p.calc?.totalInvestment) },
      { label: 'Receita Bruta', fn: p => this.fmt(p.calc?.grossRevenue) },
      { label: 'Lucro Líquido', fn: p => this.fmt(p.calc?.netProfit), highlight: true },
      { label: 'ROI', fn: p => (p.calc?.roi || 0).toFixed(1) + '%', highlight: true },
      { label: 'ROE', fn: p => (p.calc?.roe || 0).toFixed(1) + '%' },
      { label: 'TIR (IRR)', fn: p => (p.calc?.irr || 0).toFixed(1) + '%' },
      { label: 'VAL (NPV)', fn: p => this.fmt(p.calc?.npv) },
      { label: 'Margem Líq.', fn: p => (p.calc?.netMarginPct || 0).toFixed(1) + '%' },
      { label: 'LTV', fn: p => (p.calc?.ltv || 0).toFixed(1) + '%' },
      { label: 'Payback', fn: p => (p.calc?.paybackPeriod || 0).toFixed(1) + ' anos' },
      { label: 'Equity Multiple', fn: p => (p.calc?.equityMultiple || 0).toFixed(2) + 'x' },
      { label: 'Unidades', fn: p => p.calc?.totalUnits || 0 },
      { label: 'ABC (m²)', fn: p => (p.calc?.abc || 0).toLocaleString('pt-PT') },
      { label: 'Custo/m²', fn: p => this.fmt(p.calc?.costPerSqm) },
      { label: 'Receita/m²', fn: p => this.fmt(p.calc?.revenuePerSqm) }
    ];

    document.getElementById('compare-result').innerHTML = `
      <div style="overflow-x:auto">
      <table class="compare-table">
        <thead><tr><th>Métrica</th>${projects.map(p => '<th>' + this.esc(p.name.substring(0, 20)) + '</th>').join('')}</tr></thead>
        <tbody>
          ${metrics.map(m => `<tr${m.highlight ? ' class="highlight"' : ''}><td>${m.label}</td>${projects.map(p => '<td>' + m.fn(p) + '</td>').join('')}</tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  },

  // ===== ANALYSIS (enhanced with Benchmarks) =====
  renderAnalysis() {
    const projects = this.getProjects();
    const container = document.getElementById('analysis-content');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h3>Sem dados</h3><p>Crie projetos para ver análises</p></div>';
      return;
    }

    let totalInv = 0, totalRev = 0, totalProfit = 0, totalUnits = 0, totalArea = 0;
    projects.forEach(p => { if (!p.calc) return; totalInv += p.calc.totalInvestment; totalRev += p.calc.grossRevenue; totalProfit += p.calc.netProfit; totalUnits += p.calc.totalUnits; totalArea += p.calc.sellableArea; });
    const sorted = [...projects].filter(p => p.calc).sort((a, b) => b.calc.roi - a.calc.roi);
    const best = sorted[0];

    // Find matching benchmark
    const avgRevenuePerSqm = totalArea > 0 ? totalRev / totalArea : 0;
    const avgCostPerSqm = totalArea > 0 ? totalInv / totalArea : 0;
    const avgROI = projects.length > 0 ? projects.reduce((s, p) => s + (p.calc?.roi || 0), 0) / projects.length : 0;
    const bm = this.BENCHMARKS['Nacional'];
    const delta = (val, ref) => {
      const d = ((val - ref) / ref * 100).toFixed(0);
      return d >= 0 ? `<div class="benchmark-delta above">+${d}%</div>` : `<div class="benchmark-delta below">${d}%</div>`;
    };

    container.innerHTML = `
      <div style="padding:1rem">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:var(--navy)">📊 Portfólio</h3>
        <div class="kpi-grid" style="padding:0 0 1rem">
          <div class="kpi-card"><div class="kpi-value">${projects.length}</div><div class="kpi-label">Projetos</div></div>
          <div class="kpi-card"><div class="kpi-value">${this.fmtShort(totalInv)}</div><div class="kpi-label">Investimento</div></div>
          <div class="kpi-card"><div class="kpi-value">${this.fmtShort(totalRev)}</div><div class="kpi-label">Receita</div></div>
          <div class="kpi-card ${totalProfit >= 0 ? 'positive' : 'negative'}"><div class="kpi-value">${this.fmtShort(totalProfit)}</div><div class="kpi-label">Lucro Total</div></div>
        </div>
        <div class="cost-row"><span class="cost-label">Total Unidades</span><span class="cost-value">${totalUnits.toLocaleString('pt-PT')}</span></div>
        <div class="cost-row"><span class="cost-label">Área Vendável Total</span><span class="cost-value">${totalArea.toLocaleString('pt-PT')} m²</span></div>
        <div class="cost-row"><span class="cost-label">Margem Global</span><span class="cost-value">${totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0}%</span></div>

        <div class="chart-container" style="margin:1rem 0"><canvas id="chart-portfolio"></canvas></div>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📊 Benchmark de Mercado (Portugal)</h3>
        <div class="benchmark-grid">
          <div class="benchmark-card"><div class="benchmark-value">${this.fmt(avgRevenuePerSqm)}/m²</div><div class="benchmark-label">Preço Médio</div>${delta(avgRevenuePerSqm, bm.price)}</div>
          <div class="benchmark-card"><div class="benchmark-value">${this.fmt(avgCostPerSqm)}/m²</div><div class="benchmark-label">Custo Médio</div>${delta(avgCostPerSqm, bm.cost)}</div>
          <div class="benchmark-card"><div class="benchmark-value">${avgROI.toFixed(1)}%</div><div class="benchmark-label">ROI Médio</div>${delta(avgROI, bm.roi)}</div>
          <div class="benchmark-card"><div class="benchmark-value">${bm.yield}%</div><div class="benchmark-label">Yield Mercado</div><div class="benchmark-delta" style="color:var(--text-3)">Ref. Nacional</div></div>
        </div>
        <p class="text-muted" style="margin-top:.5rem">Dados de referência: média nacional Portugal 2025 (INE/Idealista)</p>

        <button class="btn-primary btn-full" onclick="P.showScreen('screen-compare')" style="margin-top:1rem">📋 Comparar Projetos</button>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📋 Ranking por ROI</h3>
        ${sorted.map((p, i) => `
          <div class="cost-row" style="cursor:pointer" onclick="P.openProject('${p.id}')">
            <span class="cost-label">${i + 1}. ${this.esc(p.name)}</span>
            <span class="cost-value" style="color:${(p.calc?.roi || 0) >= 0 ? 'var(--green)' : 'var(--red)'}">${(p.calc?.roi || 0).toFixed(1)}% ROI</span>
          </div>`).join('')}
      </div>`;

    // Portfolio chart
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;
      const ctx = document.getElementById('chart-portfolio');
      if (!ctx) return;
      if (this.charts.portfolio) this.charts.portfolio.destroy();
      this.charts.portfolio = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: projects.slice(0, 10).map(p => p.name.substring(0, 12)),
          datasets: [
            { label: 'ROI %', data: projects.slice(0, 10).map(p => p.calc?.roi || 0), backgroundColor: projects.slice(0, 10).map(p => (p.calc?.roi || 0) >= 0 ? 'rgba(22,163,74,0.7)' : 'rgba(220,38,38,0.7)') }
          ]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
      });
    }, 100);
  },

  // ===== SHARE PROJECT (Improvement #11) =====
  shareProject() {
    const proj = this.getProjects().find(x => x.id === this.currentProject);
    if (!proj) return;
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(proj))));
    const url = location.origin + location.pathname + '?share=' + data;

    document.getElementById('modal-content').innerHTML = `
      <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem">🔗 Partilhar Projeto</h3>
      <p class="text-muted" style="margin-bottom:1rem">Copie o link para partilhar este projeto (modo leitura)</p>
      <div class="share-box">
        <input type="text" id="share-url" value="${url}" readonly onclick="this.select()">
        <button class="btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('share-url').value).then(()=>P.toast('Link copiado!'))">📋</button>
      </div>
      <button class="btn-outline btn-full" onclick="P.closeModal()" style="margin-top:1rem">Fechar</button>`;
    document.getElementById('modal-overlay').classList.add('active');
  },

  checkShareURL() {
    const params = new URLSearchParams(location.search);
    const data = params.get('share');
    if (!data) return;
    try {
      const proj = JSON.parse(decodeURIComponent(escape(atob(data))));
      proj.id = 'proj_' + Date.now();
      proj.name = proj.name + ' (Partilhado)';
      const projects = this.getProjects();
      projects.unshift(proj);
      this.saveProjects(projects);
      history.replaceState(null, '', location.pathname);
      this.toast('Projeto importado!');
    } catch (e) { console.error('Share import failed:', e); }
  },

  // ===== PDF EXPORT (Improvement #3) =====
  exportPDF() {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') { this.toast('PDF a carregar...'); return; }
    const proj = this.getProjects().find(x => x.id === this.currentProject);
    if (!proj || !proj.calc) return;
    const c = proj.calc;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const navy = [30, 58, 95];
    const gold = [212, 165, 116];
    let y = 20;

    // Cover
    doc.setFillColor(...navy);
    doc.rect(0, 0, 210, 60, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('PromoFácil', 15, 25);
    doc.setFontSize(10);
    doc.text('Relatório de Viabilidade Imobiliária', 15, 33);
    doc.setFontSize(18);
    doc.text(proj.name, 15, 50);
    doc.setTextColor(0, 0, 0);
    y = 70;

    // Project info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const info = [`Localização: ${proj.location || 'N/A'}`, `Tipo: ${proj.type}`, `ABC: ${c.abc.toLocaleString('pt-PT')} m²`, `Unidades: ${c.totalUnits}`, `Data: ${new Date().toLocaleDateString('pt-PT')}`];
    info.forEach(t => { doc.text(t, 15, y); y += 6; });
    y += 5;

    // Viability
    doc.setFontSize(14);
    doc.setTextColor(...(c.netProfit >= 0 ? [22, 163, 74] : [220, 38, 38]));
    doc.text(c.netProfit >= 0 ? 'PROJETO VIÁVEL' : 'PROJETO INVIÁVEL', 15, y);
    y += 10;

    // KPIs table
    doc.setTextColor(0, 0, 0);
    doc.autoTable({
      startY: y,
      head: [['KPI', 'Valor']],
      body: [
        ['Investimento Total', this.fmt(c.totalInvestment)],
        ['Receita Bruta', this.fmt(c.grossRevenue)],
        ['Lucro Líquido', this.fmt(c.netProfit)],
        ['ROI', c.roi.toFixed(1) + '%'],
        ['ROE', c.roe.toFixed(1) + '%'],
        ['TIR (IRR)', c.irr.toFixed(1) + '%'],
        ['VAL (NPV)', this.fmt(c.npv)],
        ['Margem Bruta', c.grossMarginPct.toFixed(1) + '%'],
        ['Margem Líquida', c.netMarginPct.toFixed(1) + '%'],
        ['Payback', c.paybackPeriod.toFixed(1) + ' anos'],
        ['LTV', c.ltv.toFixed(1) + '%'],
        ['LTC', c.ltc.toFixed(1) + '%'],
        ['Equity Multiple', c.equityMultiple.toFixed(2) + 'x']
      ],
      headStyles: { fillColor: navy },
      alternateRowStyles: { fillColor: [232, 238, 245] },
      margin: { left: 15 }
    });

    // Costs page
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setTextColor(...navy);
    doc.text('Estrutura de Custos', 15, y);
    doc.autoTable({
      startY: y + 8,
      head: [['Rubrica', 'Valor']],
      body: [
        ['Hard Costs (c/ IVA)', this.fmt(c.hardCostWithVAT)],
        ['Soft Costs (c/ IVA)', this.fmt(c.softCostWithVAT)],
        ['Aquisição', this.fmt(c.acquisitionTotal)],
        ['Juros Total', this.fmt(c.totalInterest)],
        ['Comissões Venda', this.fmt(c.salesFees)],
        ['Marketing', this.fmt(c.marketingCosts)],
        ['IRC', this.fmt(c.ircTax)],
        ['TOTAL', this.fmt(c.totalInvestment)]
      ],
      headStyles: { fillColor: navy },
      margin: { left: 15 }
    });

    // Cash flows
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      head: [['Ano', 'Custos', 'Receitas', 'Cash Flow', 'Acumulado']],
      body: (() => {
        let cum = 0;
        return c.cashFlows.netCFs.map((cf, i) => {
          cum += cf;
          return ['Ano ' + (i + 1), this.fmt(c.cashFlows.costs[i]), this.fmt(c.cashFlows.revenues[i]), this.fmt(cf), this.fmt(cum)];
        });
      })(),
      headStyles: { fillColor: navy },
      margin: { left: 15 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('PromoFácil v2.0 | Gerado em ' + new Date().toLocaleDateString('pt-PT'), 15, 287);
      doc.text('Página ' + i + '/' + pageCount, 180, 287);
    }

    doc.save('PromoFacil_' + proj.name.replace(/\s+/g, '_') + '.pdf');
    this.toast('PDF exportado!');
  },

  exportAllPDF() {
    const projects = this.getProjects();
    if (!projects.length) { this.toast('Sem projetos'); return; }
    const original = this.currentProject;
    projects.forEach(p => {
      this.currentProject = p.id;
      this.exportPDF();
    });
    this.currentProject = original;
  },

  // ===== CSV EXPORT =====
  exportCSV() {
    const projects = this.getProjects();
    if (!projects.length) { this.toast('Sem projetos'); return; }
    const h = ['Nome','Tipo','Localização','Estado','Investimento','Receita','Lucro','Margem%','ROI%','ROE%','IRR%','NPV','LTV%','LTC%','Unidades','ABC m²'];
    const rows = projects.map(p => {
      const c = p.calc || {};
      return [p.name, p.type, p.location, p.status, c.totalInvestment, c.grossRevenue, c.netProfit,
        c.netMarginPct?.toFixed(1), c.roi?.toFixed(1), c.roe?.toFixed(1), c.irr?.toFixed(1),
        c.npv, c.ltv?.toFixed(1), c.ltc?.toFixed(1), c.totalUnits, c.abc].join(';');
    });
    const csv = [h.join(';'), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'promofacil_projetos.csv';
    a.click();
    this.toast('CSV exportado!');
  },

  // ===== JSON IMPORT/EXPORT (Improvement #10) =====
  exportJSON() {
    const data = { version: '2.0', user: this.getUser(), projects: this.getProjects(), exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'promofacil_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    this.toast('Backup exportado!');
  },

  importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.projects && Array.isArray(data.projects)) {
          const existing = this.getProjects();
          const newIds = new Set(existing.map(p => p.id));
          let imported = 0;
          data.projects.forEach(p => {
            if (!newIds.has(p.id)) {
              existing.push(p);
              imported++;
            }
          });
          this.saveProjects(existing);
          this.toast(imported + ' projetos importados!');
          this.showScreen('screen-dashboard');
        } else {
          this.toast('Ficheiro inválido');
        }
      } catch { this.toast('Erro ao importar'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  // ===== RENDER SETTINGS =====
  renderSettings() {
    const user = this.getUser();
    if (!user) return;
    document.getElementById('set-name').textContent = user.name;
    document.getElementById('set-email').textContent = user.email;
    document.getElementById('set-empresa').textContent = user.empresa || '';
  },

  // ===== UTILITIES =====
  fmt(v) { if (v === undefined || v === null || isNaN(v)) return '0 €'; return Math.round(v).toLocaleString('pt-PT') + ' €'; },

  fmtShort(v) {
    if (!v || isNaN(v)) return '0 €';
    const abs = Math.abs(v), sign = v < 0 ? '-' : '';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + 'M €';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(0) + 'k €';
    return sign + Math.round(abs) + ' €';
  },

  esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  },

  closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
};

document.addEventListener('DOMContentLoaded', () => P.init());
