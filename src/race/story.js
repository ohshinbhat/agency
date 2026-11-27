import { gsap } from 'gsap';
import { createRace } from './race.js';

const stage = document.querySelector('.film-stage');
const canvas = document.querySelector('.ascii-art');
const motionButton = document.querySelector('.motion-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

const sceneCount = 4;
const secondsPerScene = 4;
const playhead = { progress: 0 };
let paused = motionPreference.matches;
let visible = false;
let lastFrame = '';
let race;

function render(progress, force = false) {
  const position = progress * sceneCount;
  const index = Math.min(sceneCount - 1, Math.floor(position));
  const phase = position - index;

  const frame = index + ':' + Math.round(phase * 420);
  if (force || frame !== lastFrame) {
    race.draw(index, phase);
    lastFrame = frame;
  }
}

try {
  race = createRace(canvas);
} catch {
  canvas.hidden = true;
}

if (race) {
  const playback = gsap.to(playhead, {
    progress: 1,
    duration: sceneCount * secondsPerScene,
    repeat: -1,
    ease: 'none',
    paused: true,
    onUpdate: () => render(playhead.progress),
  });

  function updatePlayback() {
    playback.paused(paused || !visible || document.hidden);
  }

  function setPaused(value) {
    paused = value;
    motionButton.textContent = value ? 'Resume animation' : 'Pause animation';
    updatePlayback();
  }

  motionButton.addEventListener('click', () => setPaused(!paused));
  motionPreference.addEventListener('change', event => setPaused(event.matches));
  document.addEventListener('visibilitychange', updatePlayback);
  window.addEventListener('resize', () => render(playhead.progress, true));

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  });
  observer.observe(stage);
  setPaused(paused);
  render(playhead.progress, true);
  stage.classList.add('is-interactive');
}
