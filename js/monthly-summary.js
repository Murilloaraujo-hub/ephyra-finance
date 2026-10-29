/* ===== js/monthly-summary.js ===== */
const MonthlySummary = (() => {
  'use strict';

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];


  let data = null;
  let user = null;
  const charts = new Map();
  let sectionObserver = null;
  let chartObserver = null;
  let highlightTimer = 0;


  function escapeHTML(value) {
    const node = document.createElement('div');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }

  function getMonthKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function getMonthLabel(key) {
    const [year, month] = key.split('-').map(Number);
    return `${MONTHS[month - 1]} de ${year}`;
  }

  function money(value) {
    if(typeof U!=='undefined'&&typeof U.money==='function')return U.money(value);
    const currency = data?.config?.baseCurrency || 'BRL';
    try {
      return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency });
    } catch {
      return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  }

  function classify(savingsPct, goalsPct, finalBalance) {
    if (savingsPct >= 25 && goalsPct >= 60 && finalBalance >= 0) {
      return { label: 'Excelente', color: '#10b981', icon: 'fa-circle-check' };
    }
    if (savingsPct >= 15 && finalBalance >= 0) {
      return { label: 'Bom', color: '#3b82f6', icon: '🔵' };
    }
    if (savingsPct >= 5 || finalBalance >= 0) {
      return { label: 'Regular', color: '#f59e0b', icon: 'fa-circle-minus' };
    }
    return { label: 'Atenção', color: '#ef4444', icon: 'fa-circle-exclamation' };
  }

  function normalizedCategory(transaction) {
    const category = (data.categorias || []).find((item) => item.id === transaction.categoria);
    const raw = `${transaction.nome || ''} ${transaction.categoria || ''} ${category?.nome || ''}`.toLowerCase();

    if (/supermerc|mercado|feira|hortifruti|empório|emporio/.test(raw)) return ['Mercado', '#10b981'];
    if (/steam|playstation|xbox|nintendo|jogo|game/.test(raw)) return ['Jogos', '#64748b'];
    if (/netflix|spotify|assinatura|hbo|disney|icloud|prime/.test(raw)) return ['Assinaturas', '#06b6d4'];
    if (/aliment|restaurante|delivery|ifood|lanche|padaria/.test(raw)) return ['Alimentação', '#f97316'];
    if (/transport|uber|99|combust|posto|metro|ônibus|onibus/.test(raw)) return ['Transporte', '#3b82f6'];
    if (/moradia|aluguel|condom|casa|energia|água|agua/.test(raw)) return ['Moradia', '#6366f1'];
    if (/saúde|saude|farmácia|farmacia|consulta|médic|medic/.test(raw)) return ['Saúde', '#ef4444'];
    if (/lazer|cinema|show|viagem|passeio/.test(raw)) return ['Lazer', '#ec4899'];
    return ['Outros', category?.cor || '#64748b'];
  }

  function commentFor(summary, previous) {
    if (!summary.receitaTotal) return 'Este mês não teve receitas registradas. Planejar os próximos recebimentos pode ajudar.';
    if (summary.metas.total && summary.metas.concluidas === summary.metas.total) return 'Você cumpriu todas as metas planejadas. Excelente consistência financeira!';
    if (summary.economiaPct >= 25) return `Você conseguiu economizar ${summary.economiaPct.toFixed(0)}% da sua renda. Excelente resultado.`;
    if (previous && summary.economia > previous.economia) return 'Você bateu um novo recorde de economia em relação ao mês anterior.';
    if (previous && summary.categoriaMaior?.nome === 'Alimentação') {
      const old = previous.categorias?.find((item) => item.nome === 'Alimentação')?.valor || 0;
      if (summary.categoriaMaior.valor > old * 1.15) return 'Os gastos com alimentação aumentaram bastante neste mês. Vale acompanhar esse limite.';
    }
    if (summary.metas.dinheiroGuardado > 0) return 'Sua reserva financeira continua crescendo. Continue assim!';
    return `${summary.categoriaMaior?.nome || 'Seus gastos'} teve o maior peso do mês. Pequenos ajustes podem ampliar sua economia.`;
  }

  function closingBalance(key) {
    const end = new Date(`${key}-01T00:00:00`);
    end.setMonth(end.getMonth() + 1);
    return (data.historico || []).reduce((balance, transaction) => {
      const date = new Date(transaction.data);
      if (Number.isNaN(date.getTime()) || date >= end) return balance;
      const value = Number(transaction.valor || 0);
      return (transaction.tipo || transaction.type) === 'receita' ? balance + value : balance - value;
    }, 0);
  }

  function generate(key) {
    const transactions = (data.historico || []).filter((transaction) => getMonthKey(transaction.data) === key);
    const income = transactions.filter((transaction) => (transaction.tipo || transaction.type) === 'receita');
    const expenses = transactions.filter((transaction) => (transaction.tipo || transaction.type) === 'despesa');
    const receitaTotal = income.reduce((sum, transaction) => sum + Number(transaction.valor || 0), 0);
    const despesasTotal = expenses.reduce((sum, transaction) => sum + Number(transaction.valor || 0), 0);
    const economia = receitaTotal - despesasTotal;
    const economiaPct = receitaTotal > 0 ? economia / receitaTotal * 100 : 0;

    const categoryMap = new Map();
    expenses.forEach((transaction) => {
      const [name, color] = normalizedCategory(transaction);
      const current = categoryMap.get(name) || { nome: name, valor: 0, cor: color };
      current.valor += Number(transaction.valor || 0);
      categoryMap.set(name, current);
    });
    const categorias = [...categoryMap.values()]
      .sort((a, b) => b.valor - a.valor)
      .map((category) => ({ ...category, percentual: despesasTotal ? category.valor / despesasTotal * 100 : 0 }));

    const sortedExpenses = [...expenses].sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));
    const [year, month] = key.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = new Map();
    transactions.forEach((transaction) => {
      const date = new Date(transaction.data);
      if (Number.isNaN(date.getTime())) return;
      const dayKey = date.toISOString().slice(0, 10);
      const current = daily.get(dayKey) || { receitas: 0, despesas: 0 };
      const value = Number(transaction.valor || 0);
      if ((transaction.tipo || transaction.type) === 'receita') current.receitas += value;
      if ((transaction.tipo || transaction.type) === 'despesa') current.despesas += value;
      daily.set(dayKey, current);
    });
    const dailyRows = [...daily.entries()].map(([date, values]) => ({
      date,
      receitas: values.receitas,
      despesas: values.despesas,
      economia: values.receitas - values.despesas
    }));
    const biggestSpendDay = [...dailyRows].sort((a, b) => b.despesas - a.despesas)[0] || null;
    const bestSavingDay = [...dailyRows].sort((a, b) => b.economia - a.economia)[0] || null;
    const completedGoals = (data.metas || []).filter((goal) => goal.status === 'concluida' && goal.dataConclusao && getMonthKey(goal.dataConclusao) === key);
    const activeGoals = (data.metas || []).filter((goal) => goal.status !== 'concluida');
    const totalGoals = completedGoals.length + activeGoals.length;
    const goalsPct = totalGoals ? completedGoals.length / totalGoals * 100 : 0;
    const achievements = (data.conquistas || []).filter((achievement) => achievement.data && getMonthKey(achievement.data) === key);

    return {
      id: `${user?.id || 'user'}__${key}`,
      monthKey: key,
      label: getMonthLabel(key),
      createdAt: new Date().toISOString(),
      receitaTotal,
      despesasTotal,
      economia,
      economiaPct,
      saldoFinal: closingBalance(key),
      categorias,
      categoriaMaior: categorias[0] || null,
      maiorCompra: sortedExpenses[0] ? { nome: sortedExpenses[0].nome, valor: Number(sortedExpenses[0].valor), data: sortedExpenses[0].data } : null,
      estatisticas: {
        mediaDiaria: daysInMonth ? despesasTotal / daysInMonth : 0,
        maiorGasto: sortedExpenses[0] ? Number(sortedExpenses[0].valor) : 0,
        menorGasto: sortedExpenses.length ? Number(sortedExpenses[sortedExpenses.length - 1].valor) : 0,
        maiorDiaGasto: biggestSpendDay,
        maiorDiaEconomia: bestSavingDay
      },
      movimentacoes: {
        receitas: income.length,
        despesas: expenses.length,
        transferencias: transactions.filter((transaction) => (transaction.tipo || transaction.type) === 'transferencia').length,
        total: transactions.length
      },
      metas: {
        concluidas: completedGoals.length,
        emAndamento: activeGoals.length,
        total: totalGoals,
        percentualConcluido: goalsPct,
        dinheiroGuardado: (data.metas || []).reduce((sum, goal) => sum + Number(goal.valorGuardado || 0), 0)
      },
      evolucao: {
        xpGanho: income.length * 5 + expenses.length * 3 + completedGoals.length * 30 + achievements.reduce((sum, item) => sum + Number(item.xp || 0), 0),
        nivelAlcancado: Number(data.nivel || 1),
        conquistas: achievements.map(({ id, nome, icone, xp }) => ({ id, nome, icone, xp: Number(xp || 0) }))
      },
      performance: classify(economiaPct, goalsPct, economia)
    };
  }

  function hydrateSummary(summary) {
    const number=value=>Number.isFinite(Number(value))?Number(value):0;
    for(const key of ['receitaTotal','despesasTotal','economia','economiaPct','saldoFinal'])summary[key]=number(summary[key]);
    for(const [section,keys] of Object.entries({metas:['concluidas','emAndamento','total','percentualConcluido','dinheiroGuardado'],movimentacoes:['receitas','despesas','transferencias','total'],evolucao:['xpGanho','nivelAlcancado']})){
      if(!summary[section]||typeof summary[section]!=='object'||Array.isArray(summary[section]))summary[section]={};
      for(const key of keys)summary[section][key]=number(summary[section][key]);
    }
    summary.evolucao.conquistas=Array.isArray(summary.evolucao.conquistas)?summary.evolucao.conquistas.filter(item=>item&&typeof item==='object'):[];
    summary.categorias=Array.isArray(summary.categorias)?summary.categorias.filter(item=>item&&typeof item==='object').map(item=>({...item,cor:/^#[0-9a-f]{6}$/i.test(item.cor||'')?item.cor:'#64748b',valor:number(item.valor),percentual:number(item.percentual)})):[];
    if(summary.categoriaMaior&&typeof summary.categoriaMaior==='object')summary.categoriaMaior.percentual=number(summary.categoriaMaior.percentual);else summary.categoriaMaior=null;
    const [year, month] = String(summary.monthKey || '').split('-').map(Number);
    const days = year && month ? new Date(year, month, 0).getDate() : 30;
    const maiorGasto = Number(summary.maiorCompra?.valor || 0);
    summary.label = summary.monthKey ? getMonthLabel(summary.monthKey) : summary.label;
    summary.saldoFinal = Number.isFinite(Number(summary.saldoFinal)) ? Number(summary.saldoFinal) : Number(summary.economia || 0);
    summary.estatisticas = {
      mediaDiaria: Number(summary.estatisticas?.mediaDiaria ?? (Number(summary.despesasTotal || 0) / days)),
      maiorGasto: Number(summary.estatisticas?.maiorGasto ?? maiorGasto),
      menorGasto: Number(summary.estatisticas?.menorGasto ?? (maiorGasto ? Math.min(maiorGasto, Number(summary.despesasTotal || 0) / Math.max(1, summary.movimentacoes?.despesas || 1)) : 0)),
      maiorDiaGasto: summary.estatisticas?.maiorDiaGasto || (summary.maiorCompra ? { date: summary.maiorCompra.data, despesas: summary.maiorCompra.valor } : null),
      maiorDiaEconomia: summary.estatisticas?.maiorDiaEconomia || null
    };
    summary.metas = summary.metas || { concluidas: 0, emAndamento: 0, total: 0, percentualConcluido: 0, dinheiroGuardado: 0 };
    summary.movimentacoes = summary.movimentacoes || { receitas: 0, despesas: 0, transferencias: 0, total: 0 };
    summary.evolucao = summary.evolucao || { xpGanho: 0, nivelAlcancado: 1, conquistas: [] };
    const categoryAliases = {
      Alimentacao: 'Alimentação', Saude: 'Saúde', Contas: 'Assinaturas',
      Compras: 'Outros', Educacao: 'Outros'
    };
    summary.categorias = (summary.categorias || []).map((category) => ({
      ...category,
      nome: categoryAliases[category.nome] || category.nome
    }));
    const merged = new Map();
    summary.categorias.forEach((category) => {
      const current = merged.get(category.nome) || { ...category, valor: 0 };
      current.valor += Number(category.valor || 0);
      merged.set(category.nome, current);
    });
    summary.categorias = [...merged.values()].sort((a, b) => b.valor - a.valor);
    summary.categorias.forEach((category) => {
      category.percentual = Number(summary.despesasTotal || 0) > 0
        ? Number(category.valor || 0) / Number(summary.despesasTotal) * 100
        : 0;
    });
    summary.categoriaMaior = summary.categoriaMaior || summary.categorias[0] || null;
    summary.performance = classify(Number(summary.economiaPct || 0), Number(summary.metas.percentualConcluido || 0), summary.saldoFinal);
    return summary;
  }

  async function init(appData, appUser) {
    data = appData;
    user = appUser;
    if (!Array.isArray(data.monthlySummaries)) data.monthlySummaries = [];

    data.monthlySummaries = data.monthlySummaries.filter(item=>item&&/^\d{4}-(0[1-9]|1[0-2])$/.test(item.monthKey||'')).map(hydrateSummary);


    ensureCompletedMonths();
    await persist();
  }

  function ensureCompletedMonths() {
    const currentKey = getMonthKey(new Date());
    const keys = new Set((data.historico || []).map((transaction) => getMonthKey(transaction.data)).filter(Boolean));
    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousKey = getMonthKey(previousMonth);
    const accountKey = getMonthKey(user?.dataCadastro || data.user?.dataCadastro || new Date());
    if (previousKey >= accountKey) keys.add(previousKey);
    keys.forEach((key) => {
      if (key > currentKey) return;                       // ignora datas futuras
      const existing = data.monthlySummaries.find((summary) => summary.monthKey === key);
      const previous = data.monthlySummaries
        .filter((item) => item.monthKey < key)
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0];

      if (key === currentKey) {
        // Mês em andamento: recalculado a cada visita para refletir os lançamentos atuais.
        const summary = generate(key);
        summary.emAndamento = true;
        summary.comentario = commentFor(summary, previous);
        if (existing) Object.assign(existing, summary);
        else data.monthlySummaries.push(summary);
        return;
      }

      if (existing) return;                               // meses fechados não são reescritos
      const summary = generate(key);
      summary.comentario = commentFor(summary, previous);
      data.monthlySummaries.push(summary);
    });
    data.monthlySummaries.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  async function persist() {
    if (!user || !data) return;
    try {
      // A API local recebe apenas os dados; o perfil é único por navegador.
      await EphyraStorage.saveUserData(data);
    } catch (error) {
      console.error('[MonthlySummary.persist]', error);
    }
  }

  function renderPage() {
    const container = document.getElementById('pg-resumo');
    if (!container) return;
    destroyPageObservers();
    if (data) {
      ensureCompletedMonths();
      persist().catch(() => {});
    }
    const summaries = [...(data?.monthlySummaries || [])].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    if (!summaries.length) {
      container.innerHTML = EphyraSecurity.html(`<div class="financial-summary-page"><header class="financial-summary-header"><div><h1>Resumo Financeiro</h1><p>Acompanhe sua evolução financeira mês a mês e descubra como seus hábitos mudaram ao longo do tempo.</p></div></header><div class="es"><div class="ei"><i class="fas fa-calendar-days" aria-hidden="true"></i></div><h3>Nenhum resumo disponível</h3><p>Registre suas primeiras movimentações para ver o resumo deste mês aqui.</p></div></div>`);
      return;
    }

    const latest = summaries[0];
    container.innerHTML = EphyraSecurity.html(`<div class="financial-summary-page">
      <header class="financial-summary-header">
        <div><h1>Resumo Financeiro</h1><p>Acompanhe sua evolução financeira mês a mês e descubra como seus hábitos mudaram ao longo do tempo.</p></div>
        <div class="financial-summary-ephyra"><div class="financial-summary-ephyra-mark">E</div><div><small>Visão da Ephyra</small><p>${escapeHTML(latest.comentario || commentFor(latest, null))}</p></div></div>
      </header>
      <section class="summary-history-section" aria-label="Histórico de meses">
        <h2>Histórico de meses</h2>
        <div class="summary-history-strip">${summaries.map((summary, index) => historyCard(summary, index === 0)).join('')}</div>
      </section>
      <div class="monthly-summary-sections">${summaries.map(monthSection).join('')}</div>
    </div>`);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    observeSections();
    observeCharts();
  }

  function historyCard(summary, active) {
    return `<button class="summary-history-card ${active ? 'active' : ''}" data-month-card="${summary.monthKey}" data-on-click="h83" data-arg-0="${EphyraSecurity.escapeHTML(summary.monthKey)}">
      <div><strong>${escapeHTML(summary.label)}</strong><div class="summary-history-card-value">${money(summary.economia)}</div></div>
      <div class="summary-history-card-meta"><span>${summary.economiaPct.toFixed(0)}% economizado</span><span class="summary-history-performance" style="color:${summary.performance.color}"><i class="fas ${summary.performance.icon}" aria-hidden="true"></i> ${summary.performance.label}</span></div>
    </button>`;
  }

  function monthSection(summary) {
    const spendDay = summary.estatisticas.maiorDiaGasto;
    const savingDay = summary.estatisticas.maiorDiaEconomia;
    const achievements = summary.evolucao.conquistas || [];
    return `<section class="monthly-summary-section" id="summary-month-${summary.monthKey}" data-month-section="${summary.monthKey}">
      <div class="monthly-summary-title-row"><div><span class="summary-kicker">${summary.emAndamento ? 'Mês em andamento' : 'Resumo completo'}</span><h2>${escapeHTML(summary.label)}</h2></div><span class="monthly-summary-performance" style="color:${summary.performance.color}"><i class="fas ${summary.performance.icon}" aria-hidden="true"></i> ${summary.performance.label}</span></div>
      <div class="summary-main-metrics">
        ${mainMetric('fa-arrow-up', 'Receita', money(summary.receitaTotal), '#10b981')}
        ${mainMetric('fa-arrow-down', 'Despesas', money(summary.despesasTotal), '#ef4444')}
        ${mainMetric('fa-piggy-bank', 'Economia', `${money(summary.economia)} · ${summary.economiaPct.toFixed(0)}%`, '#0f766e')}
        ${mainMetric('fa-wallet', summary.emAndamento ? 'Saldo acumulado' : 'Saldo final', money(summary.saldoFinal), '#3b82f6')}
      </div>
      <div class="monthly-summary-content-grid">
        <div class="summary-large-chart"><div class="summary-large-chart-head"><h3>Distribuição dos gastos</h3><span class="txs tm">${summary.categorias.length} categorias</span></div><div class="summary-large-chart-wrap"><canvas id="summary-chart-${summary.monthKey}" data-summary-chart="${summary.monthKey}"></canvas></div></div>
        <div class="summary-side-insights">
          ${wideInsight('fa-bag-shopping', 'Maior compra', summary.maiorCompra?.nome || 'Sem despesas', summary.maiorCompra ? `${money(summary.maiorCompra.valor)} · ${formatDate(summary.maiorCompra.data)}` : 'Nenhuma compra registrada')}
          ${wideInsight('fa-chart-pie', 'Categoria com maior gasto', summary.categoriaMaior?.nome || 'Sem categoria', summary.categoriaMaior ? `${money(summary.categoriaMaior.valor)} · ${summary.categoriaMaior.percentual.toFixed(0)}% dos gastos` : 'Sem dados')}
          ${wideInsight('fa-calendar-day', 'Maior dia de gasto', spendDay ? formatDate(spendDay.date) : 'Sem dados', spendDay ? money(spendDay.despesas) : 'Nenhum gasto registrado')}
          ${wideInsight('fa-sun', 'Maior dia de economia', savingDay ? formatDate(savingDay.date) : 'Sem dados', savingDay ? money(savingDay.economia) : 'Sem saldo diário positivo')}
        </div>
      </div>
      <div class="summary-secondary-grid">
        <div class="summary-block"><h3><i class="fas fa-chart-simple"></i> Estatísticas</h3>${blockRow('Receitas', summary.movimentacoes.receitas)}${blockRow('Despesas', summary.movimentacoes.despesas)}${blockRow('Transferências', summary.movimentacoes.transferencias)}${blockRow('Total', summary.movimentacoes.total)}${blockRow('Média diária', money(summary.estatisticas.mediaDiaria))}${blockRow('Maior gasto', money(summary.estatisticas.maiorGasto))}${blockRow('Menor gasto', money(summary.estatisticas.menorGasto))}</div>
        <div class="summary-block"><h3><i class="fas fa-bullseye"></i> Metas</h3>${blockRow('Concluídas', summary.metas.concluidas)}${blockRow('Em andamento', summary.metas.emAndamento)}${blockRow('Progresso', `${summary.metas.percentualConcluido.toFixed(0)}%`)}${blockRow('Dinheiro guardado', money(summary.metas.dinheiroGuardado))}</div>
        <div class="summary-block"><h3><i class="fas fa-star"></i> Evolução</h3>${blockRow('XP ganho', `+${summary.evolucao.xpGanho} XP`)}${blockRow('Nível alcançado', summary.evolucao.nivelAlcancado)}${blockRow('Conquistas', achievements.length)}${achievements.slice(0, 3).map(item => blockRow(item.icone || '🏆', item.nome || 'Conquista')).join('')}</div>
      </div>
      <div class="summary-month-comment"><div class="summary-month-comment-mark">E</div><div><small>Análise da Ephyra</small><p>${escapeHTML(summary.comentario || commentFor(summary, null))}</p></div></div>
    </section>`;
  }

  function mainMetric(icon, label, value, color) {
    return `<div class="summary-main-metric"><div class="summary-main-metric-top"><span class="summary-main-metric-icon" style="background:${color}1a;color:${color}"><i class="fas ${icon}"></i></span>${escapeHTML(label)}</div><strong>${escapeHTML(value)}</strong></div>`;
  }

  function wideInsight(icon, label, value, detail) {
    return `<div class="summary-wide-insight"><span class="summary-wide-insight-icon"><i class="fas ${icon}" aria-hidden="true"></i></span><div><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong><p>${escapeHTML(detail)}</p></div></div>`;
  }

  function blockRow(label, value) {
    return `<div class="summary-block-row"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
  }

  function formatDate(value) {
    if (!value) return 'Sem dados';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sem dados' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  }

  function scrollToMonth(key) {
    const section = document.getElementById(`summary-month-${key}`);
    if (!section) return;
    setActiveCard(key);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.classList.add('highlight');
    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => section.classList.remove('highlight'), 1600);
  }

  function setActiveCard(key) {
    document.querySelectorAll('[data-month-card]').forEach(card => card.classList.toggle('active', card.dataset.monthCard === key));
    document.querySelector(`[data-month-card="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function observeSections() {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelector('[data-month-section]')?.classList.add('visible');
      return;
    }
    sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveCard(visible.target.dataset.monthSection);
    }, { rootMargin: '-18% 0px -55% 0px', threshold: [0.1, 0.35, 0.65] });
    document.querySelectorAll('[data-month-section]').forEach(section => sectionObserver.observe(section));
  }

  function observeCharts() {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-summary-chart]').forEach(canvas => {
        const summary = data.monthlySummaries.find(item => item.monthKey === canvas.dataset.summaryChart);
        if (summary) renderChart(canvas, summary);
      });
      return;
    }
    chartObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const key = entry.target.dataset.summaryChart;
        const summary = data.monthlySummaries.find(item => item.monthKey === key);
        if (summary && !charts.has(key)) renderChart(entry.target, summary);
        chartObserver.unobserve(entry.target);
      });
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('[data-summary-chart]').forEach(canvas => chartObserver.observe(canvas));
  }

  function renderChart(canvas, summary) {
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      canvas.replaceWith(chartFallback(summary));
      return;
    }
    const categories = summary.categorias.length ? summary.categorias : [{ nome: 'Sem despesas', valor: 1, cor: '#334155' }];
    try {
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const chart = new Chart(canvas, {
        type: 'doughnut',
        data: { labels: categories.map(item => item.nome), datasets: [{ data: categories.map(item => item.valor), backgroundColor: categories.map(item => item.cor), borderWidth: 0, hoverOffset: 9 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '67%', animation: reducedMotion ? false : { duration: 900 }, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, padding: 14, font: { size: 11 } } } } }
      });
      charts.set(summary.monthKey, chart);
    } catch {
      canvas.replaceWith(chartFallback(summary));
    }
  }

  function chartFallback(summary) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-fallback summary-chart-fallback';
    wrapper.setAttribute('role', 'img');
    wrapper.setAttribute('aria-label', 'Distribuição de gastos por categoria');
    const categories = summary.categorias.length ? summary.categorias : [{ nome: 'Sem despesas', percentual: 0, cor: '#64748b' }];
    wrapper.innerHTML = EphyraSecurity.html(categories.slice(0, 6).map(item => `<div class="chart-fallback-row"><span style="--fallback-color:${item.cor || '#64748b'}">${escapeHTML(item.nome)}</span><strong>${Number(item.percentual || 0).toFixed(0)}%</strong></div>`).join(''));
    return wrapper;
  }

  function destroyPageObservers() {
    clearTimeout(highlightTimer);
    highlightTimer = 0;
    sectionObserver?.disconnect();
    chartObserver?.disconnect();
    sectionObserver = null;
    chartObserver = null;
    charts.forEach(chart => chart.destroy());
    charts.clear();
  }

  return { init, renderPage, scrollToMonth, generate, ensureCompletedMonths, destroy: destroyPageObservers };
})();

if (typeof window !== 'undefined') window.MonthlySummary = MonthlySummary;
