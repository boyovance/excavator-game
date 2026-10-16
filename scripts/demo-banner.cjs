// Demo-only notice: keep it in normal flow so it never covers navigation or balances.
function bannerScript(message) {
  return `(() => {
    let badge = document.querySelector('[data-demo-banner]');
    if (!badge) {
      badge = document.createElement('div');
      badge.dataset.demoBanner = '';
      badge.setAttribute('role', 'note');
      document.body.prepend(badge);
    }
    badge.textContent = ${JSON.stringify(message)};
    badge.style.cssText = 'position:static;box-sizing:border-box;width:100%;background:#283b35;color:white;text-align:center;font-size:12px;line-height:1.5;padding:8px 12px;overflow-wrap:anywhere';
  })()`;
}

module.exports = { bannerScript };
