// Appearance is independent of Auth, progress storage and backup/restore.
(() => {
  const key = 'resettable-appearance-v1';
  const choices = ['light', 'dark', 'system'];
  const root = document.documentElement;
  const system = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference = 'light';
  let storageFailed = false;
  try {
    const saved = localStorage.getItem(key);
    if (choices.includes(saved)) preference = saved;
  } catch { storageFailed = true; }

  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && system?.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101d17' : '#f6f3eb');
  }
  // This small, synchronous head script applies before styles and page content.
  apply();
  system?.addEventListener('change', () => { if (preference === 'system') apply(); });

  document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input[name="appearance"]');
    const status = document.getElementById('appearance-status');
    function render() {
      for (const input of inputs) input.checked = input.value === preference;
      status.textContent = storageFailed
        ? 'Appearance applies for this visit, but your preference could not be saved on this device. Your Reset progress is unaffected.'
        : `Appearance: ${preference === 'system' ? 'System (follows your device)' : preference === 'dark' ? 'Dark' : 'Light'}.`;
      status.dataset.error = String(storageFailed);
    }
    for (const input of inputs) input.addEventListener('change', () => {
      if (!input.checked || !choices.includes(input.value)) return;
      preference = input.value;
      apply();
      try { localStorage.setItem(key, preference); storageFailed = false; }
      catch { storageFailed = true; }
      render();
    });
    render();
  });
})();
