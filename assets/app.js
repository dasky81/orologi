// assets/app.js
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Mobile menu
  const menuBtn = $('#menuBtn');
  const menuPanel = $('#mobileMenu');
  const menuBackdrop = $('#menuBackdrop');

  function openMenu() {
    menuPanel?.classList.remove('hidden');
    menuBackdrop?.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  }
  function closeMenu() {
    menuPanel?.classList.add('hidden');
    menuBackdrop?.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  menuBtn?.addEventListener('click', () => {
    if (menuPanel?.classList.contains('hidden')) openMenu();
    else closeMenu();
  });
  menuBackdrop?.addEventListener('click', closeMenu);
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // Active nav (basic)
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  $$('.nav-link').forEach(a => {
    const href = (a.getAttribute('href') || '').replace(/\/+$/, '');
    if ((href === '/' && path === '/') || (href && href !== '/' && path.endsWith(href))) {
      a.classList.add('text-dark','font-extrabold');
    }
  });

  // Year
  const y = new Date().getFullYear();
  $$('#year').forEach(el => el.textContent = String(y));

  // Concierge modal
  const conciergeBtn = $('#conciergeBtn');
  const conciergeModal = $('#conciergeModal');
  const conciergeClose = $('#conciergeClose');

  function openConcierge() {
    conciergeModal?.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
    if (!window.__orologiChatInit && window.OrologiChat?.init) {
      window.OrologiChat.init();
      window.__orologiChatInit = true;
    }
  }
  function closeConcierge() {
    conciergeModal?.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  conciergeBtn?.addEventListener('click', openConcierge);
  conciergeClose?.addEventListener('click', closeConcierge);
  $('#conciergeBackdrop')?.addEventListener('click', closeConcierge);
  $$('[data-open-concierge]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openConcierge(); }));

  window.addEventListener('DOMContentLoaded', () => { try { window.lucide?.createIcons(); } catch (_) {} });
})();
