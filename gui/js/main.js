import { initButtons } from './components/button.js';
import { initLabels } from './components/label.js';
import { initSwitches } from './components/switch.js';
import { initSliders } from './components/slider.js';
import { initTickers } from './components/ticker.js';

document.addEventListener('DOMContentLoaded', () => {
  initButtons();
  initLabels();
  initSwitches();
  initSliders();
  initTickers();
});
