/**
 * VELVET — barramento de áudio reativo
 *
 * Liga os elementos <audio> do player a um AnalyserNode compartilhado e
 * publica o nível do som, quadro a quadro, em dois lugares:
 *
 *   1. variáveis CSS globais (--v-level, --v-level-low, --v-level-high),
 *      para qualquer elemento reagir ao som só com CSS, sem re-render;
 *   2. assinantes JS (subscribeLevels), para canvas e three.js.
 *
 * Só existe UM laço de requestAnimationFrame para a aplicação inteira, e
 * ele só roda quando há pelo menos um assinante. É isso que mantém o
 * visualizador, o brilho da capa, o vinil 3D e a sidebar em fase — todos
 * leem exatamente o mesmo quadro.
 *
 * Segurança: se o navegador não permitir a Web Audio API (ou o áudio vier
 * de uma origem sem CORS, o que silenciaria a faixa), o barramento cai
 * sozinho para um modo simulado e grava a decisão, para nunca arriscar o
 * som do usuário duas vezes.
 */

const FALLBACK_KEY = 'velvet:audio-reactive-disabled';

let ctx = null;
let analyser = null;
let freqData = null;
let connected = false;      // conseguimos montar o grafo?
let simulated = false;      // estamos inventando os níveis?
let rafId = null;
let subscribers = new Set();
let sourceFor = new WeakMap();

// Watchdog: se a faixa está tocando mas o analisador só devolve silêncio,
// algo está errado (CORS). Marcamos para nunca mais tentar nesta máquina.
let silentFrames = 0;
let watchdogArmed = false;

const state = {
  level: 0,   // energia geral 0–1
  low: 0,     // graves
  mid: 0,
  high: 0,    // agudos
  bins: new Uint8Array(0),
  playing: false,
  simulated: true,
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function disabledByFallback() {
  try { return localStorage.getItem(FALLBACK_KEY) === '1'; } catch { return false; }
}

function rememberFallback() {
  try { localStorage.setItem(FALLBACK_KEY, '1'); } catch { /* modo privado */ }
}

/** Cria (uma única vez) o AudioContext e o analisador. */
function ensureContext() {
  if (ctx || simulated) return ctx;
  if (disabledByFallback()) { simulated = true; return null; }

  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) { simulated = true; return null; }

  try {
    ctx = new Ctor();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;              // 256 bins — suficiente e barato
    analyser.smoothingTimeConstant = 0.78;
    analyser.minDecibels = -85;
    analyser.maxDecibels = -18;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.connect(ctx.destination);
    return ctx;
  } catch {
    ctx = null;
    analyser = null;
    simulated = true;
    return null;
  }
}

/**
 * Roteia um <audio> pelo analisador. Idempotente: um mesmo elemento só
 * pode virar MediaElementSource uma vez na vida, então guardamos num
 * WeakMap. Chame para cada canal do crossfade.
 */
export function attachAudioElement(el) {
  if (!el || simulated) return;
  if (sourceFor.has(el)) return;

  const audioCtx = ensureContext();
  if (!audioCtx || !analyser) return;

  try {
    const source = audioCtx.createMediaElementSource(el);
    source.connect(analyser);
    sourceFor.set(el, source);
    connected = true;
    watchdogArmed = true;
  } catch {
    // Se falhar, o elemento continua ligado à saída padrão do navegador —
    // o áudio nunca fica mudo por causa disto.
    simulated = true;
  }
}

/** O AudioContext nasce suspenso; precisa de um gesto do usuário. */
export function resumeAudioContext() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Rede de segurança: acorda o contexto no PRIMEIRO gesto da página,
 * qualquer que seja ele.
 *
 * Com o áudio roteado por um contexto suspenso, o som simplesmente não
 * sai. Chamar resume() no clique do play resolve na maioria dos
 * navegadores, mas o efeito do React roda um tique depois do gesto e há
 * navegadores que já não o consideram "ativado por usuário" — a primeira
 * faixa sairia muda. Ouvir o primeiro toque/tecla/clique da sessão elimina
 * essa janela. Os listeners se removem sozinhos depois de disparar.
 */
