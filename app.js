/* ===================================================================
   PromoFácil v1.0 - Viabilidade Imobiliária para PMEs
   Motor de Cálculo Financeiro + SPA | Vanilla JS + localStorage
   =================================================================== */

const P = {
  currentProject: null,
  previousScreen: 'screen-dashboard',

  // ===== INIT =====
  init() {
    const user = this.getUser();
    if (user) this.showScreen('screen-dashboard');
    else this.showScreen('screen-splash');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    // Auto-calculate ABC when inputs change
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

  resetNewProjectForm() {
    const form = document.querySelector('#screen-new-project form');
    if (form) form.reset();
    // Re-set defaults
    const defaults = {
      'proj-soft-pct':'12','proj-contingency':'5','proj-equity-pct':'40',
      'proj-interest':'4','proj-loan-term':'3','proj-vat':'23','proj-irc':'21',
      'proj-imt':'6.5','proj-imi':'0.3','proj-sales-fee':'5','proj-marketing':'1',
      'proj-build-months':'24','proj-sales-y1':'20','proj-sales-y2':'40',
      'proj-sales-y3':'30','proj-sales-y4':'10','proj-discount-rate':'8',
      'proj-appreciation':'2'
    };
    Object.entries(defaults).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  },

  // ===== SAVE PROJECT & CALCULATE =====
  saveProject(e) {
    e.preventDefault();
    const v = id => document.getElementById(id)?.value?.trim() || '';
    const n = id => parseFloat(document.getElementById(id)?.value) || 0;
    const i = id => parseInt(document.getElementById(id)?.value) || 0;

    const project = {
      id: 'proj_' + Date.now(),
      // Info
      name: v('proj-name'),
      location: v('proj-location'),
      type: v('proj-type'),
      description: v('proj-desc'),
      // Land
      acquisitionCost: n('proj-acquisition'),
      plotArea: n('proj-plot-area'),
      implArea: n('proj-impl-area'),
      cos: n('proj-cos'),
      floorsAbove: i('proj-floors-above'),
      floorsBelow: i('proj-floors-below'),
      // Units
      units: {
        apartments: { qty: i('proj-apt-qty'), area: n('proj-apt-area'), price: n('proj-apt-price') },
        villas: { qty: i('proj-villa-qty'), area: n('proj-villa-area'), price: n('proj-villa-price') },
        commercial: { qty: i('proj-comm-qty'), area: n('proj-comm-area'), price: n('proj-comm-price') },
        offices: { qty: i('proj-office-qty'), area: n('proj-office-area'), price: n('proj-office-price') },
        parking: { qty: i('proj-park-qty'), price: n('proj-park-price') },
        hotel: { qty: i('proj-hotel-qty'), adr: n('proj-hotel-adr'), occupancy: n('proj-hotel-occ') }
      },
      // Costs
      buildCostSqm: n('proj-build-cost'),
      softPct: n('proj-soft-pct'),
      contingencyPct: n('proj-contingency'),
      exteriorCost: n('proj-exterior-cost'),
      decorationCost: n('proj-decoration'),
      // Financing
      equityPct: n('proj-equity-pct'),
      interestRate: n('proj-interest'),
      loanTerm: i('proj-loan-term'),
      // Taxes
      vatPct: n('proj-vat'),
      ircPct: n('proj-irc'),
      imtPct: n('proj-imt'),
      imiPct: n('proj-imi'),
      salesFeePct: n('proj-sales-fee'),
      marketingPct: n('proj-marketing'),
      // Schedule
      buildMonths: i('proj-build-months'),
      salesRhythm: [n('proj-sales-y1'), n('proj-sales-y2'), n('proj-sales-y3'), n('proj-sales-y4')],
      discountRate: n('proj-discount-rate'),
      appreciationRate: n('proj-appreciation'),
      createdAt: new Date().toISOString()
    };

    // Calculate viability
    project.calc = this.calculate(project);

    const projects = this.getProjects();
    projects.unshift(project);
    this.saveProjects(projects);
    e.target.reset();
    this.toast('Projeto criado! Viabilidade calculada.');
    this.currentProject = project.id;
    this.showScreen('screen-project-detail');
  },

  // ===== FINANCIAL ENGINE =====
  calculate(p) {
    const c = {};

    // 1. AREAS
    c.abc = p.implArea * (p.floorsAbove + p.floorsBelow);
    c.sellableArea =
      (p.units.apartments.qty * p.units.apartments.area) +
      (p.units.villas.qty * p.units.villas.area) +
      (p.units.commercial.qty * p.units.commercial.area) +
      (p.units.offices.qty * p.units.offices.area);
    c.totalUnits = p.units.apartments.qty + p.units.villas.qty +
      p.units.commercial.qty + p.units.offices.qty + p.units.parking.qty + p.units.hotel.qty;
    c.sellableRatio = c.abc > 0 ? (c.sellableArea / c.abc) * 100 : 0;

    // 2. CONSTRUCTION COSTS (Hard Costs)
    c.hardCostBase = c.abc * p.buildCostSqm;
    c.exteriorCosts = (p.plotArea - p.implArea) * p.exteriorCost;
    if (c.exteriorCosts < 0) c.exteriorCosts = 0;
    c.decorationCosts = c.sellableArea * p.decorationCost;
    c.hardCostSubtotal = c.hardCostBase + c.exteriorCosts + c.decorationCosts;
    c.contingency = c.hardCostSubtotal * (p.contingencyPct / 100);
    c.hardCostTotal = c.hardCostSubtotal + c.contingency;
    c.hardCostVAT = c.hardCostTotal * (p.vatPct / 100);
    c.hardCostWithVAT = c.hardCostTotal + c.hardCostVAT;

    // 3. SOFT COSTS (Project Costs)
    c.softCostBase = c.hardCostTotal * (p.softPct / 100);
    c.softCostVAT = c.softCostBase * (p.vatPct / 100);
    c.softCostWithVAT = c.softCostBase + c.softCostVAT;

    // 4. ACQUISITION COSTS
    c.imtCost = p.acquisitionCost * (p.imtPct / 100);
    c.stampTax = p.acquisitionCost * 0.008;
    c.acquisitionTotal = p.acquisitionCost + c.imtCost + c.stampTax;

    // 5. TOTAL INVESTMENT
    c.totalInvestmentExVAT = p.acquisitionCost + c.hardCostTotal + c.softCostBase + c.imtCost + c.stampTax;
    c.totalVAT = c.hardCostVAT + c.softCostVAT;
    c.totalInvestment = c.acquisitionTotal + c.hardCostWithVAT + c.softCostWithVAT;

    // 6. REVENUE
    c.revenueApartments = p.units.apartments.qty * p.units.apartments.area * p.units.apartments.price;
    c.revenueVillas = p.units.villas.qty * p.units.villas.area * p.units.villas.price;
    c.revenueCommercial = p.units.commercial.qty * p.units.commercial.area * p.units.commercial.price;
    c.revenueOffices = p.units.offices.qty * p.units.offices.area * p.units.offices.price;
    c.revenueParking = p.units.parking.qty * p.units.parking.price;
    // Hotel: Annual Revenue = Rooms × ADR × 365 × Occupancy × holdingPeriod
    const hotelYears = p.loanTerm || 1;
    c.revenueHotel = p.units.hotel.qty * p.units.hotel.adr * 365 * (p.units.hotel.occupancy / 100) * hotelYears;

    c.grossRevenue = c.revenueApartments + c.revenueVillas + c.revenueCommercial +
      c.revenueOffices + c.revenueParking + c.revenueHotel;

    // Revenue with VAT for sales (residential typically VAT exempt on sale, but commercial subject)
    // Simplified: gross revenue is the selling price clients pay
    c.grossRevenueWithVAT = c.grossRevenue;

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

    // 9. TAXES ON PROFIT
    c.grossProfit = c.grossRevenue - c.totalInvestment;
    c.grossMarginPct = c.grossRevenue > 0 ? (c.grossProfit / c.grossRevenue) * 100 : 0;

    c.profitBeforeTax = c.grossProfit - c.totalSalesCosts - c.totalInterest;
    c.ircTax = c.profitBeforeTax > 0 ? c.profitBeforeTax * (p.ircPct / 100) : 0;
    c.netProfit = c.profitBeforeTax - c.ircTax;
    c.netMarginPct = c.grossRevenue > 0 ? (c.netProfit / c.grossRevenue) * 100 : 0;

    // 10. KEY FINANCIAL RATIOS
    c.roi = c.totalInvestment > 0 ? (c.netProfit / c.totalInvestment) * 100 : 0;
    c.roe = c.equityAmount > 0 ? (c.netProfit / c.equityAmount) * 100 : 0;
    c.equityMultiple = c.equityAmount > 0 ? (c.equityAmount + c.netProfit) / c.equityAmount : 0;
    c.profitPerSqm = c.sellableArea > 0 ? c.netProfit / c.sellableArea : 0;
    c.costPerSqm = c.abc > 0 ? c.totalInvestment / c.abc : 0;
    c.revenuePerSqm = c.sellableArea > 0 ? c.grossRevenue / c.sellableArea : 0;

    // LTV & LTC
    c.propertyValue = c.grossRevenue; // Simplified: property value = revenue potential
    c.ltv = c.propertyValue > 0 ? (c.debtAmount / c.propertyValue) * 100 : 0;
    c.ltc = c.totalInvestment > 0 ? (c.debtAmount / c.totalInvestment) * 100 : 0;

    // 11. CASH FLOW TIMELINE
    c.cashFlows = this.buildCashFlows(p, c);

    // 12. IRR (approximation using Newton's method)
    c.irr = this.calcIRR(c.cashFlows.netCFs);

    // 13. NPV
    c.npv = this.calcNPV(c.cashFlows.netCFs, p.discountRate / 100);

    // 14. PAYBACK PERIOD
    c.paybackPeriod = this.calcPayback(c.cashFlows.netCFs);

    // 15. YIELD (for rental projects)
    c.yieldGross = c.propertyValue > 0 && c.revenueHotel > 0 ?
      ((c.revenueHotel / hotelYears) / c.totalInvestment) * 100 : 0;

    return c;
  },

  // ===== CASH FLOW BUILDER =====
  buildCashFlows(p, c) {
    // Build yearly cash flows
    const years = Math.max(p.loanTerm || 3, Math.ceil(p.buildMonths / 12) + 2);
    const buildYears = Math.ceil(p.buildMonths / 12);
    const costs = [];
    const revenues = [];
    const netCFs = [];

    for (let y = 0; y < years; y++) {
      let costY = 0;
      let revY = 0;

      // Construction costs spread over build period
      if (y < buildYears) {
        const pct = y === 0 ? 0.7 : (buildYears > 1 ? 0.3 / (buildYears - 1) : 0);
        costY += (c.hardCostWithVAT + c.softCostWithVAT) * pct;
      }

      // Acquisition cost in year 0
      if (y === 0) costY += c.acquisitionTotal;

      // Interest on debt
      if (y < p.loanTerm) costY += c.annualInterest;

      // Sales revenue per rhythm
      const rhythm = p.salesRhythm;
      if (y < rhythm.length) {
        const appreciationFactor = Math.pow(1 + (p.appreciationRate / 100), y);
        revY = c.grossRevenue * (rhythm[y] / 100) * appreciationFactor;
        // Deduct sales costs proportionally
        revY -= revY * ((p.salesFeePct + p.marketingPct) / 100);
      }

      costs.push(costY);
      revenues.push(revY);
      netCFs.push(revY - costY);
    }

    return { costs, revenues, netCFs, years };
  },

  // ===== IRR CALCULATION (Newton-Raphson) =====
  calcIRR(cashFlows, guess = 0.1) {
    if (!cashFlows || cashFlows.length < 2) return 0;
    // Check if there's both negative and positive
    const hasNeg = cashFlows.some(v => v < 0);
    const hasPos = cashFlows.some(v => v > 0);
    if (!hasNeg || !hasPos) return 0;

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

  // ===== NPV CALCULATION =====
  calcNPV(cashFlows, rate) {
    if (!cashFlows || !rate) return 0;
    let npv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
    }
    return npv;
  },

  // ===== PAYBACK PERIOD =====
  calcPayback(cashFlows) {
    if (!cashFlows) return 0;
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      cumulative += cashFlows[t];
      if (cumulative >= 0) {
        // Interpolate
        const prevCum = cumulative - cashFlows[t];
        if (cashFlows[t] > 0) {
          return t + (-prevCum / cashFlows[t]);
        }
        return t;
      }
    }
    return cashFlows.length; // Never pays back within horizon
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
      // Clone project and adjust prices
      const clone = JSON.parse(JSON.stringify(proj));
      const factor = 1 + (s.pct / 100);
      clone.units.apartments.price *= factor;
      clone.units.villas.price *= factor;
      clone.units.commercial.price *= factor;
      clone.units.offices.price *= factor;
      clone.units.parking.price *= factor;
      delete clone.calc;
      const calc = this.calculate(clone);
      return { ...s, calc };
    });

    const container = document.getElementById('cenarios-result');
    container.innerHTML = results.map(r => `
      <div class="scenario-card ${r.css}" style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
          <h3 style="font-size:1.05rem;font-weight:700">${r.name}</h3>
          <span class="card-badge badge-${r.css === 'worst' ? 'red' : r.css === 'best' ? 'green' : 'navy'}">${r.pct > 0 ? '+' : ''}${r.pct}%</span>
        </div>
        <div class="cost-row"><span class="cost-label">Receita Bruta</span><span class="cost-value">${this.fmt(r.calc.grossRevenue)}</span></div>
        <div class="cost-row"><span class="cost-label">Lucro Líquido</span><span class="cost-value" style="color:${r.calc.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${this.fmt(r.calc.netProfit)}</span></div>
        <div class="cost-row"><span class="cost-label">Margem Líquida</span><span class="cost-value">${r.calc.netMarginPct.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">ROI</span><span class="cost-value">${r.calc.roi.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">ROE</span><span class="cost-value">${r.calc.roe.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">TIR (IRR)</span><span class="cost-value">${r.calc.irr.toFixed(1)}%</span></div>
        <div class="cost-row"><span class="cost-label">VAL (NPV)</span><span class="cost-value">${this.fmt(r.calc.npv)}</span></div>
        <div class="cost-row"><span class="cost-label">Equity Multiple</span><span class="cost-value">${r.calc.equityMultiple.toFixed(2)}x</span></div>
      </div>
    `).join('');
  },

  // ===== RENDER DASHBOARD =====
  renderDashboard() {
    const user = this.getUser();
    document.getElementById('dash-user').textContent = user ? (user.empresa || user.name) : '';
    const projects = this.getProjects();

    // Aggregate stats
    let totalInv = 0, totalProfit = 0, totalROI = 0;
    projects.forEach(p => {
      if (p.calc) {
        totalInv += p.calc.totalInvestment;
        totalProfit += p.calc.netProfit;
        totalROI += p.calc.roi;
      }
    });
    const avgROI = projects.length > 0 ? totalROI / projects.length : 0;

    document.getElementById('stat-projetos').textContent = projects.length;
    document.getElementById('stat-investimento').textContent = this.fmtShort(totalInv);
    document.getElementById('stat-lucro').textContent = this.fmtShort(totalProfit);
    document.getElementById('stat-roi').textContent = avgROI.toFixed(1) + '%';

    // Recent projects
    const container = document.getElementById('dash-projects');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏗️</div><h3>Sem projetos</h3><p>Crie o primeiro estudo de viabilidade</p></div>';
      return;
    }
    container.innerHTML = projects.slice(0, 5).map(p => this.renderProjectCard(p)).join('');
  },

  renderProjectCard(p) {
    const c = p.calc || {};
    const profitColor = (c.netProfit || 0) >= 0 ? 'green' : 'red';
    return `
      <div class="card-item ${profitColor}-border" onclick="P.openProject('${p.id}')">
        <div class="card-header">
          <div class="card-title">${this.esc(p.name)}</div>
          <span class="card-badge badge-${profitColor}">${(c.roi || 0).toFixed(1)}% ROI</span>
        </div>
        <div class="card-sub">${this.esc(p.type)} ${p.location ? '• ' + this.esc(p.location) : ''}</div>
        <div class="card-meta">
          <span>💰 ${this.fmtShort(c.totalInvestment || 0)}</span>
          <span>📈 ${this.fmtShort(c.grossRevenue || 0)}</span>
          <span>💵 ${this.fmtShort(c.netProfit || 0)}</span>
          <span>🏠 ${c.totalUnits || 0} un.</span>
        </div>
      </div>`;
  },

  // ===== RENDER PROJECTS =====
  renderProjects() {
    const projects = this.getProjects();
    const container = document.getElementById('projects-list');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏢</div><h3>Sem projetos</h3><p>Crie o primeiro projeto</p></div>';
      return;
    }
    container.innerHTML = projects.map(p => this.renderProjectCard(p)).join('');
  },

  openProject(id) {
    this.currentProject = id;
    this.showScreen('screen-project-detail');
  },

  deleteProject() {
    if (!confirm('Eliminar este projeto?')) return;
    this.saveProjects(this.getProjects().filter(p => p.id !== this.currentProject));
    this.toast('Projeto eliminado');
    this.showScreen('screen-projects');
  },

  // ===== RENDER PROJECT DETAIL =====
  renderProjectDetail() {
    const p = this.getProjects().find(x => x.id === this.currentProject);
    if (!p || !p.calc) return;
    const c = p.calc;

    document.getElementById('proj-detail-title').textContent = p.name;

    // Hero
    document.getElementById('proj-detail-hero').innerHTML = `
      <h2>🏗️ ${this.esc(p.name)}</h2>
      <div class="meta">
        <span>📍 ${this.esc(p.location || 'N/A')}</span>
        <span>🏢 ${this.esc(p.type)}</span>
        <span>📐 ${c.abc.toLocaleString('pt-PT')} m² ABC</span>
        <span>🏠 ${c.totalUnits} unidades</span>
      </div>
    `;

    // TAB 1: RESUMO
    const viability = c.netProfit >= 0 ? '✅ VIÁVEL' : '❌ INVIÁVEL';
    const viabilityClass = c.netProfit >= 0 ? 'positive' : 'negative';
    document.getElementById('ptab-resumo').innerHTML = `
      <div style="text-align:center;padding:1rem;margin:0 1rem 1rem;background:${c.netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'};border-radius:var(--radius);font-size:1.3rem;font-weight:800;color:${c.netProfit >= 0 ? 'var(--green-dark)' : 'var(--red)'}">
        ${viability}
      </div>
      <div class="kpi-grid" style="padding:0 1rem 1rem">
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
      <div style="padding:0 1rem">
        <div class="cost-row subtotal"><span class="cost-label">Investimento Total</span><span class="cost-value">${this.fmt(c.totalInvestment)}</span></div>
        <div class="cost-row subtotal"><span class="cost-label">Receita Bruta</span><span class="cost-value">${this.fmt(c.grossRevenue)}</span></div>
        <div class="cost-row total"><span class="cost-label">Lucro Líquido</span><span class="cost-value" style="color:${c.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${this.fmt(c.netProfit)}</span></div>
      </div>
    `;

    // TAB 2: CUSTOS
    document.getElementById('ptab-custos').innerHTML = `
      <div style="padding:0 1rem 1rem">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--navy)">🏗️ Custos de Construção (Hard Costs)</h3>
        <div class="cost-row"><span class="cost-label">Construção Base (${c.abc.toLocaleString('pt-PT')} m² × ${this.fmt(p.buildCostSqm)}/m²)</span><span class="cost-value">${this.fmt(c.hardCostBase)}</span></div>
        <div class="cost-row"><span class="cost-label">Arranjos Exteriores</span><span class="cost-value">${this.fmt(c.exteriorCosts)}</span></div>
        <div class="cost-row"><span class="cost-label">Decoração</span><span class="cost-value">${this.fmt(c.decorationCosts)}</span></div>
        <div class="cost-row"><span class="cost-label">Contingência (${p.contingencyPct}%)</span><span class="cost-value">${this.fmt(c.contingency)}</span></div>
        <div class="cost-row subtotal"><span class="cost-label">Subtotal s/ IVA</span><span class="cost-value">${this.fmt(c.hardCostTotal)}</span></div>
        <div class="cost-row"><span class="cost-label">IVA (${p.vatPct}%)</span><span class="cost-value">${this.fmt(c.hardCostVAT)}</span></div>
        <div class="cost-row total"><span class="cost-label">Total Hard Costs c/ IVA</span><span class="cost-value">${this.fmt(c.hardCostWithVAT)}</span></div>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📋 Custos de Projeto (Soft Costs)</h3>
        <div class="cost-row"><span class="cost-label">Projetos & Gestão (${p.softPct}% Hard Costs)</span><span class="cost-value">${this.fmt(c.softCostBase)}</span></div>
        <div class="cost-row"><span class="cost-label">IVA (${p.vatPct}%)</span><span class="cost-value">${this.fmt(c.softCostVAT)}</span></div>
        <div class="cost-row total"><span class="cost-label">Total Soft Costs c/ IVA</span><span class="cost-value">${this.fmt(c.softCostWithVAT)}</span></div>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">🏠 Custos de Aquisição</h3>
        <div class="cost-row"><span class="cost-label">Preço Terreno</span><span class="cost-value">${this.fmt(p.acquisitionCost)}</span></div>
        <div class="cost-row"><span class="cost-label">IMT (${p.imtPct}%)</span><span class="cost-value">${this.fmt(c.imtCost)}</span></div>
        <div class="cost-row"><span class="cost-label">Imposto Selo (0.8%)</span><span class="cost-value">${this.fmt(c.stampTax)}</span></div>
        <div class="cost-row total"><span class="cost-label">Total Aquisição</span><span class="cost-value">${this.fmt(c.acquisitionTotal)}</span></div>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">💰 Financiamento</h3>
        <div class="cost-row"><span class="cost-label">Equity (${p.equityPct}%)</span><span class="cost-value">${this.fmt(c.equityAmount)}</span></div>
        <div class="cost-row"><span class="cost-label">Dívida (${(100 - p.equityPct).toFixed(0)}%)</span><span class="cost-value">${this.fmt(c.debtAmount)}</span></div>
        <div class="cost-row"><span class="cost-label">Juros Anuais (${p.interestRate}%)</span><span class="cost-value">${this.fmt(c.annualInterest)}</span></div>
        <div class="cost-row"><span class="cost-label">Juros Total (${p.loanTerm} anos)</span><span class="cost-value">${this.fmt(c.totalInterest)}</span></div>

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📊 Custos de Venda</h3>
        <div class="cost-row"><span class="cost-label">Comissão Vendas (${p.salesFeePct}%)</span><span class="cost-value">${this.fmt(c.salesFees)}</span></div>
        <div class="cost-row"><span class="cost-label">Marketing (${p.marketingPct}%)</span><span class="cost-value">${this.fmt(c.marketingCosts)}</span></div>
        <div class="cost-row"><span class="cost-label">IRC (${p.ircPct}%)</span><span class="cost-value">${this.fmt(c.ircTax)}</span></div>

        <div class="cost-row total" style="margin-top:1rem;font-size:1.1rem"><span class="cost-label">INVESTIMENTO TOTAL</span><span class="cost-value">${this.fmt(c.totalInvestment)}</span></div>
        <div class="cost-row" style="font-size:.82rem;color:var(--text-3)"><span class="cost-label">Custo/m² ABC</span><span class="cost-value">${this.fmt(c.costPerSqm)}/m²</span></div>
      </div>
    `;

    // TAB 3: RECEITAS
    const unitTypes = [
      { key: 'apartments', label: '🏢 Apartamentos', rev: c.revenueApartments, u: p.units.apartments },
      { key: 'villas', label: '🏠 Moradias/Villas', rev: c.revenueVillas, u: p.units.villas },
      { key: 'commercial', label: '🏪 Comércio', rev: c.revenueCommercial, u: p.units.commercial },
      { key: 'offices', label: '🏢 Escritórios', rev: c.revenueOffices, u: p.units.offices },
      { key: 'parking', label: '🅿️ Estacionamento', rev: c.revenueParking, u: p.units.parking },
      { key: 'hotel', label: '🏨 Hotel', rev: c.revenueHotel, u: p.units.hotel }
    ].filter(t => t.rev > 0);

    document.getElementById('ptab-receitas').innerHTML = `
      <div style="padding:0 1rem 1rem">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--navy)">💰 Receitas por Tipo</h3>
        ${unitTypes.map(t => {
          const pctOfTotal = c.grossRevenue > 0 ? ((t.rev / c.grossRevenue) * 100).toFixed(1) : 0;
          return `
          <div class="card-item gold-border" style="cursor:default;margin-bottom:.8rem">
            <div class="card-header">
              <div class="card-title">${t.label}</div>
              <span class="card-badge badge-gold">${pctOfTotal}%</span>
            </div>
            <div class="card-meta">
              <span>${t.u.qty} un.</span>
              ${t.u.area ? '<span>' + t.u.area + ' m²/un.</span>' : ''}
              ${t.u.price ? '<span>' + this.fmt(t.u.price) + '/m²</span>' : ''}
              ${t.u.adr ? '<span>ADR: ' + this.fmt(t.u.adr) + '</span>' : ''}
            </div>
            <div class="cost-row total" style="margin-top:.5rem"><span class="cost-label">Receita</span><span class="cost-value" style="color:var(--green)">${this.fmt(t.rev)}</span></div>
          </div>`;
        }).join('') || '<div class="empty-state"><h3>Sem receitas definidas</h3></div>'}
        <div class="cost-row total" style="margin-top:.5rem;font-size:1.1rem"><span class="cost-label">RECEITA BRUTA TOTAL</span><span class="cost-value" style="color:var(--green)">${this.fmt(c.grossRevenue)}</span></div>
        <div class="cost-row"><span class="cost-label">Receita/m² Vendável</span><span class="cost-value">${this.fmt(c.revenuePerSqm)}/m²</span></div>
        <div class="cost-row"><span class="cost-label">Área Vendável</span><span class="cost-value">${c.sellableArea.toLocaleString('pt-PT')} m² (${c.sellableRatio.toFixed(0)}% da ABC)</span></div>
      </div>
    `;

    // TAB 4: CASH FLOW
    const cf = c.cashFlows;
    let cumCF = 0;
    const maxAbs = Math.max(...cf.netCFs.map(v => Math.abs(v)), 1);
    document.getElementById('ptab-cashflow').innerHTML = `
      <div class="cf-timeline" style="padding:1rem">
        ${cf.netCFs.map((v, i) => {
          cumCF += v;
          const barPct = Math.abs(v) / maxAbs * 100;
          const isNeg = v < 0;
          return `
          <div class="cf-period">
            <div class="cf-period-header">
              <span>Ano ${i + 1}</span>
              <span style="font-weight:700">${this.fmt(v)}</span>
            </div>
            <div style="padding:.8rem">
              <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.3rem">
                <span>Custos: ${this.fmt(cf.costs[i])}</span>
                <span>Receitas: ${this.fmt(cf.revenues[i])}</span>
              </div>
              <div class="cf-bar">
                <div class="cf-bar-fill ${isNeg ? 'negative' : ''}" style="width:${barPct}%"></div>
              </div>
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
      </div>
    `;

    // TAB 5: CENÁRIOS - just prepare defaults
    document.getElementById('cenarios-result').innerHTML = '<div class="empty-state"><p>Ajuste os parâmetros e clique em "Recalcular"</p></div>';

    // Reset to first tab
    const firstTab = document.querySelector('#screen-project-detail .tab');
    if (firstTab) this.switchTab('ptab-resumo', firstTab);
  },

  // ===== RENDER ANALYSIS =====
  renderAnalysis() {
    const projects = this.getProjects();
    const container = document.getElementById('analysis-content');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h3>Sem dados</h3><p>Crie projetos para ver análises</p></div>';
      return;
    }

    // Portfolio summary
    let totalInv = 0, totalRev = 0, totalProfit = 0, totalUnits = 0, totalArea = 0;
    projects.forEach(p => {
      if (!p.calc) return;
      totalInv += p.calc.totalInvestment;
      totalRev += p.calc.grossRevenue;
      totalProfit += p.calc.netProfit;
      totalUnits += p.calc.totalUnits;
      totalArea += p.calc.sellableArea;
    });

    // Best/worst project
    const sorted = [...projects].filter(p => p.calc).sort((a, b) => b.calc.roi - a.calc.roi);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    container.innerHTML = `
      <div style="padding:1rem">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:var(--navy)">📊 Análise do Portfólio</h3>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">${projects.length}</div><div class="kpi-label">Projetos</div></div>
          <div class="kpi-card"><div class="kpi-value">${this.fmtShort(totalInv)}</div><div class="kpi-label">Investimento</div></div>
          <div class="kpi-card"><div class="kpi-value">${this.fmtShort(totalRev)}</div><div class="kpi-label">Receita</div></div>
          <div class="kpi-card ${totalProfit >= 0 ? 'positive' : 'negative'}"><div class="kpi-value">${this.fmtShort(totalProfit)}</div><div class="kpi-label">Lucro Total</div></div>
        </div>
        <div style="margin-top:1rem">
          <div class="cost-row"><span class="cost-label">Total Unidades</span><span class="cost-value">${totalUnits.toLocaleString('pt-PT')}</span></div>
          <div class="cost-row"><span class="cost-label">Área Vendável Total</span><span class="cost-value">${totalArea.toLocaleString('pt-PT')} m²</span></div>
          <div class="cost-row"><span class="cost-label">Margem Global</span><span class="cost-value">${totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0}%</span></div>
        </div>
        ${best ? `
        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--green)">🏆 Melhor Projeto</h3>
        ${this.renderProjectCard(best)}` : ''}
        ${worst && worst.id !== best?.id ? `
        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--red)">⚠️ Projeto com Menor ROI</h3>
        ${this.renderProjectCard(worst)}` : ''}

        <h3 style="font-size:1rem;font-weight:700;margin:1.5rem 0 .8rem;color:var(--navy)">📋 Ranking por ROI</h3>
        ${sorted.map((p, i) => `
          <div class="cost-row">
            <span class="cost-label">${i + 1}. ${this.esc(p.name)}</span>
            <span class="cost-value" style="color:${(p.calc?.roi || 0) >= 0 ? 'var(--green)' : 'var(--red)'}">${(p.calc?.roi || 0).toFixed(1)}% ROI</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ===== EXPORT CSV =====
  exportCSV() {
    const projects = this.getProjects();
    if (!projects.length) { this.toast('Sem projetos para exportar'); return; }
    const headers = ['Nome','Tipo','Localização','Investimento','Receita','Lucro','Margem%','ROI%','ROE%','IRR%','NPV','LTV%','LTC%','Unidades','ABC m²'];
    const rows = projects.map(p => {
      const c = p.calc || {};
      return [p.name, p.type, p.location, c.totalInvestment, c.grossRevenue, c.netProfit,
        c.netMarginPct?.toFixed(1), c.roi?.toFixed(1), c.roe?.toFixed(1), c.irr?.toFixed(1),
        c.npv, c.ltv?.toFixed(1), c.ltc?.toFixed(1), c.totalUnits, c.abc].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'promofacil_projetos.csv'; a.click();
    URL.revokeObjectURL(url);
    this.toast('CSV exportado!');
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
  fmt(v) {
    if (v === undefined || v === null || isNaN(v)) return '0 €';
    return Math.round(v).toLocaleString('pt-PT') + ' €';
  },

  fmtShort(v) {
    if (!v || isNaN(v)) return '0 €';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
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
