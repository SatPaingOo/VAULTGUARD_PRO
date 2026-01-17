
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
 * Extract DOM from target URL using iframe (frontend-only, no backend required)
 * Falls back gracefully if CORS blocks access
 */
import { createErrorSuppressor } from './errorSuppression';

export const extractTargetDOM = async (targetUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Suppress third-party script errors from target site (GTM, Braze, etc.)
    // These are expected when loading external sites in iframes
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
        
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        // Fallback: Try fetch (may fail due to CORS, but we'll handle it silently)
        // Don't actually call fetch to avoid CORS errors in console
        reject(new Error('CORS_BLOCKED: Target blocks cross-origin access.'));
      }
    }, 10000); // 10 second timeout

    iframe.onload = () => {
      if (resolved) return;
      clearTimeout(timeout);
      
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.documentElement) {
          const dom = iframeDoc.documentElement.outerHTML;
          
          suppressor.stop();
          
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolved = true;
          resolve(dom);
        } else {
          // CORS blocked - silently reject (expected behavior)
          suppressor.stop();
          
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolved = true;
          reject(new Error('CORS_BLOCKED: Cannot access iframe content.'));
        }
      } catch (e: any) {
        suppressor.stop();
        
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        resolved = true;
        // Silently handle CORS errors - don't log to console
        reject(new Error('CORS_BLOCKED'));
      }
    };

    iframe.onerror = () => {
      if (resolved) return;
      clearTimeout(timeout);
      
      suppressor.stop();
      
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      resolved = true;
      reject(new Error('Failed to load target URL in iframe. Please verify the URL is accessible.'));
    };

    document.body.appendChild(iframe);
  });
};
