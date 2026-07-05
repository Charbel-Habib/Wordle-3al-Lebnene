/**
 * Wordle 3al Lebnene — Beirut Times
 * Main menu logic. Pure ES6 classes, no jQuery, no build step.
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
 * (stand-in for sea/star glints; sits under the future bg photo)
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
 * TileTitle — builds "Wordle 3al Lebnene" as Wordle-style tiles
 * that flip in with a staggered delay, then float gently.
 * ========================================================= */
class TileTitle {
  constructor(el, text) {
    this.el = el;
    this.text = text;
    this.render();
  }

  render() {
    const palette = ['', 'tile--cedar', 'tile--accent2'];
    let paletteIndex = 0;
    let delay = 0;
    [...this.text].forEach((char) => {
      const span = document.createElement('span');

      if (char === ' ') {
        span.className = 'tile tile--gap';
        span.setAttribute('aria-hidden', 'true');
        this.el.appendChild(span);
        return;
      }

      const variant = palette[paletteIndex % palette.length];
      paletteIndex++;
      span.className = `tile ${variant}`.trim();
      span.style.setProperty('--delay', `${delay}s`);
      delay += 0.09;

      const letterEl = document.createElement('span');
      letterEl.className = 'tile__letter';
      letterEl.textContent = char;
      span.appendChild(letterEl);

      this.el.appendChild(span);
    });
  }
}

/* =========================================================
 * StartTrigger — any tap/click starts the game.
 * Ignores taps that land on the topbar icons or the info modal
 * so those keep working independently, then hands off to the
 * supplied callback to actually kick off the game.
 * ========================================================= */
class StartTrigger {
  constructor(zoneEl, excludedSelectors = [], onActivate = () => {}) {
    this.zoneEl = zoneEl;
    this.excludedSelectors = excludedSelectors;
    this.onActivate = onActivate;
    this.zoneEl.addEventListener('click', (event) => this.handleClick(event));
  }

  handleClick(event) {
    const clickedExcluded = this.excludedSelectors.some((selector) =>
      event.target.closest(selector)
    );
    if (clickedExcluded) return;

    this.onActivate();
  }
}

/* =========================================================
 * WikipediaSectionLoader — fetches a single section of the
 * "Wordle" Wikipedia article via the public parse API and turns
 * its raw (HTML) markup into clean plain text: strips edit-section
 * links, citation markers, embedded <style>/<link> noise and the
 * references list, keeping just the heading + paragraph prose.
 * ========================================================= */
class WikipediaSectionLoader {
  static endpoint = 'https://en.wikipedia.org/w/api.php';

