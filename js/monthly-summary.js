const MonthlySummary = (() => {
  'use strict';

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const DEMO_MONTHS = [
    { key: '2025-03', salary: 18800, extra: 2650, factor: 1.00, goals: [1, 3, 8400], xp: 184, level: 3 },
    { key: '2025-04', salary: 18800, extra: 4300, factor: .94, goals: [1, 3, 10500], xp: 212, level: 3 },
    { key: '2025-05', salary: 19600, extra: 6200, factor: 1.12, goals: [2, 3, 14200], xp: 265, level: 4 },
    { key: '2025-06', salary: 19600, extra: 4300, factor: .88, goals: [2, 4, 18300], xp: 238, level: 4 },
    { key: '2025-07', salary: 20500, extra: 7150, factor: 1.18, goals: [3, 4, 23800], xp: 312, level: 5 }
  ];

  const DEMO_EXPENSES = [
    ['Aluguel mensal', 'moradia', 3800, 3],
    ['Supermercado Central', 'alimentacao', 920, 5],
    ['Netflix', 'contas', 39.9, 6],
    ['Uber trabalho', 'transporte', 142, 7],
    ['Restaurante', 'alimentacao', 186, 9],
    ['Steam', 'lazer', 129, 10],
    ['Farmácia', 'saude', 164, 12],
    ['Internet fibra', 'contas', 119.9, 14],
    ['Posto de combustível', 'transporte', 310, 16],
    ['Mercado do bairro', 'alimentacao', 486, 18],
    ['Cinema', 'lazer', 82, 20],
    ['Energia elétrica', 'contas', 238, 21],
    ['PlayStation Plus', 'lazer', 52.9, 23],
    ['Consulta médica', 'saude', 280, 24],
    ['Feira livre', 'alimentacao', 174, 26],
    ['Compras pessoais', 'compras', 420, 27],
    ['Padaria artesanal', 'alimentacao', 48, 2],
    ['Metrô', 'transporte', 22, 4],
    ['Delivery de jantar', 'alimentacao', 76, 8],
    ['Assinatura de música', 'contas', 21.9, 11],
    ['Pet Shop', 'outros_desp', 136, 13],
    ['Café com amigos', 'alimentacao', 64, 17],
    ['Estacionamento', 'transporte', 38, 22],
    ['Livraria', 'educacao', 118, 25]
  ];

  let data = null;
  let user = null;
  const charts = new Map();
  let sectionObserver = null;
  let chartObserver = null;
  let highlightTimer = 0;

  const localKey = () => `ephyra_monthly_summaries_${String(user?.email || 'guest').replace(/[^a-z0-9]/gi, '_')}`;

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
      return { label: 'Excelente', color: '#10b981', icon: '🟢' };
    }
    if (savingsPct >= 15 && finalBalance >= 0) {
      return { label: 'Bom', color: '#3b82f6', icon: '🔵' };
    }
    if (savingsPct >= 5 || finalBalance >= 0) {
      return { label: 'Regular', color: '#f59e0b', icon: '🟡' };
    }
    return { label: 'Atenção', color: '#ef4444', icon: '🔴' };
  }

  function normalizedCategory(transaction) {
    const category = (data.categorias || []).find((item) => item.id === transaction.categoria);
    const raw = `${transaction.nome || ''} ${transaction.categoria || ''} ${category?.nome || ''}`.toLowerCase();

    if (/supermerc|mercado|feira|hortifruti|empório|emporio/.test(raw)) return ['Mercado', '#10b981'];
    if (/steam|playstation|xbox|nintendo|jogo|game/.test(raw)) return ['Jogos', '#8b5cf6'];
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
      id: `${user?.email || 'user'}__${key}`,
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

  function demoTransaction(seed, type, name, category, value, day, index) {
    const date = new Date(`${seed.key}-${String(day).padStart(2, '0')}T${String(8 + index % 11).padStart(2, '0')}:00:00`);
    return {
      id: `demo-${seed.key}-${type}-${index}`,
      tipo: type,
      nome: name,
      categoria: category,
      valor: Number(value.toFixed(2)),
      data: date.toISOString(),
      descricao: 'Movimentação histórica da conta de demonstração',
      dataCriacao: date.toISOString()
    };
  }

  function seedDemoHistory() {
    const existingKeys = new Set((data.historico || []).map((transaction) => getMonthKey(transaction.data)));
    DEMO_MONTHS.forEach((seed) => {
      if (existingKeys.has(seed.key)) return;
      const entries = [
        demoTransaction(seed, 'receita', 'Salário mensal', 'salario', seed.salary, 5, 0),
        demoTransaction(seed, 'receita', 'Projeto extra', 'freelance', seed.extra, 19, 1)
      ];
      DEMO_EXPENSES.forEach(([name, category, value, day], index) => {
        entries.push(demoTransaction(seed, 'despesa', name, category, value * seed.factor, day, index + 2));
      });
      entries.forEach((transaction) => {
        data.historico.push(transaction);
        if (transaction.tipo === 'receita') data.receitas.push(transaction);
        else data.despesas.push(transaction);
        data.saldo += transaction.tipo === 'receita' ? transaction.valor : -transaction.valor;
      });
    });
  }

  function enrichDemoSummary(summary) {
    const seed = DEMO_MONTHS.find((item) => item.key === summary.monthKey);
    if (!seed) return summary;
    summary.metas = {
      concluidas: seed.goals[0],
      emAndamento: seed.goals[1] - seed.goals[0],
      total: seed.goals[1],
      percentualConcluido: seed.goals[0] / seed.goals[1] * 100,
      dinheiroGuardado: seed.goals[2]
    };
    summary.evolucao = {
      xpGanho: seed.xp,
      nivelAlcancado: seed.level,
      conquistas: [{ id: `demo-${seed.key}`, nome: 'Mês Organizado', icone: '🏆', xp: 20 }]
    };
    summary.performance = classify(summary.economiaPct, summary.metas.percentualConcluido, summary.saldoFinal);
    return summary;
  }

  function loadLocal() {
    try {
      const stored = JSON.parse(localStorage.getItem(localKey()) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function saveLocal() {
    try {
      localStorage.setItem(localKey(), JSON.stringify(data.monthlySummaries || []));
    } catch (error) {
      console.warn('[MonthlySummary.localStorage]', error);
    }
  }

  function hydrateSummary(summary) {
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

    const local = loadLocal();
    local.forEach((summary) => {
      if (!data.monthlySummaries.some((item) => item.monthKey === summary.monthKey)) data.monthlySummaries.push(summary);
    });
    data.monthlySummaries = data.monthlySummaries.map(hydrateSummary);

    if (user?.email === 'demo@ephyra.com' && data.monthlySummaries.length === 0) seedDemoHistory();
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
      if (key >= currentKey || data.monthlySummaries.some((summary) => summary.monthKey === key)) return;
      let summary = generate(key);
      if (user?.email === 'demo@ephyra.com') summary = enrichDemoSummary(summary);
      const previous = data.monthlySummaries.filter((item) => item.monthKey < key).sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0];
      summary.comentario = commentFor(summary, previous);
      data.monthlySummaries.push(summary);
    });
    data.monthlySummaries.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  async function persist() {
    saveLocal();
    if (!user?.email) return;
    try {
      await EphyraStorage.saveUserData(user.email, data);
    } catch (error) {
      console.error('[MonthlySummary.persist]', error);
    }
  }

  function renderPage() {
    const container = document.getElementById('pg-resumo');
    if (!container) return;
    destroyPageObservers();
    const summaries = [...(data?.monthlySummaries || [])].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    if (!summaries.length) {
      container.innerHTML = `<div class="financial-summary-page"><header class="financial-summary-header"><div><h1>Resumo Financeiro</h1><p>Acompanhe sua evolução financeira mês a mês e descubra como seus hábitos mudaram ao longo do tempo.</p></div></header><div class="es"><div class="ei">📅</div><h3>Nenhum resumo disponível</h3><p>Seu primeiro resumo será criado automaticamente quando o mês terminar.</p></div></div>`;
      return;
    }

    const latest = summaries[0];
    container.innerHTML = `<div class="financial-summary-page">
      <header class="financial-summary-header">
        <div><h1>Resumo Financeiro</h1><p>Acompanhe sua evolução financeira mês a mês e descubra como seus hábitos mudaram ao longo do tempo.</p>${user?.email === 'demo@ephyra.com' ? '<span class="summary-demo-badge"><i class="fas fa-flask"></i> Histórico simulado da conta de demonstração</span>' : ''}</div>
        <div class="financial-summary-ephyra"><div class="financial-summary-ephyra-mark">E</div><div><small>Visão da Ephyra</small><p>${escapeHTML(latest.comentario || commentFor(latest, null))}</p></div></div>
      </header>
      <section class="summary-history-section" aria-label="Histórico de meses">
        <h2>Histórico de meses</h2>
        <div class="summary-history-strip">${summaries.map((summary, index) => historyCard(summary, index === 0)).join('')}</div>
      </section>
      <div class="monthly-summary-sections">${summaries.map(monthSection).join('')}</div>
    </div>`;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    observeSections();
    observeCharts();
  }

  function historyCard(summary, active) {
    return `<button class="summary-history-card ${active ? 'active' : ''}" data-month-card="${summary.monthKey}" onclick="MonthlySummary.scrollToMonth('${summary.monthKey}')">
      <div><strong>${escapeHTML(summary.label)}</strong><div class="summary-history-card-value">${money(summary.economia)}</div></div>
      <div class="summary-history-card-meta"><span>${summary.economiaPct.toFixed(0)}% economizado</span><span class="summary-history-performance" style="color:${summary.performance.color}">${summary.performance.icon} ${summary.performance.label}</span></div>
    </button>`;
  }

  function monthSection(summary) {
    const spendDay = summary.estatisticas.maiorDiaGasto;
    const savingDay = summary.estatisticas.maiorDiaEconomia;
    const achievements = summary.evolucao.conquistas || [];
    return `<section class="monthly-summary-section" id="summary-month-${summary.monthKey}" data-month-section="${summary.monthKey}">
      <div class="monthly-summary-title-row"><div><span class="summary-kicker">Resumo completo</span><h2>${escapeHTML(summary.label)}</h2></div><span class="monthly-summary-performance" style="color:${summary.performance.color}">${summary.performance.icon} ${summary.performance.label}</span></div>
      <div class="summary-main-metrics">
        ${mainMetric('fa-arrow-up', 'Receita', money(summary.receitaTotal), '#10b981')}
        ${mainMetric('fa-arrow-down', 'Despesas', money(summary.despesasTotal), '#ef4444')}
        ${mainMetric('fa-piggy-bank', 'Economia', `${money(summary.economia)} · ${summary.economiaPct.toFixed(0)}%`, '#7c3aed')}
        ${mainMetric('fa-wallet', 'Saldo final', money(summary.saldoFinal), '#3b82f6')}
      </div>
      <div class="monthly-summary-content-grid">
        <div class="summary-large-chart"><div class="summary-large-chart-head"><h3>Distribuição dos gastos</h3><span class="txs tm">${summary.categorias.length} categorias</span></div><div class="summary-large-chart-wrap"><canvas id="summary-chart-${summary.monthKey}" data-summary-chart="${summary.monthKey}"></canvas></div></div>
        <div class="summary-side-insights">
          ${wideInsight('🛍️', 'Maior compra', summary.maiorCompra?.nome || 'Sem despesas', summary.maiorCompra ? `${money(summary.maiorCompra.valor)} · ${formatDate(summary.maiorCompra.data)}` : 'Nenhuma compra registrada')}
          ${wideInsight('📊', 'Categoria com maior gasto', summary.categoriaMaior?.nome || 'Sem categoria', summary.categoriaMaior ? `${money(summary.categoriaMaior.valor)} · ${summary.categoriaMaior.percentual.toFixed(0)}% dos gastos` : 'Sem dados')}
          ${wideInsight('📅', 'Maior dia de gasto', spendDay ? formatDate(spendDay.date) : 'Sem dados', spendDay ? money(spendDay.despesas) : 'Nenhum gasto registrado')}
          ${wideInsight('☀️', 'Maior dia de economia', savingDay ? formatDate(savingDay.date) : 'Sem dados', savingDay ? money(savingDay.economia) : 'Sem saldo diário positivo')}
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
    return `<div class="summary-wide-insight"><span class="summary-wide-insight-icon">${icon}</span><div><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong><p>${escapeHTML(detail)}</p></div></div>`;
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
    wrapper.innerHTML = categories.slice(0, 6).map(item => `<div class="chart-fallback-row"><span style="--fallback-color:${item.cor || '#64748b'}">${escapeHTML(item.nome)}</span><strong>${Number(item.percentual || 0).toFixed(0)}%</strong></div>`).join('');
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