export function armAudioContextUnlock() {
  if (typeof window === 'undefined') return () => {};

  const unlock = () => {
    ensureContext();
    resumeAudioContext();
    off();
  };
  const off = () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };

  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });

  return off;
}

/** Informa ao barramento se há faixa tocando (move o modo simulado). */
export function setPlaying(isPlaying) {
  state.playing = !!isPlaying;
  if (isPlaying) resumeAudioContext();
  if (!isPlaying) silentFrames = 0;
}

// ---------------------------------------------------------------------------
// Laço
// ---------------------------------------------------------------------------

let simPhase = 0;

function readReal() {
  analyser.getByteFrequencyData(freqData);

  const n = freqData.length;
  const lowEnd = Math.floor(n * 0.10);
  const midEnd = Math.floor(n * 0.45);

  let low = 0, mid = 0, high = 0;
  for (let i = 0; i < lowEnd; i++) low += freqData[i];
  for (let i = lowEnd; i < midEnd; i++) mid += freqData[i];
  for (let i = midEnd; i < n; i++) high += freqData[i];

  low  = low  / (lowEnd * 255) || 0;
  mid  = mid  / ((midEnd - lowEnd) * 255) || 0;
  high = high / ((n - midEnd) * 255) || 0;

  // Peso musical: os graves dominam a percepção de "pulso".
  const level = Math.min(1, low * 0.62 + mid * 0.30 + high * 0.14);

  state.low = low;
  state.mid = mid;
  state.high = high;
  state.level = level;
  state.bins = freqData;
  state.simulated = false;

  // Tocando, mas silêncio absoluto por ~3s => o grafo está mudo.
  if (watchdogArmed && state.playing) {
    if (level < 0.001) {
      if (++silentFrames > 180) {
        rememberFallback();
        watchdogArmed = false;
      }
    } else {
      silentFrames = 0;
      watchdogArmed = false; // deu certo, nunca mais precisa checar
    }
  }
}

function readSimulated() {
  if (!state.playing) {
    state.level += (0 - state.level) * 0.12;
    state.low = state.mid = state.high = state.level;
    state.simulated = true;
    return;
  }
  // Pulso plausível: uma senoide lenta somada a outra rápida.
  simPhase += 0.045;
  const beat = (Math.sin(simPhase) * 0.5 + 0.5) ** 2;
  const flutter = Math.sin(simPhase * 3.7) * 0.12 + Math.sin(simPhase * 8.3) * 0.06;
  const target = Math.max(0, Math.min(1, 0.28 + beat * 0.45 + flutter));
  state.level += (target - state.level) * 0.22;
  state.low = Math.min(1, state.level * 1.15);
  state.mid = state.level * 0.8;
  state.high = state.level * 0.55;
  state.simulated = true;
}

function writeCssVars() {
  const root = document.documentElement.style;
  root.setProperty('--v-level', state.level.toFixed(3));
  root.setProperty('--v-level-low', state.low.toFixed(3));
  root.setProperty('--v-level-high', state.high.toFixed(3));
}

function tick() {
  if (analyser && connected && !simulated && !disabledByFallback()) {
    readReal();
  } else {
    readSimulated();
  }

  writeCssVars();
  subscribers.forEach((cb) => {
    try { cb(state); } catch { /* um assinante quebrado não derruba o laço */ }
  });

  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  if (rafId == null) rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  state.level = state.low = state.mid = state.high = 0;
  writeCssVars();
}

/**
 * Assina os níveis. Devolve a função de cancelamento.
 * O laço só existe enquanto houver alguém ouvindo.
 */
export function subscribeLevels(cb) {
  if (typeof cb !== 'function') return () => {};
  subscribers.add(cb);
  startLoop();
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0) stopLoop();
  };
}

/** Leitura pontual, sem assinar. */
export function getLevels() {
  return state;
}

/** Está usando som real ou simulado? (para o rótulo do visualizador) */
export function isReactive() {
  return connected && !simulated && !disabledByFallback() && !prefersReducedMotion();
}

export default {
  attachAudioElement,
  resumeAudioContext,
  armAudioContextUnlock,
  setPlaying,
  subscribeLevels,
  getLevels,
  isReactive,
};
