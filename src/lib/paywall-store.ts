import { PaywallData, PaywallPattern } from '@/types/feed';

const PAYWALL_KEY = 'rss-reader-paywall';

const defaultPatterns: PaywallPattern[] = [
  {
    id: 'default-subscription',
    name: 'Subscription Required',
    pattern: '.subscription-required, .paywall, [data-paywall], #paywall',
    type: 'selector',
    createdAt: new Date().toISOString()
  },
  {
    id: 'default-premium',
    name: 'Premium Content',
    pattern: '.premium-content, .premium, [data-premium], #premium',
    type: 'selector',
    createdAt: new Date().toISOString()
  },
  {
    id: 'default-subscribe',
    name: 'Subscribe Text',
    pattern: 'Subscribe now|Subscription required|Premium article|Members only',
    type: 'text',
    createdAt: new Date().toISOString()
  }
];

const defaultData: PaywallData = {
  patterns: defaultPatterns
};

export function loadPaywallData(): PaywallData {
  try {
    const data = localStorage.getItem(PAYWALL_KEY);
    return data ? JSON.parse(data) : defaultData;
  } catch {
    return defaultData;
  }
}

export function savePaywallData(data: PaywallData) {
  localStorage.setItem(PAYWALL_KEY, JSON.stringify(data));
}

export function addPaywallPattern(pattern: Omit<PaywallPattern, 'id' | 'createdAt'>) {
  const data = loadPaywallData();
  const newPattern: PaywallPattern = {
    ...pattern,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  data.patterns.push(newPattern);
  savePaywallData(data);
  return newPattern;
}

export function removePaywallPattern(id: string) {
  const data = loadPaywallData();
  data.patterns = data.patterns.filter(p => p.id !== id);
  savePaywallData(data);
}

export function detectPaywall(content: string): boolean {
  const patterns = loadPaywallData().patterns;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  
  return patterns.some(pattern => {
    if (pattern.type === 'selector') {
      try {
        return doc.querySelector(pattern.pattern) !== null;
      } catch {
        return false;
      }
    } else {
      const regex = new RegExp(pattern.pattern, 'i');
      return regex.test(doc.body.textContent || '');
    }
  });
}