  static async fetchSection(section) {
    const url = `${WikipediaSectionLoader.endpoint}?action=parse&page=Wordle&section=${section}&prop=text&format=json&origin=*`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Wikipedia request failed (${response.status})`);

    const data = await response.json();
    const html = data?.parse?.text?.['*'];
    if (!html) throw new Error('Unexpected Wikipedia response shape');

    return WikipediaSectionLoader.parseSection(html);
  }

  /** Strips the Wikipedia section HTML down to a { title, paragraphs } pair. */
  static parseSection(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('.mw-editsection, sup.reference, .mw-references-wrap, style, link, table').forEach((el) => el.remove());

    const heading = doc.querySelector('h2, h3');
    const title = heading ? heading.textContent.trim() : '';

    const paragraphs = [...doc.querySelectorAll('p')]
      .map((p) => p.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    return { title, paragraphs };
  }
}

/* =========================================================
 * InfoModal — fetches { gameplay, earlyDevelopment, risePopularity }
 * straight from Wikipedia's "Wordle" article (sections 1, 3 and 4
 * respectively). Each section's text is split into an array of
 * paragraph strings; the sections array itself (3 elements) IS the
 * pages array — true pagination, one page per array element — with
 * every paragraph of a section rendered together on that one page.
 * ========================================================= */
class InfoModal {
  constructor({ backdrop, panel, closeBtn, openBtn, loadingEl, errorEl, retryBtn, bodyEl, eyebrowEl, titleEl, textEl, prevBtn, nextBtn, dotsEl }) {
    this.backdrop = backdrop;
    this.panel = panel;
    this.closeBtn = closeBtn;
    this.openBtn = openBtn;
    this.loadingEl = loadingEl;
    this.errorEl = errorEl;
    this.retryBtn = retryBtn;
    this.bodyEl = bodyEl;
    this.eyebrowEl = eyebrowEl;
    this.titleEl = titleEl;
    this.textEl = textEl;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.dotsEl = dotsEl;

    this.sections = [];
    this.pages = [];
    this.currentPage = 0;
    this.hasLoaded = false;

    this.bindEvents();
  }

  bindEvents() {
    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    this.retryBtn.addEventListener('click', () => this.loadSections());
    this.prevBtn.addEventListener('click', () => this.goTo(this.currentPage - 1));
    this.nextBtn.addEventListener('click', () => this.goTo(this.currentPage + 1));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.panel.closest('.info-modal').hidden) {
        this.close();
      }
    });
  }

  open() {
    this.backdrop.hidden = false;
    this.panel.closest('.info-modal').hidden = false;
    if (!this.hasLoaded) this.loadSections();
  }

  close() {
    this.backdrop.hidden = true;
    this.panel.closest('.info-modal').hidden = true;
  }

  setState(state) {
    this.loadingEl.hidden = state !== 'loading';
    this.errorEl.hidden = state !== 'error';
    this.bodyEl.hidden = state !== 'loaded';
  }

  async loadSections() {
    this.setState('loading');
    try {
      const data = await this.fetchSections();
      this.sections = [
        { key: 'gameplay', label: 'Gameplay', paragraphs: data.gameplay.paragraphs },
        { key: 'earlyDevelopment', label: 'Early Development', paragraphs: data.earlyDevelopment.paragraphs },
        { key: 'risePopularity', label: 'Rise in Popularity', paragraphs: data.risePopularity.paragraphs },
      ];

      // True pagination: the sections array (3 elements) doubles as the
      // pages array — one page rendered per array element.
      this.pages = this.sections;

      this.hasLoaded = true;
      this.renderDots();
      this.goTo(0);
      this.setState('loaded');
    } catch (err) {
      console.error('InfoModal fetch failed:', err);
      this.setState('error');
    }
  }

  /**
   * Pulls sections 1 (Gameplay), 3 (Early development) and 4 (Rise in
   * popularity) from Wikipedia's "Wordle" article in parallel.
   */
  async fetchSections() {
    const [gameplay, earlyDevelopment, risePopularity] = await Promise.all([
      WikipediaSectionLoader.fetchSection(1),
      WikipediaSectionLoader.fetchSection(3),
      WikipediaSectionLoader.fetchSection(4),
    ]);

    return {
      gameplay: { title: gameplay.title || 'Gameplay', paragraphs: gameplay.paragraphs },
      earlyDevelopment: { title: earlyDevelopment.title || 'Early Development', paragraphs: earlyDevelopment.paragraphs },
      risePopularity: { title: risePopularity.title || 'Rise in Popularity', paragraphs: risePopularity.paragraphs },
    };
  }

  renderDots() {
    this.dotsEl.innerHTML = '';
    this.pages.forEach((page, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'pager__dot';
      dot.setAttribute('aria-label', `Show ${page.label}`);
      dot.addEventListener('click', () => this.goTo(index));
      this.dotsEl.appendChild(dot);
    });
  }

  goTo(index) {
    if (index < 0 || index >= this.pages.length) return;
    this.currentPage = index;
    const page = this.pages[index];

    this.eyebrowEl.textContent = page.label;
    this.titleEl.textContent = page.title;

    const paragraphEls = page.paragraphs.map((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      return p;
    });
    this.textEl.replaceChildren(...paragraphEls);

    [...this.dotsEl.children].forEach((dot, i) => {
      dot.classList.toggle('pager__dot--active', i === index);
    });

    this.prevBtn.disabled = index === 0;
    this.nextBtn.disabled = index === this.pages.length - 1;
  }
}

/* =========================================================
 * THEMES — the three word categories a game can draw from.
 * A theme is picked at random each time a game starts.
 * ========================================================= */
const WORD_LENGTH = 5;
const MAX_TRIES = 6;

const THEMES = [
  {
    id: 'names',
    label: 'Most Common Lebanese Names',
    words: [
      'KARIM', 'RABIH', 'ZEINA', 'DALIA', 'LAYAL',
      'NADIA', 'HALIM', 'JOUDY', 'RANIA','ABBAS','AHMAD','ADNAN','BILAL',
      'CHADI','ELIAS','FARES','GHAZI','KAMAL','MALEK','NABIL','NABIH','MAZEN',
      'TAREK','NAJEM','NADER','SAMER','AMANY','CARLA','DANIA','DIANA','FARAH','GHADA',
      'HANAN','LAYAL','LAYLA','NANCY','NAWAL','RANIA','SALMA','SARAH','SOUAD','JAMIL',
      'KARAM','MALAK',
    ],
  },
  {
    id: 'food',
    label: 'Most Common Lebanese Food',
    words: [
      'KEBBE', 'LABNE', 'TAOUK', 'SFIHA', 'KAAKE',
      'HUMUS', 'FATTE', 'BATI5', 'KNAFE', '3ADAS','LAHME','SALAD','KAFTA','HOMOS',
      'AJAME','WARAK','KNEFE','KOUSA','BAKLE','BAKLA','JEBNE','7ARRR','SAMAK','REZZZ',
      'KHYAR','3ASAL','ACHTA',
    ],
  },
  {
    id: 'words',
    label: 'Most Daily Used Lebanese Words',
    words: [
      'YALLA', 'HELWE', 'KIFAK', 'TAYEB', 'HABIB',
      'SADI2', 'AKEED', 'DALLE', 'KAMEN', 'MERCI',
      'WALLA', 'SKOTT','MESHE','WADE3','WELI3','SAHRA','DA5IN','ZHE2T','MAYIL',
      'ACHTA','JAMEL','ANAKA','3AFEK',
    ],
  },
];

/* =========================================================
 * WordBank — picks a random theme and resolves words/guess
 * validity against whichever theme's list is currently active.
 * ========================================================= */
class WordBank {
  static pickTheme() {
    return THEMES[Math.floor(Math.random() * THEMES.length)];
  }

  static randomWord(words) {
    return words[Math.floor(Math.random() * words.length)];
  }

  static isValidGuess(word, words) {
    return words.includes(word.toUpperCase());
  }
}

/* =========================================================
 * SoundEngine — synthesizes every sound effect on the fly with
 * the Web Audio API (no external audio files needed). Lazily
 * creates its AudioContext on the first sound, which keeps it
 * compliant with browser autoplay policies (always triggered
 * from a user gesture: a keypress or click).
 * ========================================================= */
class SoundEngine {
  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, duration, { type = 'sine', gain = 0.15, delay = 0 } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  noise(duration, { gain = 0.2, filterFreq = 800, delay = 0 } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gainNode = ctx.createGain();

    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter).connect(gainNode).connect(ctx.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.05);
  }

  typing() {
    this.tone(500 + Math.random() * 80, 0.045, { type: 'square', gain: 0.05 });
  }

  delete() {
    this.tone(220, 0.05, { type: 'square', gain: 0.05 });
  }

  flip() {
    this.tone(340, 0.09, { type: 'triangle', gain: 0.08 });
  }

  correctWord() {
    [523.25, 659.25, 783.99].forEach((freq, i) =>
      this.tone(freq, 0.18, { type: 'sine', gain: 0.13, delay: i * 0.09 })
    );
  }

  winMusic() {
    const melody = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    melody.forEach((freq, i) =>
      this.tone(freq, 0.28, { type: 'triangle', gain: 0.11, delay: i * 0.16 })
    );
  }

  earthquake() {
    this.noise(1.1, { gain: 0.22, filterFreq: 120 });
    this.tone(45, 1.1, { type: 'sine', gain: 0.18 });
  }

  thunder() {
    this.noise(0.9, { gain: 0.28, filterFreq: 2600 });
    this.tone(55, 1.3, { type: 'sawtooth', gain: 0.2, delay: 0.05 });
  }

  hint() {
    [880, 1174.66].forEach((freq, i) =>
      this.tone(freq, 0.16, { type: 'sine', gain: 0.12, delay: i * 0.1 })
    );
  }
}

/* =========================================================
 * WeatherBackground — ambient, purely decorative animation
 * layer behind the board. Picks one of four weather types at
 * random every new game. Hazard effects (earthquake / power
 * outage) paint temporarily on top of this layer and this
 * layer keeps running underneath, unaffected.
 * ========================================================= */
class WeatherBackground {
  static types = ['rain', 'snow', 'thunder', 'meteor'];

  constructor(layerEl, soundEngine) {
    this.layerEl = layerEl;
    this.soundEngine = soundEngine;
    this.timerId = null;
  }

  start() {
    this.stop();
    const type = WeatherBackground.types[Math.floor(Math.random() * WeatherBackground.types.length)];
    this.type = type;
    this.layerEl.className = `weather-layer weather-layer--${type}`;

    if (type === 'rain') this.renderRain();
    else if (type === 'snow') this.renderSnow();
    else if (type === 'thunder') this.renderAmbientThunder();
    else if (type === 'meteor') this.renderMeteors();

    return type;
  }

  stop() {
    window.clearTimeout(this.timerId);
    window.clearInterval(this.timerId);
    this.timerId = null;
    if (this.layerEl) {
      this.layerEl.innerHTML = '';
      this.layerEl.className = 'weather-layer';
    }
  }

  renderRain() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 70; i++) {
      const drop = document.createElement('span');
      drop.className = 'weather-drop';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDuration = `${(Math.random() * 0.4 + 0.5).toFixed(2)}s`;
      drop.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
      fragment.appendChild(drop);
    }
    this.layerEl.appendChild(fragment);
  }

  renderSnow() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 45; i++) {
      const flake = document.createElement('span');
      flake.className = 'weather-flake';
      const size = (Math.random() * 3 + 2).toFixed(1);
      flake.style.width = `${size}px`;
      flake.style.height = `${size}px`;
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.animationDuration = `${(Math.random() * 4 + 5).toFixed(2)}s`;
      flake.style.animationDelay = `${(Math.random() * 6).toFixed(2)}s`;
      fragment.appendChild(flake);
    }
    this.layerEl.appendChild(fragment);
  }

  /**
   * Ambient thunder isn't on a fixed timer — every few seconds it "rolls
   * the dice" and only sometimes actually flashes, so strikes land at
   * unpredictable intervals and, on average, much less often than before.
   */
  renderAmbientThunder() {
    const flashEl = document.createElement('div');
    flashEl.className = 'weather-flash';
    this.layerEl.appendChild(flashEl);

    const scheduleCheck = () => {
      this.timerId = window.setTimeout(() => {
        if (Math.random() < 0.3) {
          flashEl.classList.remove('weather-flash--active');
          void flashEl.offsetWidth; // reflow to restart the animation
          flashEl.classList.add('weather-flash--active');
          this.soundEngine?.thunder();
        }
        scheduleCheck();
      }, Math.random() * 8000 + 5000);
    };
    scheduleCheck();
  }

  renderMeteors() {
    const spawnMeteor = () => {
      const meteor = document.createElement('span');
      meteor.className = 'weather-meteor';
      meteor.style.top = `${Math.random() * 30}%`;
      meteor.style.left = `${Math.random() * 80 + 10}%`;
      meteor.style.animationDuration = `${(Math.random() * 0.6 + 0.9).toFixed(2)}s`;
      this.layerEl.appendChild(meteor);
      window.setTimeout(() => meteor.remove(), 1600);
    };
    spawnMeteor();
    this.timerId = window.setInterval(spawnMeteor, 900);
  }
}

/* =========================================================
 * HazardManager — random "acts of nature" rolled once per try.
 * Earthquake shakes the board and rumbles; a power outage hides
 * the keyboard and flashes lightning for a few seconds. Kept
 * separate from GameLogic/BoardRenderer so those stay focused
 * on pure rules and normal-state rendering respectively.
 * ========================================================= */
class HazardManager {
  constructor({ boardEl, keyboardEl, outageOverlayEl, outagePopupEl, soundEngine }, chance = 0.1) {
    this.boardEl = boardEl;
    this.keyboardEl = keyboardEl;
    this.outageOverlayEl = outageOverlayEl;
    this.outagePopupEl = outagePopupEl;
    this.soundEngine = soundEngine;
    this.chance = chance;
    this.outageTimeout = null;
    this.outageActive = false;
    this.onOutageChange = null;
  }

  /** Rolls both hazards independently; call once per submitted try. */
  rollForTry() {
    if (Math.random() < this.chance) this.triggerEarthquake();
    if (Math.random() < this.chance) this.triggerOutage();
  }

  triggerEarthquake() {
    this.boardEl.classList.remove('game-board--quake');
    void this.boardEl.offsetWidth; // reflow to restart the animation
    this.boardEl.classList.add('game-board--quake');
    this.soundEngine?.earthquake();
    window.setTimeout(() => this.boardEl.classList.remove('game-board--quake'), 700);
  }

  triggerOutage() {
    window.clearTimeout(this.outageTimeout);
    this.outageActive = true;
    this.onOutageChange?.(true);

    this.keyboardEl.classList.add('keyboard--outage');
    this.outageOverlayEl.classList.remove('outage-overlay--active');
    void this.outageOverlayEl.offsetWidth; // reflow to restart the animation
    this.outageOverlayEl.classList.add('outage-overlay--active');

    if (this.outagePopupEl) {
      this.outagePopupEl.classList.remove('outage-popup--active');
      void this.outagePopupEl.offsetWidth; // reflow to restart the animation
      this.outagePopupEl.classList.add('outage-popup--active');
    }

    this.soundEngine?.thunder();

    this.outageTimeout = window.setTimeout(() => {
      this.keyboardEl.classList.remove('keyboard--outage');
      this.outageOverlayEl.classList.remove('outage-overlay--active');
      this.outagePopupEl?.classList.remove('outage-popup--active');
      this.outageActive = false;
      this.onOutageChange?.(false);
    }, 5000);
  }

  reset() {
    window.clearTimeout(this.outageTimeout);
    this.outageActive = false;
    this.boardEl.classList.remove('game-board--quake');
    this.keyboardEl.classList.remove('keyboard--outage');
    this.outageOverlayEl.classList.remove('outage-overlay--active');
    this.outagePopupEl?.classList.remove('outage-popup--active');
  }
}

/* =========================================================
 * GameBoardInitializer — pure DOM construction. Draws the
 * empty board (rows/columns of tiles) and the on-screen
 * keyboard, tagging every element with an id/data attribute
 * so the renderer can look them up and update them later.
 * ========================================================= */
class GameBoardInitializer {
  constructor(boardEl, keyboardEl, wordLength = WORD_LENGTH, maxTries = MAX_TRIES) {
    this.boardEl = boardEl;
    this.keyboardEl = keyboardEl;
    this.wordLength = wordLength;
    this.maxTries = maxTries;
  }

  /** Builds the tile grid and returns a 2D array of tile elements [row][col]. */
  buildBoard() {
    this.boardEl.innerHTML = '';
    const tiles = [];

    for (let row = 0; row < this.maxTries; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.id = `row-${row}`;

      const rowTiles = [];
      for (let col = 0; col < this.wordLength; col++) {
        const tile = document.createElement('div');
        tile.className = 'board-tile';
        tile.id = `tile-${row}-${col}`;
        tile.setAttribute('data-row', String(row));
        tile.setAttribute('data-col', String(col));
        rowEl.appendChild(tile);
        rowTiles.push(tile);
      }

      this.boardEl.appendChild(rowEl);
      tiles.push(rowTiles);
    }

    return tiles;
  }

  /** Builds the QWERTY on-screen keyboard and returns a map of key -> button element. */
  buildKeyboard(onKeyPress) {
    this.keyboardEl.innerHTML = '';
    const layout = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
    ];

    const keys = {};
    layout.forEach((rowKeys) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      rowKeys.forEach((key) => {
        const isWide = key === 'ENTER' || key === 'DEL';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `key ${isWide ? 'key--wide' : ''}`.trim();
        btn.id = `key-${key}`;
        btn.textContent = key === 'DEL' ? '⌫' : key;
        btn.setAttribute('data-key', key);
        btn.addEventListener('click', () => onKeyPress(key));
        rowEl.appendChild(btn);
        keys[key] = btn;
      });

      this.keyboardEl.appendChild(rowEl);
    });

    return keys;
  }
}

/* =========================================================
 * GameLogic — the rules engine. Owns the current guess, the
 * target word and guess history, and knows how to score a
 * guess (correct / present / absent per letter). No DOM here.
 * ========================================================= */
class GameLogic {
  constructor(wordLength = WORD_LENGTH, maxTries = MAX_TRIES) {
    this.wordLength = wordLength;
    this.baseMaxTries = maxTries;
    this.maxHints = 2;
    this.reset();
  }

  reset(theme = WordBank.pickTheme()) {
    this.theme = theme;
    this.words = theme.words;
    this.target = WordBank.randomWord(this.words).toUpperCase();
    this.currentRow = 0;
    this.currentGuess = '';
    this.guesses = [];
    this.gameOver = false;
    this.won = false;
    this.maxTries = this.baseMaxTries;
    this.hintsUsed = 0;
    this.hintedIndices = new Set();
  }

  /**
   * Reveals the next un-hinted letter of the target word. Limited to
   * maxHints uses per game, and each use costs the player one try by
   * shrinking maxTries — using a hint too late can end the game early.
   */
  useHint() {
    if (this.gameOver || this.hintsUsed >= this.maxHints) return null;

    const index = [...Array(this.wordLength).keys()].find((i) => !this.hintedIndices.has(i));
    if (index === undefined) return null;

    this.hintedIndices.add(index);
    this.hintsUsed++;
    this.maxTries = Math.max(1, this.maxTries - 1);

    if (this.currentRow >= this.maxTries) {
      this.gameOver = true;
      this.won = false;
    }

    return {
      index,
      letter: this.target[index],
      maxTries: this.maxTries,
      hintsLeft: this.maxHints - this.hintsUsed,
      gameOver: this.gameOver,
    };
  }

  addLetter(letter) {
    if (this.gameOver || this.currentGuess.length >= this.wordLength) return false;
    this.currentGuess += letter.toUpperCase();
    return true;
  }

  deleteLetter() {
    if (this.gameOver || !this.currentGuess.length) return false;
    this.currentGuess = this.currentGuess.slice(0, -1);
    return true;
  }

  /** Validates and scores the current guess, advancing the game state. */
  submitGuess() {
    if (this.gameOver) return { ok: false, reason: 'over' };
    if (this.currentGuess.length !== this.wordLength) return { ok: false, reason: 'incomplete' };
    if (!WordBank.isValidGuess(this.currentGuess, this.words)) return { ok: false, reason: 'invalid' };

    const word = this.currentGuess;
    const statuses = this.evaluateGuess(word);
    const entry = { word, statuses, row: this.currentRow };
    this.guesses.push(entry);

    const won = word === this.target;
    this.currentRow++;
    this.currentGuess = '';

    if (won) {
      this.gameOver = true;
      this.won = true;
    } else if (this.currentRow >= this.maxTries) {
      this.gameOver = true;
      this.won = false;
    }

    return { ok: true, entry, won, gameOver: this.gameOver };
  }

  /** Classic two-pass Wordle scoring: exact matches first, then leftover letters. */
  evaluateGuess(guess) {
    const target = this.target.split('');
    const statuses = new Array(this.wordLength).fill('absent');
    const consumed = new Array(this.wordLength).fill(false);

    for (let i = 0; i < this.wordLength; i++) {
      if (guess[i] === target[i]) {
        statuses[i] = 'correct';
        consumed[i] = true;
      }
    }

    for (let i = 0; i < this.wordLength; i++) {
      if (statuses[i] === 'correct') continue;
      const matchIndex = target.findIndex((letter, j) => letter === guess[i] && !consumed[j]);
      if (matchIndex !== -1) {
        statuses[i] = 'present';
        consumed[matchIndex] = true;
      }
    }

    return statuses;
  }
}

/* =========================================================
 * BoardRenderer — the only thing allowed to touch the board/
 * keyboard DOM after it's built. Takes state from GameLogic
 * and paints it: filling tiles, flip-revealing guesses, tinting
 * keys, shaking on invalid guesses, and toasting messages.
 * ========================================================= */
class BoardRenderer {
  constructor(tiles, keys, messageEl, triesEl, soundEngine) {
    this.tiles = tiles;
    this.keys = keys;
    this.messageEl = messageEl;
    this.triesEl = triesEl;
    this.soundEngine = soundEngine;
    this.messageTimeout = null;
  }

  renderCurrentGuess(row, guess) {
    const rowTiles = this.tiles[row];
    for (let col = 0; col < rowTiles.length; col++) {
      const letter = guess[col] || '';
      rowTiles[col].textContent = letter;
      rowTiles[col].classList.toggle('board-tile--filled', !!letter);
    }
  }

  /** Flip-reveals each tile in the row left-to-right, colouring it mid-flip. */
  revealGuess(row, statuses, word) {
    const stagger = 260;
    const flipHalf = 250;

    statuses.forEach((status, col) => {
      window.setTimeout(() => {
        const tile = this.tiles[row][col];
        tile.classList.add('board-tile--flip');
        this.soundEngine?.flip();
        window.setTimeout(() => {
          tile.classList.add(`board-tile--${status}`);
          this.updateKey(word[col], status);
        }, flipHalf);
      }, col * stagger);
    });
  }

  updateKey(letter, status) {
    const key = this.keys[letter];
    if (!key) return;

    const rank = { absent: 0, present: 1, correct: 2 };
    const current = key.dataset.status;
    if (current && rank[current] >= rank[status]) return;

    key.dataset.status = status;
    key.classList.remove('key--absent', 'key--present', 'key--correct');
    key.classList.add(`key--${status}`);
  }

  shakeRow(row) {
    const rowEl = this.tiles[row][0].parentElement;
    rowEl.classList.remove('board-row--shake');
    void rowEl.offsetWidth; // reflow to allow the animation to restart
    rowEl.classList.add('board-row--shake');
  }

  bounceRow(row) {
    this.tiles[row].forEach((tile, i) => {
      window.setTimeout(() => tile.classList.add('board-tile--bounce'), i * 100);
    });
  }

  updateTries(current, max) {
    if (!this.triesEl) return;
    this.triesEl.textContent = `Try ${Math.min(current, max)}/${max}`;
  }

  /** Visually greys out/locks every row from maxTries onward — the tries a hint just cost. */
  lockRowsFrom(maxTries) {
    this.tiles.forEach((rowTiles, row) => {
      const rowEl = rowTiles[0]?.parentElement;
      if (!rowEl) return;
      rowEl.classList.toggle('board-row--locked', row >= maxTries);
    });
  }

  showMessage(text, duration = 1600) {
    window.clearTimeout(this.messageTimeout);
    this.messageEl.textContent = text;
    this.messageEl.classList.add('game-message--visible');
    this.messageTimeout = window.setTimeout(() => {
      this.messageEl.classList.remove('game-message--visible');
    }, duration);
  }
}

/* =========================================================
 * GameFinalizer — owns the end-of-game modal only. Computes
 * the summary (win/lose, tries used) and wires up the two
 * ways out: starting a fresh game or returning to the menu.
 * ========================================================= */
class GameFinalizer {
  constructor({ backdrop, panel, titleEl, wordEl, statsEl, newGameBtn, mainMenuBtn }, soundEngine, onNewGame, onMainMenu) {
    this.backdrop = backdrop;
    this.panel = panel;
    this.titleEl = titleEl;
    this.wordEl = wordEl;
    this.statsEl = statsEl;
    this.soundEngine = soundEngine;

    newGameBtn.addEventListener('click', () => {
      this.close();
      onNewGame();
    });
    mainMenuBtn.addEventListener('click', () => {
      this.close();
      onMainMenu();
    });
  }

  finalize({ won, target, guesses, maxTries }) {
    this.titleEl.textContent = won ? 'Mabrouk! 🎉' : 'Better luck next time';
    this.wordEl.textContent = target;
    if (won) this.soundEngine?.winMusic();

    const stats = [
      { label: 'Result', value: won ? 'Won' : 'Lost' },
      { label: 'Tries', value: `${guesses.length}/${maxTries}` },
    ];

    this.statsEl.innerHTML = '';
    stats.forEach(({ label, value }) => {
      const box = document.createElement('div');
      box.className = 'result-stat';
      const valueEl = document.createElement('span');
      valueEl.className = 'result-stat__value';
      valueEl.textContent = value;
      const labelEl = document.createElement('span');
      labelEl.className = 'result-stat__label';
      labelEl.textContent = label;
      box.append(valueEl, labelEl);
      this.statsEl.appendChild(box);
    });

    this.open();
  }

  open() {
    this.backdrop.hidden = false;
    this.panel.closest('.result-modal').hidden = false;
  }

  close() {
    this.backdrop.hidden = true;
    this.panel.closest('.result-modal').hidden = true;
  }
}

/* =========================================================
 * GameController — the orchestrator. Wires initializer, logic,
 * renderer and finalizer together and is the only class that
 * knows about all of them; each stays focused on its own
 * concern. Also owns the hero <-> game screen transition,
 * physical keyboard input, sound, weather and hazard rolls.
 * ========================================================= */
class GameController {
  constructor({
    heroEl, screenEl, boardEl, keyboardEl, messageEl, triesEl, themeEl,
    weatherLayerEl, outageOverlayEl, outagePopupEl, backBtn, hintBtn, hintCountEl, finalizerRefs,
  }) {
    this.heroEl = heroEl;
    this.screenEl = screenEl;
    this.messageEl = messageEl;
    this.triesEl = triesEl;
    this.themeEl = themeEl;
    this.keyboardEl = keyboardEl;
    this.hintBtn = hintBtn;
    this.hintCountEl = hintCountEl;

    this.soundEngine = new SoundEngine();
    this.initializer = new GameBoardInitializer(boardEl, keyboardEl);
    this.logic = new GameLogic();
    this.weather = new WeatherBackground(weatherLayerEl, this.soundEngine);
    this.hazards = new HazardManager(
      { boardEl, keyboardEl, outageOverlayEl, outagePopupEl, soundEngine: this.soundEngine }
    );
    this.finalizer = new GameFinalizer(
      finalizerRefs,
      this.soundEngine,
      () => this.start(),
      () => this.exit()
    );

    this.handleKeydown = this.handleKeydown.bind(this);
    backBtn.addEventListener('click', () => this.exit());
    this.hintBtn.addEventListener('click', () => this.handleHint());
  }

  start() {
    const theme = WordBank.pickTheme();
    this.logic.reset(theme);
    this.themeEl.textContent = theme.label;
    this.hazards.reset();
    this.weather.start();

    const tiles = this.initializer.buildBoard();
    const keys = this.initializer.buildKeyboard((key) => this.handleKey(key));
    this.renderer = new BoardRenderer(tiles, keys, this.messageEl, this.triesEl, this.soundEngine);
    this.renderer.updateTries(1, this.logic.maxTries);
    this.updateHintButton(this.logic.maxHints - this.logic.hintsUsed);

    this.heroEl.hidden = true;
    this.screenEl.hidden = false;
    document.addEventListener('keydown', this.handleKeydown);
  }

  exit() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.hazards.reset();
    this.weather.stop();
    this.screenEl.hidden = true;
    this.heroEl.hidden = false;
  }

  handleKeydown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === 'Enter') return this.handleKey('ENTER');
    if (event.key === 'Backspace') return this.handleKey('DEL');
    if (/^[a-zA-Z0-9]$/.test(event.key)) this.handleKey(event.key.toUpperCase());
  }

  handleKey(key) {
    if (this.logic.gameOver || this.hazards.outageActive) return;

    if (key === 'ENTER') return this.submit();
    if (key === 'DEL') {
      if (this.logic.deleteLetter()) {
        this.soundEngine.delete();
        this.renderer.renderCurrentGuess(this.logic.currentRow, this.logic.currentGuess);
      }
      return;
    }
    if (/^[A-Z0-9]$/.test(key) && this.logic.addLetter(key)) {
      this.soundEngine.typing();
      this.renderer.renderCurrentGuess(this.logic.currentRow, this.logic.currentGuess);
    }
  }

  submit() {
    const row = this.logic.currentRow;
    const result = this.logic.submitGuess();

    if (!result.ok) {
      if (result.reason === 'incomplete') this.renderer.showMessage('Not enough letters');
      if (result.reason === 'invalid') this.renderer.showMessage('Word not in list');
      if (result.reason !== 'over') this.renderer.shakeRow(row);
      return;
    }

    if (result.won) this.soundEngine.correctWord();
    this.renderer.revealGuess(result.entry.row, result.entry.statuses, result.entry.word);
    this.hazards.rollForTry();

    if (!result.gameOver) {
      this.renderer.updateTries(this.logic.currentRow + 1, this.logic.maxTries);
      return;
    }

    const revealDuration = this.logic.wordLength * 260 + 400;
    window.setTimeout(() => {
      if (result.won) {
        this.renderer.bounceRow(result.entry.row);
      } else {
        this.renderer.showMessage(`The word was ${this.logic.target}`, 2400);
      }
      window.setTimeout(() => {
        this.finalizer.finalize({
          won: result.won,
          target: this.logic.target,
          guesses: this.logic.guesses,
          maxTries: this.logic.maxTries,
        });
      }, result.won ? 900 : 600);
    }, revealDuration);
  }

  handleHint() {
    if (this.logic.gameOver || this.hazards.outageActive) return;

    const result = this.logic.useHint();
    if (!result) {
      this.renderer.showMessage('No hints left');
      return;
    }

    this.soundEngine.hint();
    this.renderer.updateKey(result.letter, 'correct');
    this.renderer.lockRowsFrom(result.maxTries);
    this.renderer.updateTries(this.logic.currentRow + 1, result.maxTries);
    this.renderer.showMessage(`Hint: letter ${result.index + 1} is ${result.letter} (-1 try)`, 2400);
    this.updateHintButton(result.hintsLeft);

    if (result.gameOver) {
      window.setTimeout(() => {
        this.renderer.showMessage(`The word was ${this.logic.target}`, 2400);
        window.setTimeout(() => {
          this.finalizer.finalize({
            won: false,
            target: this.logic.target,
            guesses: this.logic.guesses,
            maxTries: this.logic.maxTries,
          });
        }, 600);
      }, 300);
    }
  }

  updateHintButton(hintsLeft) {
    this.hintCountEl.textContent = hintsLeft;
    this.hintBtn.disabled = hintsLeft <= 0;
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

  new TileTitle(document.getElementById('tile-title'), 'WORDLE 3AL LEBNENE');

  const gameController = new GameController({
    heroEl: document.getElementById('start-zone'),
    screenEl: document.getElementById('game-screen'),
    boardEl: document.getElementById('game-board'),
    keyboardEl: document.getElementById('keyboard'),
    messageEl: document.getElementById('game-message'),
    triesEl: document.getElementById('game-tries'),
    themeEl: document.getElementById('game-theme'),
    weatherLayerEl: document.getElementById('weather-layer'),
    outageOverlayEl: document.getElementById('outage-overlay'),
    outagePopupEl: document.getElementById('outage-popup'),
    backBtn: document.getElementById('game-back-btn'),
    hintBtn: document.getElementById('hint-btn'),
    hintCountEl: document.getElementById('hint-count'),
    finalizerRefs: {
      backdrop: document.getElementById('result-modal-backdrop'),
      panel: document.querySelector('.result-modal__panel'),
      titleEl: document.getElementById('result-modal-title'),
      wordEl: document.getElementById('result-word'),
      statsEl: document.getElementById('result-stats'),
      newGameBtn: document.getElementById('result-new-game'),
      mainMenuBtn: document.getElementById('result-main-menu'),
    },
  });

  new StartTrigger(
    document.getElementById('start-zone'),
    ['.topbar', '.info-modal', '.modal-backdrop-custom'],
    () => gameController.start()
  );

  new InfoModal({
    backdrop: document.getElementById('info-modal-backdrop'),
    panel: document.querySelector('.info-modal__panel'),
    closeBtn: document.getElementById('info-close'),
    openBtn: document.getElementById('info-btn'),
    loadingEl: document.getElementById('info-loading'),
    errorEl: document.getElementById('info-error'),
    retryBtn: document.getElementById('info-retry'),
    bodyEl: document.getElementById('info-body'),
    eyebrowEl: document.getElementById('info-card-eyebrow'),
    titleEl: document.getElementById('info-card-title'),
    textEl: document.getElementById('info-card-text'),
    prevBtn: document.getElementById('pager-prev'),
    nextBtn: document.getElementById('pager-next'),
    dotsEl: document.getElementById('pager-dots'),
  });
});
