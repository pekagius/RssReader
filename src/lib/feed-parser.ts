import type { FeedItem, FeedCategory } from '@/types/feed';

export interface ParsedFeed {
  categories: FeedCategory[];
  items: Record<string, FeedItem[]>;
}

export class FeedParserError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'FeedParserError';
  }
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  try {
    const response = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    );
    
    if (!response.ok) {
      throw new FeedParserError(`Failed to fetch feed: ${response.statusText}`);
    }
    
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new FeedParserError('Empty response from feed URL');
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    // Check for parsing errors
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      throw new FeedParserError(
        'Invalid RSS feed format: ' + (parseError.textContent || 'Unknown error')
      );
    }
    
    // Try to detect feed type (RSS or Atom)
    const isAtom = Boolean(xml.querySelector('feed'));
    const items = Array.from(
      isAtom ? xml.querySelectorAll('entry') : xml.querySelectorAll('item')
    );
    
    if (items.length === 0) {
      throw new FeedParserError('No items found in the feed');
    }
    
    const categoriesSet = new Set<string>();
    const itemsByCategory: Record<string, FeedItem[]> = {};
    
    items.forEach(item => {
      try {
        const categories = Array.from(item.querySelectorAll('category'))
          .map(cat => cat.textContent?.trim())
          .filter((cat): cat is string => Boolean(cat));
        
        // If no categories, use "Uncategorized"
        const itemCategories = categories.length > 0 ? categories : ['Uncategorized'];
        
        const feedItem: FeedItem = {
          title: item.querySelector('title')?.textContent || 'Untitled',
          link: isAtom
            ? item.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
              item.querySelector('link')?.getAttribute('href') ||
              ''
            : item.querySelector('link')?.textContent || '',
          content: item.querySelector('content\\:encoded')?.textContent ||
                  item.querySelector('content')?.textContent ||
                  item.querySelector('description')?.textContent || '',
          contentSnippet: (
            item.querySelector('description')?.textContent ||
            item.querySelector('summary')?.textContent ||
            ''
          ).substring(0, 300),
          isoDate: item.querySelector('pubDate')?.textContent ||
                  item.querySelector('published')?.textContent ||
                  item.querySelector('updated')?.textContent
            ? new Date(
                item.querySelector('pubDate')?.textContent ||
                item.querySelector('published')?.textContent ||
                item.querySelector('updated')?.textContent || ''
              ).toISOString()
            : undefined,
          creator: item.querySelector('dc\\:creator')?.textContent ||
                  item.querySelector('author name')?.textContent ||
                  item.querySelector('author')?.textContent,
          categories: itemCategories,
        };

        // Add categories to set and organize items by category
        itemCategories.forEach(category => {
          categoriesSet.add(category);
          if (!itemsByCategory[category]) {
            itemsByCategory[category] = [];
          }
          itemsByCategory[category].push(feedItem);
        });
      } catch (error) {
        console.warn('Error parsing feed item:', error);
        // Continue with next item
      }
    });

    const feedCategories: FeedCategory[] = Array.from(categoriesSet).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      count: itemsByCategory[name].length
    }));

    return {
      categories: feedCategories,
      items: itemsByCategory
    };
  } catch (error) {
    if (error instanceof FeedParserError) {
      throw error;
    }
    throw new FeedParserError(
      'Failed to parse feed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      error instanceof Error ? error : undefined
    );
  }
}