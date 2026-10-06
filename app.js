/**
 * Lumina CineScreen Pro - Professional Filmmaker Screen Light & Lighting FX
 * High-precision on-set practical lighting console
 */

(function () {
  'use strict';

  // ==========================================================================
  // Application State
  // ==========================================================================
  const state = {
    mode: 'light', // 'light' | 'blackout'
    color: '#FFF8E7',
    savedLightColor: '#FFF8E7',
    brightness: 100, // 1 - 100
    kelvin: 3200,
    tint: 0, // -50 to +50 (Magenta to Green)
    activeTab: 'cct',
    isHudVisible: true,
    isFullscreen: false,
    idleTimer: null,
    
    // Cinema FX Engine State
    fxActive: true,
    currentFx: 'breathe',
    fxSpeed: 1.0,
    fxIntensity: 75,
    fxAnimationFrame: null,
    fxStartTime: performance.now(),
    
    // Aspect & Framing
    aspect: 'full',
    catchlight: 'none',

    // Custom Palettes
    customPalettes: [
      { id: '1', name: 'Actor Key Glow', hex: '#FFE0B2' },
      { id: '2', name: 'Cyberpunk Rim', hex: '#00E5FF' },
      { id: '3', name: 'Darkroom Safe', hex: '#DC2626' }
    ]
  };

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const body = document.body;
  const lightCanvas = document.getElementById('lightCanvas');
  const controlHud = document.getElementById('controlHud');
  const btnShowHud = document.getElementById('btnShowHud');
  const btnDisappearHud = document.getElementById('btnDisappearHud');
  const btnQuickHide = document.getElementById('btnQuickHide');
  const btnBlackout = document.getElementById('btnBlackout');
  const btnScreenLight = document.getElementById('btnScreenLight');
  const btnFullscreen = document.getElementById('btnFullscreen');
  
  // Status Labels
  const currentModeLabel = document.getElementById('currentModeLabel');
  const currentStatusDetail = document.getElementById('currentStatusDetail');
  const liveDot = document.getElementById('liveDot');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Tabs
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // CCT Sliders
  const tempSlider = document.getElementById('tempSlider');
  const tempValue = document.getElementById('tempValue');
  const tintSlider = document.getElementById('tintSlider');
  const tintValue = document.getElementById('tintValue');
  const cctQuickButtons = document.querySelectorAll('.cct-quick-btn');

  // Exact Color Inputs
  const hexInput = document.getElementById('hexInput');
  const hexSwatchBubble = document.getElementById('hexSwatchBubble');
  const btnCopyHex = document.getElementById('btnCopyHex');
  const customColorInput = document.getElementById('customColorInput');
  const rgbR = document.getElementById('rgbR');
  const rgbG = document.getElementById('rgbG');
  const rgbB = document.getElementById('rgbB');
  const btnSavePreset = document.getElementById('btnSavePreset');
  const customPaletteGrid = document.getElementById('customPaletteGrid');
  const customPaletteCount = document.getElementById('customPaletteCount');
  const gelChips = document.querySelectorAll('.gel-chip');

  // Cinema FX Elements
  const fxCards = document.querySelectorAll('.fx-card');
  const fxSpeedSlider = document.getElementById('fxSpeedSlider');
  const fxSpeedValue = document.getElementById('fxSpeedValue');
  const fxIntensitySlider = document.getElementById('fxIntensitySlider');
  const fxIntensityValue = document.getElementById('fxIntensityValue');
  const btnToggleFx = document.getElementById('btnToggleFx');
  const fxToggleBtnText = document.getElementById('fxToggleBtnText');
  const fxLiveBadge = document.getElementById('fxLiveBadge');

  // Master Output & Framing
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessValue = document.getElementById('brightnessValue');
  const btnDimStepDown = document.getElementById('btnDimStepDown');
  const btnDimStepUp = document.getElementById('btnDimStepUp');
  const aspectButtons = document.querySelectorAll('.aspect-btn');
  const catchlightButtons = document.querySelectorAll('.catchlight-btn');
  const catchlightShape = document.getElementById('catchlightShape');

  let toastTimeout = null;

  // ==========================================================================
  // Storage & Persistence
  // ==========================================================================
  function loadPersistedSettings() {
    try {
      const savedColor = localStorage.getItem('lumina_cine_color');
      const savedBrightness = localStorage.getItem('lumina_cine_brightness');
      const savedKelvin = localStorage.getItem('lumina_cine_kelvin');
      const savedFx = localStorage.getItem('lumina_cine_fx');
      const savedPalettes = localStorage.getItem('lumina_cine_palettes');

      if (savedColor) {
        state.color = savedColor;
        state.savedLightColor = savedColor;
      }
      if (savedBrightness) state.brightness = parseInt(savedBrightness, 10);
      if (savedKelvin) state.kelvin = parseInt(savedKelvin, 10);
      if (savedFx) state.currentFx = savedFx;
      if (savedPalettes) {
        state.customPalettes = JSON.parse(savedPalettes);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem('lumina_cine_color', state.color);
      localStorage.setItem('lumina_cine_brightness', state.brightness.toString());
      localStorage.setItem('lumina_cine_kelvin', state.kelvin.toString());
      localStorage.setItem('lumina_cine_fx', state.currentFx);
      localStorage.setItem('lumina_cine_palettes', JSON.stringify(state.customPalettes));
    } catch (e) {
      // Ignore
    }
  }

  // ==========================================================================
  // Color Math & Conversions
  // ==========================================================================
  
  // Converts Kelvin (1800 - 10000K) + Tint (-50 to +50) to Hex
  function kelvinAndTintToHex(k, tint = 0) {
    let temp = k / 100;
    let red, green, blue;

    // Red
    if (temp <= 66) {
      red = 255;
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      if (red < 0) red = 0;
      if (red > 255) red = 255;
    }

    // Green
    if (temp <= 66) {
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
    } else {
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
    }
    if (green < 0) green = 0;
    if (green > 255) green = 255;

    // Blue
    if (temp >= 66) {
      blue = 255;
    } else if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      if (blue < 0) blue = 0;
      if (blue > 255) blue = 255;
    }

    // Apply Tint Duv (+/- Green vs Magenta)
    if (tint > 0) {
      // Plus Green
      green = Math.min(255, green + (tint * 1.5));
    } else if (tint < 0) {
      // Minus Green (Push Magenta: add red & blue, attenuate green)
      const absTint = Math.abs(tint);
      red = Math.min(255, red + (absTint * 0.8));
      blue = Math.min(255, blue + (absTint * 0.8));
      green = Math.max(0, green - (absTint * 0.9));
    }

    return rgbToHex(Math.round(red), Math.round(green), Math.round(blue));
  }

  function rgbToHex(r, g, b) {
    const toH = (c) => {
      const h = Math.max(0, Math.min(255, Math.round(c))).toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${toH(r)}${toH(g)}${toH(b)}`.toUpperCase();
  }

  function hexToRgb(hex) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return { r: 255, g: 255, b: 255 };

    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }

  // ==========================================================================
  // UI Display & Synchronization
  // ==========================================================================
  function showToast(msg) {
    toastMessage.textContent = msg;
    toastNotification.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2800);
  }

  function applyColor(hex, syncDetails = '') {
    if (!hex.startsWith('#')) hex = '#' + hex;
    state.color = hex.toUpperCase();
    state.savedLightColor = state.color;

    // Apply CSS Variable
    document.documentElement.style.setProperty('--current-light-color', state.color);

    // Sync input fields
    hexInput.value = state.color;
    hexSwatchBubble.style.backgroundColor = state.color;
    customColorInput.value = state.color;

    const rgb = hexToRgb(state.color);
    rgbR.value = rgb.r;
    rgbG.value = rgb.g;
    rgbB.value = rgb.b;

    // Sync detail text in header
    if (syncDetails) {
      currentStatusDetail.textContent = syncDetails;
    } else {
      currentStatusDetail.textContent = `${state.color} (Custom)`;
    }

    // Sync Gel Chips active highlight
    gelChips.forEach(chip => {
      if (chip.dataset.color.toUpperCase() === state.color) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    persistSettings();
  }

  function applyBrightness(percent) {
    percent = Math.max(1, Math.min(100, percent));
    state.brightness = percent;
    brightnessValue.textContent = `${percent}%`;
    brightnessSlider.value = percent;
    document.documentElement.style.setProperty('--current-brightness', (percent / 100).toString());
    persistSettings();
  }

  // ==========================================================================
  // Mode Controller (Light vs Pitch Blackout)
  // ==========================================================================
  function setMode(newMode) {
    state.mode = newMode;

    if (newMode === 'blackout') {
      body.classList.remove('mode-light');
      body.classList.add('mode-blackout');
      btnBlackout.classList.add('active');
      btnScreenLight.classList.remove('active');
      currentModeLabel.textContent = 'Pitch Blackout (OLED)';
      currentStatusDetail.textContent = '0 Lux • True 000000';
    } else {
      body.classList.remove('mode-blackout');
      body.classList.add('mode-light');
      btnBlackout.classList.remove('active');
      btnScreenLight.classList.add('active');
      currentModeLabel.textContent = 'Screen Light Active';
      applyColor(state.savedLightColor, currentStatusDetail.textContent);
    }
  }

  function toggleMode() {
    if (state.mode === 'blackout') {
      setMode('light');
    } else {
      setMode('blackout');
    }
  }

  // ==========================================================================
  // Disappear / Stealth Controller Logic
  // ("the controler should diossaper if u click on th e disapera bnutton but it hsould not go")
  // ==========================================================================
  function disappearHud() {
    state.isHudVisible = false;
    controlHud.classList.add('hidden');
    showToast('HUD Disappeared • Press H, tap screen, or click floating pill to reveal');
  }

  function restoreHud() {
    state.isHudVisible = true;
    controlHud.classList.remove('hidden');
    body.classList.remove('idle-cursor');
    resetIdleTimer();
  }

  function toggleHud() {
    if (state.isHudVisible) {
      disappearHud();
    } else {
      restoreHud();
    }
  }

  function resetIdleTimer() {
    body.classList.remove('idle-cursor');
    clearTimeout(state.idleTimer);

    // Auto-hide mouse cursor after 4.5 seconds of stationary cursor
    state.idleTimer = setTimeout(() => {
      body.classList.add('idle-cursor');
    }, 4500);
  }

  // ==========================================================================
  // Tab Navigation
  // ==========================================================================
  function switchTab(tabId) {
    state.activeTab = tabId;
    tabLinks.forEach(link => {
      const isActive = link.id === `tab-${tabId}`;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-selected', isActive);
    });

    tabPanels.forEach(panel => {
      const isActive = panel.id === `panel-${tabId}`;
      panel.classList.toggle('active', isActive);
    });
  }

  // ==========================================================================
  // Cinema Lighting Effects Engine (FX)
  // High refresh animation for Breathe, Candle, Police, Lightning, TV, Strobe, etc.
  // ==========================================================================
  let policeStep = 0;
  let policeTimer = 0;
  let lightningStrikeTime = 0;
  let tvNextShift = 0;
  let tvCurColor = '#8ab4f8';

  function runCinemaFx(timestamp) {
    if (state.mode === 'light' && state.fxActive) {
      const elapsed = (timestamp - state.fxStartTime) / 1000;
      const speed = state.fxSpeed;
      const intensity = state.fxIntensity / 100;

      switch (state.currentFx) {
        case 'breathe': {
          // Sinusoidal organic breathing glow
          // Cycle duration ~ 4s at 1.0x speed
          const sine = (Math.sin(elapsed * speed * 1.57) + 1) / 2; // 0.0 to 1.0
          const minMod = 1.0 - (intensity * 0.7);
          const currentMod = minMod + (sine * (1.0 - minMod));
          document.documentElement.style.setProperty('--fx-brightness-mod', currentMod.toFixed(3));
          break;
        }

        case 'candle': {
          // Natural organic warm flicker
          const jitter = (Math.random() * 0.35 + Math.sin(elapsed * 12 * speed) * 0.15) * intensity;
          const currentMod = Math.max(0.3, 1.0 - jitter);
          document.documentElement.style.setProperty('--fx-brightness-mod', currentMod.toFixed(3));
          break;
        }

        case 'police': {
          // Alternating Red and Blue emergency strobe
          policeTimer += speed * 0.04;
          if (policeTimer > 1.0) {
            policeTimer = 0;
            policeStep = (policeStep + 1) % 8; // 4 beats red, 4 beats blue
          }
          const isRed = policeStep < 4;
          const flashOn = (policeStep % 2 === 0);
          
          if (flashOn) {
            document.documentElement.style.setProperty('--current-light-color', isRed ? '#FF0011' : '#0044FF');
            document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
          } else {
            document.documentElement.style.setProperty('--fx-brightness-mod', '0.05');
          }
          break;
        }

        case 'lightning': {
          // Random dramatic lightning strikes with decay
          if (timestamp > lightningStrikeTime) {
            // Next strike in 2.5 - 6 seconds
            lightningStrikeTime = timestamp + (2500 / speed) + (Math.random() * 3500);
            document.documentElement.style.setProperty('--current-light-color', '#FFFFFF');
            document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
          } else {
            const timeSinceStrike = timestamp - (lightningStrikeTime - (2500 / speed));
            if (timeSinceStrike < 120) {
              // Main violent flash
              document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
            } else if (timeSinceStrike < 220) {
              // Pause dip
              document.documentElement.style.setProperty('--fx-brightness-mod', '0.15');
            } else if (timeSinceStrike < 380) {
              // Secondary fork flash
              document.documentElement.style.setProperty('--fx-brightness-mod', '0.9');
            } else {
              // Dark ambient return
              document.documentElement.style.setProperty('--current-light-color', state.color);
              document.documentElement.style.setProperty('--fx-brightness-mod', (0.15 + (1 - intensity) * 0.5).toFixed(2));
            }
          }
          break;
        }

        case 'tv': {
          // Television screen spill (shifting cool/warm bounces)
          if (timestamp > tvNextShift) {
            tvNextShift = timestamp + (180 / speed) + (Math.random() * 600);
            const palette = ['#8ab4f8', '#60a5fa', '#93c5fd', '#c7d2fe', '#fde68a', '#e2e8f0'];
            tvCurColor = palette[Math.floor(Math.random() * palette.length)];
          }
          const tvJitter = 0.7 + (Math.random() * 0.3 * intensity);
          document.documentElement.style.setProperty('--current-light-color', tvCurColor);
          document.documentElement.style.setProperty('--fx-brightness-mod', tvJitter.toFixed(3));
          break;
        }

        case 'strobe': {
          // Strobe frequency
          const strobeSpeed = speed * 12; // 2.4 - 36 Hz
          const isPulseOn = Math.sin(elapsed * strobeSpeed * Math.PI) > 0;
          document.documentElement.style.setProperty('--fx-brightness-mod', isPulseOn ? '1.0' : '0.02');
          break;
        }

        case 'paparazzi': {
          // Cluster of camera flashbulbs
          const isFlash = Math.random() < (0.12 * speed);
          if (isFlash) {
            document.documentElement.style.setProperty('--current-light-color', '#FFFFFF');
            document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
          } else {
            document.documentElement.style.setProperty('--current-light-color', state.color);
            document.documentElement.style.setProperty('--fx-brightness-mod', '0.2');
          }
          break;
        }

        case 'hue_loop': {
          // Continuous 360-degree chromatic rotation
          const hue = Math.round((elapsed * speed * 35) % 360);
          const loopColor = hslToHex(hue, 100, 50);
          document.documentElement.style.setProperty('--current-light-color', loopColor);
          document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
          break;
        }

        default:
          document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
          break;
      }
    } else {
      document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
    }

    state.fxAnimationFrame = requestAnimationFrame(runCinemaFx);
  }

  function setCinemaFx(fxName) {
    state.currentFx = fxName;
    state.fxActive = true;
    state.fxStartTime = performance.now();

    fxCards.forEach(card => {
      card.classList.toggle('active', card.dataset.fx === fxName);
    });

    const activeCard = document.querySelector(`.fx-card[data-fx="${fxName}"]`);
    const displayName = activeCard ? activeCard.querySelector('.fx-name').textContent : fxName;
    
    fxToggleBtnText.textContent = `FX Running: ${displayName}`;
    fxLiveBadge.textContent = displayName;
    btnToggleFx.classList.remove('paused');
    currentStatusDetail.textContent = `FX: ${displayName}`;

    // Reset base color if switching out of Police/Lightning
    if (fxName !== 'police' && fxName !== 'hue_loop') {
      document.documentElement.style.setProperty('--current-light-color', state.color);
    }

    persistSettings();
  }

  function toggleCinemaFx() {
    state.fxActive = !state.fxActive;
    if (state.fxActive) {
      btnToggleFx.classList.remove('paused');
      const activeCard = document.querySelector(`.fx-card[data-fx="${state.currentFx}"]`);
      const displayName = activeCard ? activeCard.querySelector('.fx-name').textContent : state.currentFx;
      fxToggleBtnText.textContent = `FX Running: ${displayName}`;
      showToast(`Cinema FX Resumed: ${displayName}`);
    } else {
      btnToggleFx.classList.add('paused');
      fxToggleBtnText.textContent = `FX Paused (Click to Run)`;
      document.documentElement.style.setProperty('--fx-brightness-mod', '1.0');
      document.documentElement.style.setProperty('--current-light-color', state.color);
      showToast('Cinema FX Paused • Static Color Active');
    }
  }

  // ==========================================================================
  // Custom Saved Palette Bank
  // ==========================================================================
  function renderCustomPalettes() {
    customPaletteGrid.innerHTML = '';
    customPaletteCount.textContent = `${state.customPalettes.length} Saved`;

    state.customPalettes.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'custom-chip';
      chip.title = `${item.name} (${item.hex})`;
      chip.innerHTML = `
        <span class="custom-chip-color" style="background-color: ${item.hex};"></span>
        <span class="custom-chip-text">${item.name}</span>
        <span class="custom-chip-del" title="Remove preset" data-id="${item.id}">&times;</span>
      `;

      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('custom-chip-del')) {
          e.stopPropagation();
          deleteCustomPalette(item.id);
          return;
        }
        applyColor(item.hex, item.name);
        if (state.mode === 'blackout') setMode('light');
      });

      customPaletteGrid.appendChild(chip);
    });
  }

  function saveCurrentColorToPalette() {
    const defaultName = prompt('Enter a name for this custom lighting color:', `Cine Swatch ${state.customPalettes.length + 1}`);
    if (!defaultName) return;

    const newPreset = {
      id: Date.now().toString(),
      name: defaultName.trim().slice(0, 20),
      hex: state.color
    };

    state.customPalettes.push(newPreset);
    renderCustomPalettes();
    persistSettings();
    showToast(`Saved color "${newPreset.name}" to palette bank!`);
  }

  function deleteCustomPalette(id) {
    state.customPalettes = state.customPalettes.filter(p => p.id !== id);
    renderCustomPalettes();
    persistSettings();
  }

  // ==========================================================================
  // Fullscreen API Handling
  // ==========================================================================
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        state.isFullscreen = true;
        updateFullscreenButton();
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          state.isFullscreen = false;
          updateFullscreenButton();
        });
      }
    }
  }

  function updateFullscreenButton() {
    const fsText = btnFullscreen.querySelector('.fs-text');
    if (document.fullscreenElement) {
      btnFullscreen.classList.add('active');
      if (fsText) fsText.innerHTML = 'Exit FS <kbd>F</kbd>';
    } else {
      btnFullscreen.classList.remove('active');
      if (fsText) fsText.innerHTML = 'Fullscreen <kbd>F</kbd>';
    }
  }

  document.addEventListener('fullscreenchange', updateFullscreenButton);

  // ==========================================================================
  // Event Listeners Setup
  // ==========================================================================
  function setupEventListeners() {
    
    // Top Bar Mode Controls
    btnBlackout.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('blackout');
    });

    btnScreenLight.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('light');
    });

    btnFullscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });

    // Disappear & Restore HUD
    btnDisappearHud.addEventListener('click', (e) => {
      e.stopPropagation();
      disappearHud();
    });

    btnQuickHide.addEventListener('click', (e) => {
      e.stopPropagation();
      disappearHud();
    });

    btnShowHud.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreHud();
    });

    // Tap canvas to reveal or disappear HUD
    lightCanvas.addEventListener('click', () => {
      if (state.isHudVisible) {
        disappearHud();
      } else {
        restoreHud();
      }
    });

    // Tabs
    tabLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        const tabId = link.id.replace('tab-', '');
        switchTab(tabId);
      });
    });

    // Kelvin White Balance Slider
    tempSlider.addEventListener('input', (e) => {
      const k = parseInt(e.target.value, 10);
      state.kelvin = k;
      let label = `${k}K`;
      if (k < 2200) label += ' (Candlelight Flame)';
      else if (k <= 2800) label += ' (Golden Hour / Warm Tungsten)';
      else if (k <= 3400) label += ' (3200K Studio Tungsten)';
      else if (k <= 4500) label += ' (Neutral Fluorescent)';
      else if (k <= 5800) label += ' (5600K Daylight Cine)';
      else if (k <= 7000) label += ' (Cloudy Sky / Cool White)';
      else label += ' (Deep Shade Blue)';

      tempValue.textContent = label;
      const hex = kelvinAndTintToHex(k, state.tint);
      applyColor(hex, label);
      if (state.mode === 'blackout') setMode('light');

      // Update CCT quick buttons
      cctQuickButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.kelvin, 10) === k);
      });
    });

    // Tint Slider
    tintSlider.addEventListener('input', (e) => {
      const t = parseInt(e.target.value, 10);
      state.tint = t;
      tintValue.textContent = t === 0 ? '0 (Neutral)' : (t > 0 ? `+${t} (Plus Green)` : `${t} (Magenta)`);
      const hex = kelvinAndTintToHex(state.kelvin, t);
      applyColor(hex, `${state.kelvin}K (Tint ${t})`);
      if (state.mode === 'blackout') setMode('light');
    });

    // CCT Quick Buttons
    cctQuickButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const k = parseInt(btn.dataset.kelvin, 10);
        tempSlider.value = k;
        tempSlider.dispatchEvent(new Event('input'));
      });
    });

    // Exact Hex Input
    hexInput.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        applyColor(val);
        if (state.mode === 'blackout') setMode('light');
      }
    });

    // Copy Hex
    btnCopyHex.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(state.color).then(() => {
        showToast(`Copied ${state.color} to clipboard!`);
      });
    });

    // Exact RGB numeric inputs
    const handleRgbChange = () => {
      const r = parseInt(rgbR.value, 10) || 0;
      const g = parseInt(rgbG.value, 10) || 0;
      const b = parseInt(rgbB.value, 10) || 0;
      const hex = rgbToHex(r, g, b);
      applyColor(hex, `RGB(${r}, ${g}, ${b})`);
      if (state.mode === 'blackout') setMode('light');
    };

    rgbR.addEventListener('input', handleRgbChange);
    rgbG.addEventListener('input', handleRgbChange);
    rgbB.addEventListener('input', handleRgbChange);

    // Native Color Wheel Picker
    customColorInput.addEventListener('input', (e) => {
      applyColor(e.target.value);
      if (state.mode === 'blackout') setMode('light');
    });

    // Gel Chips
    gelChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const col = chip.dataset.color;
        const name = chip.dataset.name;
        applyColor(col, name);
        if (state.mode === 'blackout') setMode('light');
      });
    });

    // Save Preset
    btnSavePreset.addEventListener('click', (e) => {
      e.stopPropagation();
      saveCurrentColorToPalette();
    });

    // FX Selection
    fxCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        setCinemaFx(card.dataset.fx);
      });
    });

    // FX Modulation Sliders
    fxSpeedSlider.addEventListener('input', (e) => {
      const spd = parseFloat(e.target.value);
      state.fxSpeed = spd;
      fxSpeedValue.textContent = `${spd.toFixed(1)}x`;
    });

    fxIntensitySlider.addEventListener('input', (e) => {
      const intVal = parseInt(e.target.value, 10);
      state.fxIntensity = intVal;
      fxIntensityValue.textContent = `${intVal}%`;
    });

    btnToggleFx.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCinemaFx();
    });

    // Brightness Sliders
    brightnessSlider.addEventListener('input', (e) => {
      applyBrightness(parseInt(e.target.value, 10));
    });

    btnDimStepDown.addEventListener('click', (e) => {
      e.stopPropagation();
      applyBrightness(state.brightness - 5);
    });

    btnDimStepUp.addEventListener('click', (e) => {
      e.stopPropagation();
      applyBrightness(state.brightness + 5);
    });

    // Aspect Mattes
    aspectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        aspectButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const aspect = btn.dataset.aspect;
        state.aspect = aspect;

        body.classList.remove('aspect-239', 'aspect-185', 'aspect-43', 'aspect-916');
        if (aspect !== 'full') {
          body.classList.add(`aspect-${aspect}`);
          showToast(`Framing Matte: ${btn.textContent}`);
        } else {
          showToast('Framing Matte: Full Bleed');
        }
      });
    });

    // Catchlight Softbox Shapes
    catchlightButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        catchlightButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const shape = btn.dataset.shape;
        state.catchlight = shape;

        catchlightShape.classList.remove('shape-round', 'shape-ring');
        if (shape !== 'none') {
          catchlightShape.classList.add(`shape-${shape}`);
          showToast(`Catchlight: ${btn.textContent}`);
        } else {
          showToast('Catchlight: Square / Full');
        }
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if typing inside input
      if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;

      const key = e.key.toLowerCase();

      if (e.code === 'Space') {
        e.preventDefault();
        toggleMode();
      } else if (key === 'b') {
        setMode('blackout');
      } else if (key === 'l') {
        setMode('light');
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'h') {
        toggleHud();
      } else if (key === 'escape') {
        restoreHud();
      } else if (key === '1') {
        switchTab('cct');
      } else if (key === '2') {
        switchTab('gels');
      } else if (key === '3') {
        switchTab('effects');
      } else if (key === '4') {
        switchTab('master');
      }
    });

    // Idle Mouse auto-hide
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer, { passive: true });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    loadPersistedSettings();
    renderCustomPalettes();
    setupEventListeners();

    // Initial state setup
    applyColor(state.color, '3200K Tungsten Halogen');
    applyBrightness(state.brightness);
    setCinemaFx(state.currentFx);
    setMode('light');
    resetIdleTimer();

    // Start FX animation loop
    state.fxAnimationFrame = requestAnimationFrame(runCinemaFx);
  }

  init();
})();
