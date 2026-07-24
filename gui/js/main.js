import { initButtons } from './components/button.js?v=3';
import { initLabels } from './components/label.js?v=3';
import { initSwitches } from './components/switch.js?v=3';
import { initSliders } from './components/slider.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
  initButtons();
  initSwitches();
  initSliders();
  initLabels();
});
