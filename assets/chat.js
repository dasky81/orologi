// assets/chat.js
window.OrologiChat = (() => {
  const $ = (s, r=document) => r.querySelector(s);

  let chatArea, chatInput, sendBtn, uploadBtn, imageInput;

  function scrollToBottom() { chatArea.scrollTop = chatArea.scrollHeight; }

  function safeMarkdownToHtml(mdText) {
    const raw = window.marked ? marked.parse(mdText) : mdText;
    return window.DOMPurify ? DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } }) : raw;
  }

  function appendMessage(text, sender, imageBase64 = null) {
    const row = document.createElement('div');
    row.className = `flex gap-3 ${sender === 'user' ? 'flex-row-reverse' : ''}`;

    let contentHtml = '';
    if (imageBase64) {
      contentHtml = `
        <div class="relative rounded-lg overflow-hidden border border-gray-200 mb-1 bg-white">
          <img src="${imageBase64}" alt="Foto caricata" class="max-w-[180px] w-full object-cover" loading="lazy" decoding="async" />
        </div>
      `;
    } else if (sender === 'ai') {
      contentHtml = safeMarkdownToHtml(text);
    } else {
      contentHtml = (text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const avatarIcon = sender === 'ai' ? 'sparkles' : 'user';
    const avatarBg = sender === 'ai' ? 'bg-dark text-white' : 'bg-gray-200 text-medium';
    const bubbleBg = sender === 'ai' ? 'bg-white border border-gray-200 text-dark' : 'bg-dark text-white';

    row.innerHTML = `
      <div class="w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
        <i data-lucide="${avatarIcon}" class="w-4 h-4"></i>
      </div>
      <div class="${bubbleBg} p-3.5 rounded-2xl text-sm shadow-sm prose prose-sm max-w-[85%] ${sender === 'user' ? 'rounded-tr-none prose-invert' : 'rounded-tl-none'}">
        ${contentHtml}
      </div>
    `;

    chatArea.appendChild(row);
    try { window.lucide?.createIcons(); } catch (_) {}
    scrollToBottom();
  }

  function showTyping() {
    const row = document.createElement('div');
    row.id = 'typing';
    row.className = 'flex gap-3';
    row.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-dark text-white flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
        <i data-lucide="sparkles" class="w-4 h-4"></i>
      </div>
      <div class="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none flex gap-2 shadow-sm h-12 items-center" aria-label="Sta scrivendo">
        <span class="dot d1"></span>
        <span class="dot d2"></span>
        <span class="dot d3"></span>
      </div>
    `;
    chatArea.appendChild(row);
    try { window.lucide?.createIcons(); } catch (_) {}
    scrollToBottom();
  }

  function renderIntro() {
    chatArea.innerHTML = '';
    appendMessage("Benvenuto su **Orologi.news**.\n\nSono il concierge digitale: stime, trend e pre-screening visivo da foto.\n\n**Input ideali:** brand, referenza, anno, condizioni, full set, service.", 'ai');
  }

  async function callBackend(text, imageBase64) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, image: imageBase64 })
    });
    if (!res.ok) {
      let payload = {};
      try { payload = await res.json(); } catch (_) {}
      throw new Error(payload?.error || 'Errore API');
    }
    const data = await res.json();
    return data.result;
  }

  async function handleSend(txt = null, img = null) {
    const text = (txt ?? chatInput.value).trim();
    if (!text && !img) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    appendMessage(text || "Analisi foto", 'user', img);
    sendBtn.disabled = true;

    showTyping();

    try {
      await new Promise(r => setTimeout(r, img ? 900 : 550));
      const response = await callBackend(text || "Analizza la foto: autenticità (pre-screening) e stima di mercato con range", img);
      document.getElementById('typing')?.remove();
      appendMessage(response, 'ai');
    } catch (_) {
      document.getElementById('typing')?.remove();
      appendMessage("Ops: l'API non risponde. Verifica **GEMINI_API_KEY** su Vercel e riprova.", 'ai');
    } finally {
      sendBtn.disabled = false;
    }
  }

  async function compressImageToDataUrl(file, maxDim = 1280, quality = 0.85) {
    const bitmap = await (window.createImageBitmap
      ? createImageBitmap(file)
      : new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          const r = new FileReader();
          r.onload = () => { img.src = r.result; };
          r.onerror = reject;
          r.readAsDataURL(file);
        })
    );

    const w = bitmap.width || bitmap.naturalWidth;
    const h = bitmap.height || bitmap.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function bind() {
    uploadBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await compressImageToDataUrl(file);
        await handleSend('', dataUrl);
      } catch (_) {
        const reader = new FileReader();
        reader.onload = (ev) => handleSend('', ev.target.result);
        reader.readAsDataURL(file);
      } finally {
        e.target.value = '';
      }
    });

    $('#chatForm')?.addEventListener('submit', (e) => { e.preventDefault(); handleSend(); });

    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 180) + 'px';
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    $('#promptRolex')?.addEventListener('click', () => handleSend('Analisi di mercato Rolex Submariner'));
    $('#promptFake')?.addEventListener('click', () => handleSend('Come distinguere un falso Speedmaster?'));
    $('#promptInvest')?.addEventListener('click', () => handleSend('Quali modelli hanno tenuto meglio il valore nel 2024-2025?'));
  }

  function init() {
    chatArea = $('#chatArea');
    chatInput = $('#chatInput');
    sendBtn = $('#sendBtn');
    uploadBtn = $('#uploadBtn');
    imageInput = $('#imageInput');
    if (!chatArea || !chatInput || !sendBtn || !uploadBtn || !imageInput) return;

    if (window.marked) {
      marked.setOptions({ gfm:true, breaks:true, headerIds:false, mangle:false });
    }

    renderIntro();
    bind();
    try { window.lucide?.createIcons(); } catch (_) {}
  }

  return { init };
})();
