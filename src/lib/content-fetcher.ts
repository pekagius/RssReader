import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/get?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

const FETCH_CONFIG = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, proxyUrl: string, attempt: number = 1): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_CONFIG.timeout);

    const response = await fetch(`${proxyUrl}${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (proxyUrl.includes('allorigins')) {
      const data = await response.json();
      return data.contents;
    }
    
    return await response.text();
  } catch (error) {
    if (attempt < FETCH_CONFIG.maxRetries) {
      await delay(FETCH_CONFIG.retryDelay * attempt);
      return fetchWithTimeout(url, proxyUrl, attempt + 1);
    }
    throw error;
  }
}

async function tryFetchWithProxies(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const html = await fetchWithTimeout(url, proxy);
      if (html && html.length > 0) {
        return html;
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw lastError || new Error('All proxies failed');
}

function cleanupDocument(doc: Document, baseUrl: URL): void {
  // Remove framework-specific attributes
  const frameworkAttrs = [
    '@click',
    '@change',
    '@input',
    '@submit',
    'v-',
    'ng-',
    ':class',
    ':style',
    ':src',
    ':href',
    ':alt',
    ':id',
    'x-',
    'data-v-',
    '[(ngModel)]',
    '[ngClass]',
    '[ngStyle]',
    '(click)',
    '(change)',
    '(input)',
    '(submit)'
  ];

  // Clean up all elements
  const allElements = doc.getElementsByTagName('*');
  for (const el of Array.from(allElements)) {
    // Remove framework-specific attributes
    for (const attr of Array.from(el.attributes)) {
      if (frameworkAttrs.some(prefix => attr.name.startsWith(prefix))) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // Remove unwanted elements
  const elementsToRemove = [
    'script', 'style', 'iframe', 'noscript',
    '[class*="cookie"]', '[class*="popup"]', '[class*="newsletter"]',
    '[class*="ad-"]', '[class*="advertisement"]', '[id*="cookie"]',
    '[id*="popup"]', '[id*="newsletter"]', '[id*="ad-"]',
    'header', 'footer', 'nav', '.nav', '.header', '.footer',
    '.social', '.share', '.comments', '.related', '.sidebar'
  ];

  elementsToRemove.forEach(selector => {
    try {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    } catch (e) {
      // Ignore invalid selectors
    }
  });

  // Fix image sources
  doc.querySelectorAll('img').forEach(img => {
    try {
      const srcAttrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-srcset'];
      let imgSrc = '';

      for (const attr of srcAttrs) {
        const value = img.getAttribute(attr);
        if (value?.trim()) {
          imgSrc = value.trim();
          break;
        }
      }

      if (imgSrc) {
        if (imgSrc.startsWith('//')) {
          imgSrc = `https:${imgSrc}`;
        } else if (!imgSrc.startsWith('http') && !imgSrc.startsWith('data:')) {
          imgSrc = new URL(imgSrc, baseUrl.origin).href;
        }
        
        // Remove all existing attributes
        while (img.attributes.length > 0) {
          img.removeAttribute(img.attributes[0].name);
        }
        
        // Set only the attributes we want
        img.src = imgSrc;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '1rem auto';
      }
    } catch (e) {
      img.remove();
    }
  });

  // Fix relative URLs in links
  doc.querySelectorAll('a').forEach(link => {
    try {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        link.href = new URL(href, baseUrl.origin).href;
      }
      
      // Remove all attributes except href and class
      const attrs = Array.from(link.attributes);
      attrs.forEach(attr => {
        if (attr.name !== 'href' && attr.name !== 'class') {
          link.removeAttribute(attr.name);
        }
      });
    } catch (e) {
      // Keep the original href
    }
  });
}

export async function fetchArticleContent(url: string): Promise<{
  title: string;
  content: string;
  excerpt: string;
  byline: string | null;
} | null> {
  try {
    const html = await tryFetchWithProxies(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const baseUrl = new URL(url);

    cleanupDocument(doc, baseUrl);

    const reader = new Readability(doc, {
      keepClasses: ['image', 'img', 'figure', 'video'],
      charThreshold: 0,
      classesToPreserve: ['image', 'img', 'figure', 'video']
    });

    const article = reader.parse();
    if (!article) {
      console.warn('Readability parsing failed, falling back to original HTML');
      // Return cleaned up original HTML as fallback
      return {
        title: doc.title,
        content: DOMPurify.sanitize(doc.body.innerHTML, {
          ADD_TAGS: ['img', 'figure', 'figcaption', 'video', 'source'],
          ADD_ATTR: ['src', 'alt', 'loading', 'decoding', 'style', 'controls', 'href', 'target'],
          FORBID_TAGS: ['script', 'style', 'iframe'],
          ALLOW_DATA_ATTR: false
        }),
        excerpt: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        byline: null
      };
    }

    // Sanitize the content
    const cleanContent = DOMPurify.sanitize(article.content, {
      ADD_TAGS: ['img', 'figure', 'figcaption', 'video', 'source'],
      ADD_ATTR: ['src', 'alt', 'loading', 'decoding', 'style', 'controls', 'href', 'target'],
      FORBID_TAGS: ['script', 'style', 'iframe'],
      ALLOW_DATA_ATTR: false
    });

    return {
      title: article.title,
      content: cleanContent,
      excerpt: article.excerpt,
      byline: article.byline
    };
  } catch (error) {
    console.error('Error fetching article content:', error);
    return null;
  }
}