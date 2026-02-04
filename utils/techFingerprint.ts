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
      /data-reactroot|data-reactid|__REACT_DEVTOOLS_GLOBAL_HOOK__|__REACT__|__reactContainer\$/i,
      /"react"\s*:\s*["'][\d.]+["']/i,
      /react\/index\.js|react\.jsx|createRoot|ReactDOM\.render/i,
      /react-is|scheduler\/cjs/i,
    ],
    versionPattern: /react[@/-]([\d.]+)|"react"\s*:\s*["']([\d.]+)["']|React\s+([\d.]+)/i,
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
      /import\.meta\.hot|vite\/env/i,
    ],
    versionPattern: /vite[@/-]([\d.]+)|"vite"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Next.js',
    category: 'Frontend',
    patterns: [
      /_next\//i,
      /__NEXT_DATA__/i,
      /next\.js|next\/dist\//i,
      /"next"\s*:\s*["'][\d.]+["']/i,
      /__next_/i,
    ],
    versionPattern: /next[@/-]([\d.]+)|"next"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Vue',
    category: 'Frontend',
    patterns: [
      /vue\.(?:min\.)?js|vue\.runtime/i,
      /data-v-|v-bind|v-on|v-model|v-if|v-for|v-show|v-cloak|v-html|v-once/i,
      /"vue"\s*:\s*["'][\d.]+["']/i,
      /__vue__|__VUE__|vue\.createApp|createApp\(/i,
    ],
    versionPattern: /vue[@/-]([\d.]+)|"vue"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Nuxt',
    category: 'Frontend',
    patterns: [/nuxt\.(?:min\.)?js/i, /__NUXT__|_nuxt\//i, /"nuxt"/i, /useNuxtApp|defineNuxtPlugin/i],
    versionPattern: /nuxt[@/-]([\d.]+)/i,
  },
  {
    name: 'Angular',
    category: 'Frontend',
    patterns: [
      /angular\.(?:min\.)?js/i,
      /ng-version|ng-app|ng-[a-z]+|data-ng-[a-z]+/i,
      /"@angular\/core"/i,
      /_nghost_|_ngcontent_|ng-version/i,
      /platform-browser-dynamic|NgModule/i,
    ],
    versionPattern: /angular[@/-]([\d.]+)|ng-version="([\d.]+)"/i,
  },
  {
    name: 'Svelte',
    category: 'Frontend',
    patterns: [/svelte|svelte\/internal/i, /"svelte"/i, /data-svelte-h|svelte-h-|SvelteComponent/i],
    versionPattern: /svelte[@/-]([\d.]+)/i,
  },
  {
    name: 'Solid.js',
    category: 'Frontend',
    patterns: [/solid-js|solid\.js/i, /data-hydration|createSignal|createEffect/i, /"solid-js"/i],
    versionPattern: /solid-js[@/-]([\d.]+)/i,
  },
  {
    name: 'Preact',
    category: 'Frontend',
    patterns: [/preact\/|preact\.js/i, /__preact__|preact\/hooks/i, /"preact"/i],
    versionPattern: /preact[@/-]([\d.]+)/i,
  },
  {
    name: 'Astro',
    category: 'Frontend',
    patterns: [/data-astro-|astro-|_astro\//i, /Astro\.|import\.meta\.astro/i, /"astro"/i],
    versionPattern: /astro[@/-]([\d.]+)/i,
  },
  {
    name: 'Remix',
    category: 'Frontend',
    patterns: [/remix|@remix-run/i, /"@remix-run\/react"/i],
    versionPattern: /remix[@/-]([\d.]+)/i,
  },
  {
    name: 'Alpine.js',
    category: 'Library',
    patterns: [/x-data|x-show|x-on|x-model|x-if|x-for|x-transition|Alpine\./i],
    versionPattern: /alpinejs[@/-]([\d.]+)/i,
  },
  {
    name: 'HTMX',
    category: 'Library',
    patterns: [/hx-get|hx-post|hx-put|hx-delete|hx-swap|hx-trigger|htmx\./i],
    versionPattern: /htmx[@/-]([\d.]+)/i,
  },
  {
    name: 'Ember',
    category: 'Frontend',
    patterns: [/ember\.js|ember\.min\.js/i, /data-ember-|Ember\.|@ember\//i],
    versionPattern: /ember[@/-]([\d.]+)/i,
  },
  {
    name: 'Backbone.js',
    category: 'Library',
    patterns: [/backbone\.(?:min\.)?js/i, /Backbone\.Model|Backbone\.View/i],
    versionPattern: /backbone[@/-]([\d.]+)/i,
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
      /"tailwindcss"|@tailwind\s+(base|components|utilities)/i,
      /(?:class|className)=["'][^"']*\b(md:|lg:|xl:|2xl:|sm:|dark:|focus:|hover:bg-|sr-only|ring-|inset-)/i,
      /tw-|tailwind\.config/i,
    ],
    versionPattern: /tailwindcss[@/-]([\d.]+)|"tailwindcss"\s*:\s*["']([\d.]+)["']/i,
  },
  {
    name: 'Bootstrap',
    category: 'Frontend',
    patterns: [
      /bootstrap[-.]?(?:min\.)?(?:js|css)/i,
      /class="[^"]*\b(container|row|col-|btn-|navbar|modal|card|dropdown|collapse)/i,
      /"bootstrap"/i,
    ],
    versionPattern: /bootstrap[@/-]([\d.]+)/i,
  },
  {
    name: 'Bulma',
    category: 'Frontend',
    patterns: [
      /bulma\.(?:min\.)?css|bulma\.css/i,
      /class="[^"]*\b(has-text-|is-primary|is-link|navbar-burger|hero-body|section)/i,
      /"bulma"/i,
    ],
    versionPattern: /bulma[@/-]([\d.]+)/i,
  },
  {
    name: 'Foundation',
    category: 'Frontend',
    patterns: [/foundation\.(?:min\.)?(?:js|css)/i, /data-abide|data-responsive-toggle|data-slider/i],
    versionPattern: /foundation[@/-]([\d.]+)/i,
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
    patterns: [/@mui\/|material-ui|MuiBox|MuiButton|MuiTextField/i],
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
  {
    name: 'Ant Design',
    category: 'Library',
    patterns: [/antd|ant-design|ant\.css|antd\.css/i],
    versionPattern: /antd[@/-]([\d.]+)/i,
  },
  {
    name: 'Headless UI',
    category: 'Library',
    patterns: [/@headlessui|headlessui/i],
  },
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
  {
    name: 'Redux',
    category: 'Library',
    patterns: [/redux|__REDUX_DEVTOOLS__|createStore|configureStore/i],
    versionPattern: /redux[@/-]([\d.]+)/i,
  },
  {
    name: 'Zustand',
    category: 'Library',
    patterns: [/zustand|from\s+['"]zustand['"]|"zustand"/i],
    versionPattern: /zustand[@/-]([\d.]+)/i,
  },
  {
    name: 'TanStack Query',
    category: 'Library',
    patterns: [/@tanstack\/react-query|useQuery|useMutation|QueryClient/i],
    versionPattern: /@tanstack\/react-query[@/-]([\d.]+)/i,
  },
  {
    name: 'Three.js',
    category: 'Library',
    patterns: [/three\.(?:min\.)?js|THREE\.|OrbitControls|WebGLRenderer/i],
    versionPattern: /three[@/-]([\d.]+)/i,
  },
  {
    name: 'D3.js',
    category: 'Library',
    patterns: [/d3\.(?:min\.)?js|d3\.min\.js|d3\.select|d3\.scale/i],
    versionPattern: /d3[@/-]([\d.]+)/i,
  },
  {
    name: 'Chart.js',
    category: 'Library',
    patterns: [/chart\.(?:min\.)?js|Chart\.register|new Chart\(/i],
    versionPattern: /chart\.js[@/-]([\d.]+)/i,
  },
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
  {
    name: 'Socket.io',
    category: 'Library',
    patterns: [/socket\.io|io\.connect|io\(/i],
    versionPattern: /socket\.io[@/-]([\d.]+)/i,
  },
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
      /wp-embed\.js|wp-emoji-release/i,
    ],
    versionPattern: /wordpress[@/-]([\d.]+)|content="WordPress\s+([\d.]+)"/i,
  },
  {
    name: 'WooCommerce',
    category: 'Backend',
    patterns: [/woocommerce|wc-|cart-form|add_to_cart|wc_add_to_cart/i],
    versionPattern: /woocommerce[@/-]([\d.]+)/i,
  },
  {
    name: 'Drupal',
    category: 'Backend',
    patterns: [/drupal\.js|sites\/default|Drupal\.settings|drupalSettings/i],
    versionPattern: /Drupal\s+([\d.]+)/i,
  },
  {
    name: 'Joomla',
    category: 'Backend',
    patterns: [/joomla|com_content|Joomla\.|option=com_/i],
    versionPattern: /Joomla!?\s*([\d.]+)|joomla[@/-]([\d.]+)/i,
  },
  {
    name: 'Magento',
    category: 'Backend',
    patterns: [/Mage\.|magento|requirejs\/mixins\/mage/i],
    versionPattern: /Magento\s+([\d.]+)/i,
  },
  {
    name: 'Shopify',
    category: 'Backend',
    patterns: [/Shopify\.|shopify\.com|cdn\.shopify\.com|shopify_/i],
  },
  {
    name: 'Ghost',
    category: 'Backend',
    patterns: [/ghost\.org|content-api|ghost-frontend/i],
  },
  {
    name: 'Strapi',
    category: 'Backend',
    patterns: [/strapi|@strapi\//i],
  },
  // --- Backend languages & frameworks ---
  {
    name: 'PHP',
    category: 'Backend',
    patterns: [
      /\.php\b|\.php\?|PHPSESSID|session\.save_path/i,
      /PHP_SELF|phpinfo|php_version/i,
      /wp-json\/wp\/|wp-content\/|wp-includes\//i,
    ],
  },
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
    name: 'Flask',
    category: 'Backend',
    patterns: [/flask|Flask\(|werkzeug|url_for\(/i],
    versionPattern: /flask[@/-]([\d.]+)/i,
  },
  {
    name: 'FastAPI',
    category: 'Backend',
    patterns: [/fastapi|uvicorn|starlette/i],
    versionPattern: /fastapi[@/-]([\d.]+)/i,
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
    name: 'Java',
    category: 'Backend',
    patterns: [
      /JSESSIONID|\.jsp\b|java\.lang|javax\./i,
      /tomcat|Apache Tomcat/i,
      /springframework|Spring Boot|org\.springframework/i,
    ],
  },
  {
    name: 'Spring',
    category: 'Backend',
    patterns: [/springframework|Spring Boot|org\.springframework|spring-boot/i],
    versionPattern: /spring[-_]?boot[@/-]([\d.]+)/i,
  },
  {
    name: 'ASP.NET',
    category: 'Backend',
    patterns: [/__VIEWSTATE|__EVENTVALIDATION|aspnet_client|\.aspx\b/i],
  },
  {
    name: 'Node.js',
    category: 'Backend',
    patterns: [/node\.js|process\.env|__dirname|require\s*\(\s*['"]/i],
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

  // Backend / runtime (X-Powered-By can be "PHP/8.2", "Express", "ASP.NET", etc.)
  if (poweredBy) {
    const raw = poweredBy.trim();
    const name = raw.split('/')[0].trim();
    if (name) {
      if (/php/i.test(name)) add('PHP', 'Backend', `X-Powered-By: ${poweredBy}`);
      else if (/express/i.test(name)) add('Express', 'Backend', `X-Powered-By: ${poweredBy}`);
      else if (/asp\.net|dotnet/i.test(name)) add('ASP.NET', 'Backend', `X-Powered-By: ${poweredBy}`);
      else if (/python/i.test(name)) add('Python', 'Backend', `X-Powered-By: ${poweredBy}`);
      else add(name, 'Server', `X-Powered-By: ${poweredBy}`);
    }
  }
  if (xAspnetVersion) {
    add('ASP.NET', 'Backend', `X-AspNet-Version: ${xAspnetVersion}`);
  }
  if (server && /tomcat|jetty|jboss/i.test(server)) {
    add('Java', 'Backend', `Server: ${server}`);
  }
  if (server && /gunicorn|uvicorn|waitress/i.test(server)) {
    add('Python', 'Backend', `Server: ${server}`);
  }
  const xRuntime = get('X-Runtime');
  if (xRuntime && /ruby/i.test(xRuntime)) {
    add('Ruby', 'Backend', `X-Runtime: ${xRuntime}`);
  }
  if (xGenerator) {
    const g = xGenerator.trim();
    if (/wordpress/i.test(g)) add('WordPress', 'Backend', `X-Generator: ${g}`);
    else if (/drupal/i.test(g)) add('Drupal', 'Backend', `X-Generator: ${g}`);
    else if (/joomla/i.test(g)) add('Joomla', 'Backend', `X-Generator: ${g}`);
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
