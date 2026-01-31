/**
 * Deterministic tech fingerprinting (Wappalyzer-style).
 * Ground Truth for AI: only technologies with explicit evidence in DOM/headers are reported.
 * Reduces hallucination (e.g. Next.js when site is Vite + React).
 * Categories align with TechItem: Frontend | Backend | Library | Server | Database.
 */

export type TechCategory = 'Frontend' | 'Backend' | 'Library' | 'Server' | 'Database';

export interface TechFingerprintItem {
  name: string;
  version?: string;
  category: TechCategory;
  evidence: string;
}

interface PatternRule {
  name: string;
  category: TechCategory;
  patterns: RegExp[];
  versionPattern?: RegExp;
}

const RULES: PatternRule[] = [
  // --- JavaScript frameworks & runtimes ---
  {
    name: 'React',
    category: 'Frontend',
    patterns: [
      /react[-.]?(?:dom|production|development)?\.(?:min\.)?js/i,
      /data-reactroot|data-reactid|__REACT_DEVTOOLS_GLOBAL_HOOK__/i,
      /"react"\s*:\s*["'][\d.]+["']/i,
      /react\/index\.js|react\.jsx/i,
    ],
    versionPattern: /react[@/-]([\d.]+)|"react"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Vite',
    category: 'Frontend',
    patterns: [
      /index-[a-zA-Z0-9_-]+\.js/i,
      /assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9]+\.js/i,
      /__vite_/i,
      /vite\/client/i,
      /@vitejs\/plugin/i,
    ],
  },
  {
    name: 'Next.js',
    category: 'Frontend',
    patterns: [
      /_next\//i,
      /__NEXT_DATA__/i,
      /next\.js|next\/dist\//i,
      /"next"\s*:\s*["'][\d.]+["']/i,
    ],
    versionPattern: /next[@/-]([\d.]+)|"next"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Vue',
    category: 'Frontend',
    patterns: [
      /vue\.(?:min\.)?js/i,
      /data-v-|v-bind|v-on|v-model|v-if|v-for/i,
      /"vue"\s*:\s*["'][\d.]+["']/i,
    ],
    versionPattern: /vue[@/-]([\d.]+)|"vue"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Nuxt',
    category: 'Frontend',
    patterns: [/nuxt\.(?:min\.)?js/i, /__NUXT__|_nuxt\//i, /"nuxt"/i],
    versionPattern: /nuxt[@/-]([\d.]+)/i,
  },
  {
    name: 'Angular',
    category: 'Frontend',
    patterns: [
      /angular\.(?:min\.)?js/i,
      /ng-version|ng-app|ng-[a-z]+/i,
      /"@angular\/core"/i,
    ],
    versionPattern: /angular[@/-]([\d.]+)/i,
  },
  {
    name: 'Svelte',
    category: 'Frontend',
    patterns: [/svelte|svelte\/internal/i, /"svelte"/i],
    versionPattern: /svelte[@/-]([\d.]+)/i,
  },
  {
    name: 'Remix',
    category: 'Frontend',
    patterns: [/remix|@remix-run/i, /"@remix-run\/react"/i],
    versionPattern: /remix[@/-]([\d.]+)/i,
  },
  {
    name: 'jQuery',
    category: 'Library',
    patterns: [/jquery[-.]?(?:min\.)?js/i, /\$\.ajax|jQuery\./i],
    versionPattern: /jquery[@/-]([\d.]+)/i,
  },
  // --- UI frameworks & styling ---
  {
    name: 'Tailwind CSS',
    category: 'Frontend',
    patterns: [
      /tailwind|tailwindcss/i,
      /tw-|class="[^"]*\b(flex|grid|p-|m-|text-|bg-|rounded|shadow|w-|h-)/i,
      /"tailwindcss"/i,
    ],
    versionPattern: /tailwindcss[@/-]([\d.]+)|"tailwindcss"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Bootstrap',
    category: 'Frontend',
    patterns: [
      /bootstrap[-.]?(?:min\.)?(?:js|css)/i,
      /class="[^"]*\b(container|row|col-|btn-|navbar|modal)/i,
      /"bootstrap"/i,
    ],
    versionPattern: /bootstrap[@/-]([\d.]+)/i,
  },
  {
    name: 'Framer Motion',
    category: 'Library',
    patterns: [/framer-motion|motion\./i, /"framer-motion"/i],
    versionPattern: /framer-motion[@/-]([\d.]+)/i,
  },
  {
    name: 'Lucide',
    category: 'Library',
    patterns: [
      /lucide[-.]?react|lucide-react/i,
      /from\s+['"]lucide-react['"]/i,
      /lucide\.react/i,
    ],
    versionPattern: /lucide-react[@/-]([\d.]+)/i,
  },
  {
    name: 'Font Awesome',
    category: 'Library',
    patterns: [
      /font-?awesome|fa-|fas |far |fab |fa-solid|fa-brands/i,
      /all\.min\.js.*fontawesome/i,
    ],
    versionPattern: /fontawesome[@/-]([\d.]+)/i,
  },
  {
    name: 'Material UI',
    category: 'Library',
    patterns: [/@mui\/|material-ui|MuiBox|MuiButton/i],
    versionPattern: /@mui\/material[@/-]([\d.]+)/i,
  },
  {
    name: 'Chakra UI',
    category: 'Library',
    patterns: [/@chakra-ui|ChakraProvider|chakra\.ui/i],
    versionPattern: /@chakra-ui\/react[@/-]([\d.]+)/i,
  },
  {
    name: 'Radix UI',
    category: 'Library',
    patterns: [/@radix-ui|radix-ui/i],
  },
  // --- Routing ---
  {
    name: 'React Router',
    category: 'Library',
    patterns: [
      /react-router|react-router-dom/i,
      /"react-router-dom"/i,
      /createBrowserRouter|useNavigate|useParams/i,
    ],
    versionPattern: /react-router[-@/]([\d.]+)|"react-router-dom"\s*:\s*["']([\d.]+)["']/i,
  },
  // --- Maps & media ---
  {
    name: 'Leaflet',
    category: 'Library',
    patterns: [
      /leaflet\.(?:js|css)/i,
      /L\.map|L\.tileLayer|L\.marker/i,
      /"leaflet"/i,
    ],
    versionPattern: /leaflet[@/-]([\d.]+)|"leaflet"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Mapbox',
    category: 'Library',
    patterns: [/mapbox-gl|mapbox\.gl/i, /"mapbox-gl"/i],
    versionPattern: /mapbox-gl[@/-]([\d.]+)/i,
  },
  {
    name: 'Google Maps',
    category: 'Library',
    patterns: [/maps\.googleapis\.com|google\.maps|gmaps/i],
  },
  // --- Fonts & CDN ---
  {
    name: 'Google Fonts',
    category: 'Library',
    patterns: [/fonts\.googleapis\.com|fonts\.gstatic\.com/i],
  },
  {
    name: 'Unpkg',
    category: 'Library',
    patterns: [/unpkg\.com/i],
  },
  {
    name: 'jsDelivr',
    category: 'Library',
    patterns: [/cdn\.jsdelivr\.net|jsdelivr\.net/i],
  },
  {
    name: 'cdnjs',
    category: 'Library',
    patterns: [/cdnjs\.cloudflare\.com/i],
  },
  // --- Analytics & tracking ---
  {
    name: 'Google Analytics',
    category: 'Library',
    patterns: [/google-analytics|gtag|ga\(|googletagmanager\.com\/gtag/i],
  },
  {
    name: 'Google Tag Manager',
    category: 'Library',
    patterns: [/googletagmanager\.com\/gtm\.js|GTM-|dataLayer/i],
  },
  // --- CMS ---
  {
    name: 'WordPress',
    category: 'Backend',
    patterns: [
      /wp-content|wp-includes|wp-admin/i,
      /wordpress|wp-json\/wp\/v2/i,
      /generator.*wordpress/i,
    ],
    versionPattern: /wordpress[@/-]([\d.]+)|content="WordPress\s+([\d.]+)"/i,
  },
  {
    name: 'Drupal',
    category: 'Backend',
    patterns: [/drupal\.js|sites\/default|Drupal\.settings/i],
    versionPattern: /Drupal\s+([\d.]+)/i,
  },
  {
    name: 'Joomla',
    category: 'Backend',
    patterns: [/joomla|com_content|Joomla\./i],
    versionPattern: /Joomla!?\s*([\d.]+)|joomla[@/-]([\d.]+)/i,
  },
  // --- Backend frameworks (passive fingerprinting) ---
  {
    name: 'Laravel',
    category: 'Backend',
    patterns: [
      /csrf-token|laravel|livewire/i,
      /mix-manifest\.json|vite\.config.*laravel/i,
      /@vite\(|Route::|config\('app\.name'\)/i,
    ],
    versionPattern: /laravel[@/-]([\d.]+)/i,
  },
  {
    name: 'Django',
    category: 'Backend',
    patterns: [
      /csrfmiddlewaretoken|csrftoken|django/i,
      /STATIC_URL|__admin_media_prefix__|get_media_prefix/i,
      /formaction.*django|data-django/i,
    ],
    versionPattern: /django[@/-]([\d.]+)/i,
  },
  {
    name: 'Express',
    category: 'Backend',
    patterns: [
      /"express"|'express'|require\s*\(\s*['"]express['"]\)/i,
      /express\.Router|app\.use\(|__dirname/i,
      /X-Powered-By:\s*Express/i,
    ],
    versionPattern: /express[@/-]([\d.]+)/i,
  },
  {
    name: 'Rails',
    category: 'Backend',
    patterns: [
      /rails|csrf_meta_tag|data-turbo|turbo-frame/i,
      /action_cable|rails-ujs|rails\/ujs/i,
      /content-for|yield.*stylesheet_link_tag/i,
    ],
    versionPattern: /rails[@/-]([\d.]+)/i,
  },
  {
    name: 'PHP',
    category: 'Backend',
    patterns: [
      /\.php\b|\.php\?|PHPSESSID|session\.save_path/i,
      /PHP_SELF|phpinfo|php_version/i,
      /X-Powered-By:\s*PHP/i,
    ],
  },
  // --- Security / headers handled in detectFromHeaders ---
];

/**
 * Detect technologies from DOM/signals string using deterministic pattern matching.
 */
function detectFromDom(domOrSignals: string): TechFingerprintItem[] {
  const results: TechFingerprintItem[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(domOrSignals)) {
        if (seen.has(rule.name)) continue;
        seen.add(rule.name);

        let version: string | undefined;
        if (rule.versionPattern) {
          const m = domOrSignals.match(rule.versionPattern);
          if (m) {
            const v = m.slice(1).find(Boolean);
            if (v) version = v;
          }
        }

        results.push({
          name: rule.name,
          version,
          category: rule.category,
          evidence: `Detected in DOM/signals (pattern: ${pattern.source.slice(0, 40)}...)`,
        });
        break;
      }
    }
  }

  return results;
}

/**
 * Detect technologies from HTTP headers (Server, X-Powered-By, X-*-Id, etc.).
 */
function detectFromHeaders(headers: Record<string, string | null> | undefined): TechFingerprintItem[] {
  const results: TechFingerprintItem[] = [];
  const seen = new Set<string>();
  if (!headers || typeof headers !== 'object') return results;

  const get = (key: string): string | null =>
    headers[key] ?? headers[key.toLowerCase()] ?? null;

  const server = get('Server');
  const poweredBy = get('X-Powered-By');
  const hsts = get('Strict-Transport-Security');
  const xVercelId = get('X-Vercel-Id');
  const xVercelForwardedFor = get('X-Vercel-Forwarded-For');
  const xNetlifyId = get('X-Netlify-Id');
  const xAmzCfId = get('X-Amz-Cf-Id');
  const xAspnetVersion = get('X-AspNet-Version');
  const xGenerator = get('X-Generator');
  const xDrupalCache = get('X-Drupal-Cache');

  const add = (name: string, category: TechCategory, evidence: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    results.push({ name, category, evidence });
  };

  // PaaS / Hosting
  if ((server && /vercel/i.test(server)) || xVercelId || xVercelForwardedFor) {
    add('Vercel', 'Server', server ? `Server: ${server}` : 'X-Vercel-* header');
    add('Node.js', 'Server', 'Inferred from Vercel hosting (typical runtime)');
  }
  if (server && /cloudflare/i.test(server)) {
    add('Cloudflare', 'Server', `Server header: ${server}`);
  }
  if (xNetlifyId || (server && /netlify/i.test(server))) {
    add('Netlify', 'Server', xNetlifyId ? 'X-Netlify-Id header' : `Server: ${server}`);
  }
  if (xAmzCfId || (server && /cloudfront|amazon/i.test(server ?? ''))) {
    add('Amazon CloudFront', 'Server', xAmzCfId ? 'X-Amz-Cf-Id header' : `Server: ${server}`);
  }
  if (server && /nginx/i.test(server)) {
    add('Nginx', 'Server', `Server header: ${server}`);
  }
  if (server && /apache/i.test(server)) {
    add('Apache', 'Server', `Server header: ${server}`);
  }
  if (server && /Microsoft-IIS/i.test(server)) {
    add('IIS', 'Server', `Server header: ${server}`);
  }

  // Backend / runtime
  if (poweredBy) {
    const name = poweredBy.split('/')[0].trim();
    if (name) add(name, 'Server', `X-Powered-By: ${poweredBy}`);
  }
  if (xAspnetVersion) {
    add('ASP.NET', 'Backend', `X-AspNet-Version: ${xAspnetVersion}`);
  }
  if (xGenerator) {
    const g = xGenerator.trim();
    if (/wordpress/i.test(g)) add('WordPress', 'Backend', `X-Generator: ${g}`);
    else if (/drupal/i.test(g)) add('Drupal', 'Backend', `X-Generator: ${g}`);
  }
  if (xDrupalCache) add('Drupal', 'Backend', 'X-Drupal-Cache header');

  // Security
  if (hsts) add('HSTS', 'Server', 'Strict-Transport-Security header present');

  return results;
}

/**
 * Run deterministic tech fingerprint on DOM/signals and optional headers.
 * Returns Ground Truth list for AI: only report technologies in this list.
 */
export function detectTechFingerprint(
  domOrSignals: string,
  headers?: Record<string, string | null> | undefined
): TechFingerprintItem[] {
  if (!domOrSignals || typeof domOrSignals !== 'string') {
    return headers ? detectFromHeaders(headers) : [];
  }

  const fromDom = detectFromDom(domOrSignals);
  const fromHeaders = detectFromHeaders(headers);

  const byName = new Map<string, TechFingerprintItem>();
  for (const item of fromDom) byName.set(item.name, item);
  for (const item of fromHeaders) {
    if (!byName.has(item.name)) byName.set(item.name, item);
  }

  return Array.from(byName.values());
}
