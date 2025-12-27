// api/analyze.js
// Vercel Serverless Function: POST /api/analyze
//
// ENV required:
// - GEMINI_API_KEY
// Optional:
// - GEMINI_MODEL (default: gemini-2.5-flash)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY env var' });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Vercel parses JSON body automatically for application/json,
  // but we keep a defensive fallback.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const text = (body?.text || '').trim();
  const image = body?.image || null;

  if (!text && !image) {
    return res.status(400).json({ error: 'Missing input: provide "text" and/or "image".' });
  }

  // Parse data URL -> {mime, base64}
  let inlineImagePart = null;
  if (image) {
    const m = String(image).match(/^data:(.+);base64,(.*)$/);
    const mimeType = m?.[1] || 'image/jpeg';
    const b64 = m?.[2] || String(image);

    // ~ 14M chars base64 cap (roughly ~10MB raw)
    if (b64.length > 14_000_000) {
      return res.status(413).json({ error: 'Image too large. Please upload a smaller/compressed image.' });
    }

    inlineImagePart = { inline_data: { mime_type: mimeType, data: b64 } };
  }

  const systemInstruction = {
    parts: [{
      text:
        "Sei un analista esperto di orologeria di lusso (mercato secondario, vintage, autenticità visiva). " +
        "Rispondi in italiano, in modo chiaro e operativo. " +
        "Se c'è una foto: fai un pre-screening (non dare certezze assolute), elenca segnali da verificare, e stima un range. " +
        "Se manca la referenza: chiedi i dati minimi (brand, ref, anno, condizioni, full set, service)."
    }]
  };

  const parts = [];
  if (text) parts.push({ text });
  else parts.push({ text: "Analizza la foto: autenticità (pre-screening) e stima di mercato con range." });
  if (inlineImagePart) parts.push(inlineImagePart);

  const payload = {
    systemInstruction,
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 900 }
  };

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || 'Gemini API error',
        details: data?.error || data
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p?.text)
        ?.filter(Boolean)
        ?.join('\n')
        ?.trim();

    if (!result) {
      return res.status(500).json({ error: 'Empty response from Gemini', raw: data });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: 'Server error calling Gemini', message: String(err?.message || err) });
  }
};
