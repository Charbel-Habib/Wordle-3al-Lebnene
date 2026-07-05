/**
 * 3al Lebnene — Beirut Times
 * About & Testimonials page logic. Mirrors the ThemeManager and
 * SparkleField from js/main.js so this page can stay a standalone
 * entry point without pulling in the game bootstrap.
 */

/* =========================================================
 * ThemeManager — dark/light toggle, remembers choice
 * ========================================================= */
class ThemeManager {
  constructor(toggleBtn, iconEl) {
    this.toggleBtn = toggleBtn;
    this.iconEl = iconEl;
    this.storageKey = 'lebnene-theme';
    this.theme = localStorage.getItem(this.storageKey) || 'dark';
    this.apply();
    this.toggleBtn.addEventListener('click', () => this.toggle());
  }

  apply() {
    if (this.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      this.iconEl.textContent = '☀';
    } else {
      document.documentElement.removeAttribute('data-theme');
      this.iconEl.textContent = '☾';
    }
  }

  toggle() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(this.storageKey, this.theme);
    this.apply();
  }
}

/* =========================================================
 * SparkleField — ambient drifting sparkle particles
 * ========================================================= */
class SparkleField {
  constructor(container, count = 28) {
    this.container = container;
    this.count = count;
    this.render();
  }

  render() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.count; i++) {
      const dot = document.createElement('span');
      dot.className = 'sparkle';
      const size = (Math.random() * 2.5 + 1).toFixed(1);
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.bottom = `-${Math.random() * 20}px`;
      dot.style.animationDuration = `${(Math.random() * 10 + 10).toFixed(1)}s`;
      dot.style.animationDelay = `${(Math.random() * 10).toFixed(1)}s`;
      fragment.appendChild(dot);
    }
    this.container.appendChild(fragment);
  }
}

/* =========================================================
 * Bootstrap the page
 * ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager(
    document.getElementById('theme-toggle'),
    document.getElementById('theme-icon')
  );

  new SparkleField(document.getElementById('sparkle-layer'));
});
