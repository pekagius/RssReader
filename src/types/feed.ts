// ... existing imports

export interface FeedItem {
  title: string;
  link: string;
  content: string;
  contentSnippet?: string;
  isoDate?: string;
  creator?: string;
  categories?: string[];
  hasPaywall?: boolean;  // New field
}

// ... rest of the types

export interface PaywallPattern {
  id: string;
  name: string;
  pattern: string;
  type: 'selector' | 'text';
  createdAt: string;
}

export interface PaywallData {
  patterns: PaywallPattern[];
}