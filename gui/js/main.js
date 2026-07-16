import { initButtons } from './components/button.js';
import { initLabels } from './components/label.js';
import { initSwitches } from './components/switch.js';
import { initSliders } from './components/slider.js';

document.addEventListener('DOMContentLoaded', () => {
  initButtons();
  initLabels();
  initSwitches();
  initSliders();
});
