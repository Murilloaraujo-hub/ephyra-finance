/**
 * Ephyra Finance vNEXT — Sidebar Inteligente
 * - Default recolhida (72px) mostrando só logo, ícone dinheiro, engrenagem e perfil
 * - Expand on hover (desktop), on tap (tablet), via menu button (mobile)
 * - Animações suaves, sem reflow, acessível (keyboard, ARIA)
 */
const Sidebar = (() => {
  let _hoverTimer = null;
  let _initialized = false;
  const COLLAPSED_WIDTH = 72;
  const EXPANDED_WIDTH = 260;

  function init() {
    const sb = document.getElementById('sidebar');
    if (!sb || _initialized) return;
    _initialized = true;

    // A11y: make nav items focusable
    sb.querySelectorAll('.ni, .sb-gear, .sp, .sb-money-trigger').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
    });

    // Keyboard navigation
    sb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('.ni, .sb-gear, .sp, .sb-money-trigger');
        if (target) {
          e.preventDefault();
          target.click();
        }
      }
      if (e.key === 'Escape') {
        collapse();
      }
    });

    // Hover logic (desktop)
    sb.addEventListener('mouseenter', () => {
      if (window.innerWidth > 1024) {
        clearTimeout(_hoverTimer);
        expand();
      }
    });

    sb.addEventListener('mouseleave', () => {
      if (window.innerWidth > 1024) {
        _hoverTimer = setTimeout(() => collapse(), 180);
      }
    });

    // Money trigger click expands
    const trigger = document.getElementById('sb-money-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => expand());
    }

    // Mobile menu button already handled by App.tsb
  }

  function expand() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    sb.classList.add('expanded');
    sb.setAttribute('aria-expanded', 'true');
  }

  function collapse() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    sb.classList.remove('expanded');
    sb.setAttribute('aria-expanded', 'false');
  }

  function toggle(force) {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const shouldExpand = force !== undefined ? force : !sb.classList.contains('expanded');
    if (shouldExpand) expand();
    else collapse();
    // For mobile overlay
    const ov = document.querySelector('.sov');
    if (window.innerWidth <= 1024) {
      sb.classList.toggle('o', shouldExpand);
      if (ov) ov.classList.toggle('a', shouldExpand);
    }
  }

  function isExpanded() {
    const sb = document.getElementById('sidebar');
    return sb ? sb.classList.contains('expanded') : false;
  }

  return { init, expand, collapse, toggle, isExpanded, COLLAPSED_WIDTH, EXPANDED_WIDTH };
})();
if(typeof window!=='undefined') window.Sidebar=Sidebar;
