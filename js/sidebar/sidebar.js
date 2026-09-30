const Sidebar = (() => {
  let _hoverTimer = null;
  let _initialized = false;
  const COLLAPSED_WIDTH = 72;
  const EXPANDED_WIDTH = 260;

  function init() {
    const sb = document.getElementById('sidebar');
    if (!sb || _initialized) return;
    _initialized = true;

    sb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        collapse();
      }
    });

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

    const trigger = document.getElementById('sb-money-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => expand());
    }
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
