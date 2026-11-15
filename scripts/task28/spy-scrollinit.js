// TASK28 CP-3 QA — instrument BOTH the effect's observable side effects:
// 1) spy Element.prototype.scrollIntoView (calls + args)
// 2) record visibility of the current row over time (bounding rect samples)
// 3) latch the moment __siaCalls first sees a LI with data-testid journey-current-row
(function () {
  window.__siaCalls = [];
  window.__rowSamples = [];
  const orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args) {
    window.__siaCalls.push({
      t: Math.round(performance.now()),
      tag: this.tagName,
      testid: this.getAttribute && this.getAttribute('data-testid'),
      opts: args[0] ? JSON.parse(JSON.stringify(args[0])) : 'default',
    });
    return orig.apply(this, args);
  };
  // sample the current-row rect for the first 6 seconds
  let n = 0;
  const iv = setInterval(() => {
    n += 1;
    const row = document.querySelector('[data-testid="journey-current-row"]');
    window.__rowSamples.push({
      t: Math.round(performance.now()),
      top: row ? Math.round(row.getBoundingClientRect().top) : null,
      scrollY: Math.round(window.scrollY),
    });
    if (n > 30) clearInterval(iv);
  }, 200);
})();
