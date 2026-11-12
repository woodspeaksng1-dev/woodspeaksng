/*
 * "The scroll has dropped": the home hero's scroll has finished unrolling (or was shown open straight away
 * for still-preferring visitors). Mudi waits for it before saying hello. <html data-hero-done> keeps the
 * answer for anyone who starts listening late.
 */

const EVENT = "ws-hero-done";

export function markHeroDone() {
  if (document.documentElement.dataset.heroDone) return;
  document.documentElement.dataset.heroDone = "1";
  window.dispatchEvent(new Event(EVENT));
}

/** Calls `done` once the hero has finished, or after `fallbackMs` if it never does (scrolled away, slow film). */
export function onHeroDone(done: () => void, fallbackMs: number): () => void {
  if (document.documentElement.dataset.heroDone) {
    done();
    return () => {};
  }
  let called = false;
  const fire = () => {
    if (called) return;
    called = true;
    cleanup();
    done();
  };
  const timer = window.setTimeout(fire, fallbackMs);
  const cleanup = () => {
    window.clearTimeout(timer);
    window.removeEventListener(EVENT, fire);
  };
  window.addEventListener(EVENT, fire);
  return cleanup;
}
