/*
  Ticker behavior: seamless continuous marquee for any message length.

  Write the sentence once in .ticker__source (HTML). JS builds repeating
  segments of [message] +++ [message] +++ …, cloning enough segments to
  always cover the viewport plus one full segment — short or long text.

  Loop wraps after one segment width so the scroll never shows empty space.
*/

const DEFAULT_DIVIDER = '+++';

function cleanMessage(text) {
  return text
    .replace(/^\s*\+\+\+\s*/g, '')
    .replace(/\s*\+\+\+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSegment(message, divider) {
  const segment = document.createElement('span');
  segment.className = 'ticker__segment';

  const messageEl = document.createElement('span');
  messageEl.className = 'ticker__text';
  messageEl.textContent = message;

  const dividerEl = document.createElement('span');
  dividerEl.className = 'ticker__divider';
  dividerEl.setAttribute('aria-hidden', 'true');
  dividerEl.textContent = divider;

  segment.append(messageEl, dividerEl);
  return segment;
}

export function initTickers(root = document) {
  const tickers = root.querySelectorAll('[data-component="ticker"]');

  tickers.forEach((tickerEl) => {
    const track = tickerEl.querySelector('.ticker__track');
    const source = track?.querySelector('.ticker__source');
    if (!track || !source) return;

    const messageText = cleanMessage(source.textContent);
    const divider = (tickerEl.dataset.divider ?? DEFAULT_DIVIDER).trim() || DEFAULT_DIVIDER;
    const pxPerSecond = Number(tickerEl.dataset.speed ?? 120);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    source.hidden = true;

    let segmentWidth = 0;
    let position = 0;
    let lastTime = null;
    let rafId = null;

    const buildTrack = () => {
      const containerWidth = tickerEl.clientWidth;
      if (containerWidth <= 0 || !messageText) return false;

      track.replaceChildren();

      const probe = createSegment(messageText, divider);
      track.appendChild(probe);
      segmentWidth = probe.getBoundingClientRect().width;
      track.replaceChildren();

      if (segmentWidth <= 0) return false;

      const copiesNeeded = Math.max(
        2,
        Math.ceil((containerWidth + segmentWidth) / segmentWidth)
      );

      for (let i = 0; i < copiesNeeded; i++) {
        const segment = createSegment(messageText, divider);
        if (i > 0) segment.setAttribute('aria-hidden', 'true');
        track.appendChild(segment);
      }

      position = ((position % segmentWidth) + segmentWidth) % segmentWidth;
      return true;
    };

    const render = () => {
      track.style.transform = `translate3d(${-position}px, 0, 0)`;
    };

    const tick = (time) => {
      if (lastTime === null) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (segmentWidth > 0) {
        position += pxPerSecond * dt;
        while (position >= segmentWidth) {
          position -= segmentWidth;
        }
        render();
      }

      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!buildTrack()) {
        requestAnimationFrame(start);
        return;
      }

      render();

      if (!reduceMotion && rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const rebuild = () => {
      const progress = segmentWidth > 0 ? position / segmentWidth : 0;
      if (!buildTrack()) return;
      position = progress * segmentWidth;
      render();
    };

    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      requestAnimationFrame(start);
    });

    const resizeObserver = new ResizeObserver(rebuild);
    resizeObserver.observe(tickerEl);
  });
}
