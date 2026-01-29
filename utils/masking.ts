import { createErrorSuppressor } from './errorSuppression';

export const maskData = (text: string): string => {
  if (!text) return "";
  let masked = text;
  // Emails
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // AWS Keys
  masked = masked.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]');
  // Generic API Keys
  masked = masked.replace(/(?:"|')?api[_-]?key(?:"|')?\s*[:=]\s*(?:"|')?([a-zA-Z0-9]{24,})(?:"|')?/gi, 'api_key: [REDACTED]');
  // Bearer Tokens
  masked = masked.replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]');
  return masked;
};

/**
 * Extracts only relevant security signals from a DOM string to minimize token usage.
 */
export const extractSecuritySignals = (dom: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(dom, 'text/html');
  
  // Remove heavy/irrelevant elements
  const removals = ['svg', 'path', 'style', 'img', 'video', 'canvas', 'footer', 'nav'];
  removals.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });

  const signals = {
    forms: Array.from(doc.querySelectorAll('form')).map(f => ({
      action: f.getAttribute('action'),
      method: f.getAttribute('method'),
      inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
        name: i.getAttribute('name'),
        type: i.getAttribute('type'),
        placeholder: i.getAttribute('placeholder')
      }))
    })),
    scripts: Array.from(doc.querySelectorAll('script')).map(s => s.src || s.textContent?.substring(0, 200)),
    meta: Array.from(doc.querySelectorAll('meta')).map(m => m.outerHTML),
    links: Array.from(doc.querySelectorAll('a')).map(a => a.href).slice(0, 10)
  };

  return JSON.stringify(signals);
};

/**
 * Extract DOM from target URL.
 * 1. Tries fetch() first so "Allow CORS" extension can make cross-origin HTML readable.
 * 2. Falls back to iframe (same-origin only; cross-origin iframe content is never readable by JS).
 */
export const extractTargetDOM = async (targetUrl: string): Promise<string> => {
  // 1. Try fetch first – when user has "Allow CORS: Access-Control-Allow-Origin" extension,
  //    the extension injects CORS headers so we can read the response body from another origin.
  try {
    const res = await fetch(targetUrl, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 0) {
        // Parse to get document element outerHTML for consistency with iframe path
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        if (doc?.documentElement) {
          return doc.documentElement.outerHTML;
        }
        return html;
      }
    }
  } catch (_) {
    // CORS or network error – fall back to iframe
  }

  // 2. Fallback: iframe (works only when target is same-origin or allows embedding and is same-origin for contentDocument)
  return new Promise((resolve, reject) => {
    const suppressor = createErrorSuppressor();
    suppressor.start();

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.src = targetUrl;

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        suppressor.stop();
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        reject(new Error('CORS_BLOCKED: Target blocks cross-origin access.'));
      }
    }, 10000);

    iframe.onload = () => {
      if (resolved) return;
      clearTimeout(timeout);
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc?.documentElement) {
          const dom = iframeDoc.documentElement.outerHTML;
          suppressor.stop();
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          resolved = true;
          resolve(dom);
        } else {
          suppressor.stop();
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          resolved = true;
          reject(new Error('CORS_BLOCKED: Cannot access iframe content.'));
        }
      } catch {
        suppressor.stop();
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        resolved = true;
        reject(new Error('CORS_BLOCKED'));
      }
    };

    iframe.onerror = () => {
      if (resolved) return;
      clearTimeout(timeout);
      suppressor.stop();
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      resolved = true;
      reject(new Error('Failed to load target URL in iframe. Please verify the URL is accessible.'));
    };

    document.body.appendChild(iframe);
  });
};
