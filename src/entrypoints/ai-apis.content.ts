/**
 * Blocks Web AI APIs (window.ai, navigator.ai) by freezing them as undefined.
 * Runs in MAIN world at document_start to intercept before any page script.
 * Dynamically registered via background/rules.ts when window_ai toggle is on.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  registration: 'runtime',

  main() {
    const freeze = { value: undefined, writable: false, configurable: false };

    try {
      Object.defineProperty(window, 'ai', freeze);
    } catch {
      // Property may already be defined
    }

    try {
      Object.defineProperty(navigator, 'ai', freeze);
    } catch {
      // Property may already be defined
    }
  },
});
