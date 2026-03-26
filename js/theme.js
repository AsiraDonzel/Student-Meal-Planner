/**
 * theme.js – Multi-theme manager
 */

const Theme = (() => {
  const KEY = 'smp_theme';
  const html = document.documentElement;

  function get() {
    return localStorage.getItem(KEY) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function apply(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    const sel = document.getElementById('theme-selector');
    if (sel) sel.value = theme;
  }

  function init() {
    apply(get());
    
    // Header toggle cycles dark/light only
    const headerToggle = document.getElementById('theme-toggle');
    if (headerToggle) {
      headerToggle.addEventListener('click', () => {
        // If they are on forest/sunset and they click the header moon icon, reset to dark/light
        const current = get();
        const next = (current === 'light' || current === 'sunset') ? 'dark' : 'light';
        apply(next);
      });
    }

    // Settings Dropdown setter
    const sel = document.getElementById('theme-selector');
    if (sel) {
      sel.addEventListener('change', (e) => apply(e.target.value));
    }
  }

  return { init, get, apply };
})();
