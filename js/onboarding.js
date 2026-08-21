/**
 * Ephyra Finance — Onboarding Interactive Tutorial
 * Manages the onboarding experience for first-time users.
 * Integrated with the SPA architecture and IndexedDB session.
 */
const EphyraOnboarding = (() => {
  'use strict';

  const KEY_PREFIX = 'ephyra_tutorial_completed_';

  // State
  let data = null;
  let user = null;
  let currentStep = 0;
  let active = false;

  const STEPS = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Ephyra Finance',
      description: 'O Ephyra Finance foi criado para ajudar você a entender, organizar e acompanhar sua vida financeira de forma simples. Desenvolvido com uma proposta moderna, gamificada e independente de servidores, você terá total privacidade para dominar suas finanças.',
      image: 'tutorialwelcome.png',
      icon: 'fa-hand-wave',
      iconChar: '👋'
    },
    {
      id: 'dashboard',
      title: 'Seu Dashboard',
      description: 'O seu Dashboard apresenta uma visão geral completa de sua saúde financeira. Nele você pode acompanhar o saldo disponível consolidado, receitas totais, despesas acumuladas, economias, suas metas ativas, as conquistas alcançadas e gráficos dinâmicos de suas categorias de gastos.',
      image: 'tutorial-dashboard.png',
      icon: 'fa-chart-pie',
      iconChar: '📊'
    },
    {
      id: 'transactions',
      title: 'Controle suas movimentações',
      description: 'Registre suas receitas, despesas e transferências com facilidade. Classifique por categorias, datas e insira descrições. O sistema também suporta lançamentos internacionais com conversão automática. Cada lançamento alimenta instantaneamente suas estatísticas e evolução de nível.',
      image: 'tutorial-transacoes.png',
      icon: 'fa-exchange-alt',
      iconChar: '💳'
    },
    {
      id: 'goals',
      title: 'Defina seus objetivos',
      description: 'Quer comprar algo especial ou poupar para sua independência? Crie metas financeiras completas, defina o valor objetivo, cor e prioridade. Guarde dinheiro diretamente das suas economias com um único clique. O sistema desconta o valor do saldo disponível e calcula o progresso.',
      image: 'tutorial-metas.png',
      icon: 'fa-bullseye',
      iconChar: '🎯'
    },
    {
      id: 'market',
      title: 'Acompanhe o Mercado',
      description: 'Explore uma central financeira completa integrada de moedas mundiais e criptomoedas com cotação em tempo real e gráficos de períodos. Você pode favoritar moedas para visualização rápida, converter instantaneamente qualquer ativo e criar alertas de limites para receber avisos.',
      image: 'tutorial-mercado.png',
      icon: 'fa-globe',
      iconChar: '💱'
    },
    {
      id: 'summary',
      title: 'Veja sua evolução',
      description: 'A página de Resumo Financeiro guarda um histórico permanente de meses passados. No final de cada mês, o sistema gera automaticamente estatísticas, médias diárias, gráficos de distribuição de gastos, metas concluídas e o nível alcançado para você comparar sua jornada.',
      image: 'tutorial-resumo.png',
      icon: 'fa-calendar-alt',
      iconChar: '📅'
    },
    {
      id: 'gamification',
      title: 'Transforme sua evolução em progresso',
      description: 'Cada boa prática financeira gera pontos de experiência (XP). Suba de nível registrando transações, poupando em metas, acessando o app diariamente ou resgatando conquistas de conquistas. Há mais de uma dezena de troféus, incluindo um código secreto que concede conquistas secretas!',
      image: 'tutorial-conquistas.png',
      icon: 'fa-trophy',
      iconChar: '🏆'
    },
    {
      id: 'ephyra',
      title: 'A Ephyra está aqui para ajudar',
      description: 'Nossa inteligência financeira integrada fornece visões analíticas automáticas baseadas exclusivamente nas suas movimentações diárias. Ela analisa seu comportamento e dá dicas motivacionais úteis para melhorar seu controle financeiro, sem tratar decisões como garantias.',
      image: 'tutorial-ephyra.png',
      icon: 'fa-comment',
      iconChar: '🧜‍♀️'
    },
    {
      id: 'ready',
      title: 'Tudo pronto!',
      description: 'Agora você já conhece as principais ferramentas do Ephyra Finance. Seus dados estão 100% seguros e são armazenados localmente no IndexedDB do seu próprio navegador. Comece registrando suas movimentações diárias e sinta a diferença de um controle inteligente.',
      image: 'tutorial-ready.png',
      icon: 'fa-circle-check',
      iconChar: '🚀'
    }
  ];

  function getStorageKey() {
    return KEY_PREFIX + String(user?.email || 'guest').replace(/[^a-z0-9]/gi, '_');
  }

  function isCompleted() {
    return localStorage.getItem(getStorageKey()) === 'true';
  }

  function setCompleted(val) {
    if (val) {
      localStorage.setItem(getStorageKey(), 'true');
    } else {
      localStorage.removeItem(getStorageKey());
    }
  }

  function renderIndicator() {
    return STEPS.map((_, idx) => {
      const activeClass = idx === currentStep ? 'active' : '';
      const completedClass = idx < currentStep ? 'completed' : '';
      return `<span class="onboarding-dot ${activeClass} ${completedClass}" aria-label="Etapa ${idx + 1}" role="presentation"></span>`;
    }).join('');
  }

  function renderCard() {
    const step = STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;

    // We build a highly elegant, customizable image block that tries to load the asset,
    // but falls back to a gorgeous placeholder card with premium dark gradients if the file isn't present yet.
    const imagePath = `./${step.image}`;

    return `
      <div class="onboarding-card anim-scale">
        <div class="onboarding-text-side">
          <span class="eyebrow"><i class="fas ${step.id === 'ready' ? 'fa-circle-check' : 'fa-graduation-cap'}"></i> Tutorial • Etapa ${currentStep + 1} de ${STEPS.length}</span>
          <h2 class="onboarding-title">${step.title}</h2>
          <p class="onboarding-desc">${step.description}</p>
          <div class="onboarding-footer">
            <div class="onboarding-dots-container" aria-label="Indicador de progresso">
              ${renderIndicator()}
            </div>
            <div class="onboarding-actions">
              ${!isFirst ? `<button class="btn btn-ghost btn-sm" onclick="EphyraOnboarding.prev()"><i class="fas fa-chevron-left"></i> Voltar</button>` : ''}
              ${!isLast ? `
                <button class="btn btn-ghost btn-sm" onclick="EphyraOnboarding.skip()">Pular</button>
                <button class="btn btn-primary btn-sm" id="onboarding-next-btn" onclick="EphyraOnboarding.next()">Próximo <i class="fas fa-chevron-right"></i></button>
              ` : `
                <button class="btn btn-success btn-sm btn-bounce" onclick="EphyraOnboarding.finish()"><i class="fas fa-check"></i> Começar a usar o Ephyra</button>
              `}
            </div>
          </div>
        </div>
        <div class="onboarding-image-side">
          <div class="onboarding-image-container">
            <!-- Actual image, hidden if failed to load -->
            <img class="onboarding-real-image" src="${imagePath}" alt="${step.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <!-- Elegant placeholder fallback -->
            <div class="onboarding-placeholder">
              <span class="onboarding-placeholder-icon">${step.iconChar}</span>
              <span class="onboarding-placeholder-tag">Área reservada para imagem</span>
              <span class="onboarding-placeholder-file">${step.image}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function ensureScreen() {
    let screen = document.getElementById('onboarding-screen');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'onboarding-screen';
      screen.className = 'onboarding-overlay hidden';
      document.body.appendChild(screen);
    }
    return screen;
  }

  function show() {
    active = true;
    currentStep = 0;
    const screen = ensureScreen();
    screen.classList.remove('hidden');
    screen.innerHTML = renderCard();
    document.body.style.overflow = 'hidden'; // block page scroll
    
    // Key bindings
    if (!window.onboardingBound) {
      document.addEventListener('keydown', handleKeydown);
      window.onboardingBound = true;
    }
  }

  function handleKeydown(e) {
    if (!active) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape') skip();
  }

  function hide() {
    active = false;
    const screen = document.getElementById('onboarding-screen');
    if (screen) screen.classList.add('hidden');
    document.body.style.overflow = ''; // restore scroll
  }

  function next() {
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      const screen = document.getElementById('onboarding-screen');
      if (screen) {
        screen.innerHTML = renderCard();
        const btn = document.getElementById('onboarding-next-btn');
        if (btn) btn.focus();
      }
    }
  }

  function prev() {
    if (currentStep > 0) {
      currentStep--;
      const screen = document.getElementById('onboarding-screen');
      if (screen) {
        screen.innerHTML = renderCard();
      }
    }
  }

  function skip() {
    if (typeof Toast !== 'undefined') Toast.i('Tutorial pulado');
    finish();
  }

  function finish() {
    setCompleted(true);
    hide();
    if (typeof Toast !== 'undefined') Toast.s('🎉 Bem-vindo! Bons investimentos.');
  }

  async function check(appData, appUser) {
    data = appData;
    user = appUser;
    if (!isCompleted()) {
      // Trigger tutorial automatically on first access after login
      setTimeout(() => show(), 800);
    }
  }

  function reset() {
    setCompleted(false);
    show();
    if (typeof Toast !== 'undefined') Toast.i('Iniciando o tutorial de primeiro acesso');
  }

  return { init: check, show, hide, next, prev, skip, finish, isCompleted, reset };
})();

if (typeof window !== 'undefined') window.EphyraOnboarding = EphyraOnboarding;
