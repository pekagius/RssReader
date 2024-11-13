import { FeedData, FeedEntry, Category } from '@/types/feed';

const STORE_KEY = 'rss-reader-data';
const STORE_VERSION_KEY = 'rss-reader-version';

const defaultData: FeedData = {
  feeds: [],
  categories: [],
};

function migrateData(data: any): FeedData {
  // Migrate old feed format (single url) to new format (urls array)
  if (data.feeds) {
    data.feeds = data.feeds.map((feed: any) => {
      if (!Array.isArray(feed.urls) && feed.url) {
        return {
          ...feed,
          urls: [feed.url],
          url: undefined // Remove old url field
        };
      }
      return feed;
    });
  }
  
  return data;
}

export function loadData(): FeedData {
  try {
    const data = localStorage.getItem(STORE_KEY);
    if (!data) return defaultData;

    const parsedData = JSON.parse(data);
    const migratedData = migrateData(parsedData);
    
    // Save migrated data back to storage
    saveData(migratedData);
    
    return migratedData;
  } catch {
    return defaultData;
  }
}

export function saveData(data: FeedData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function addFeed(feed: Omit<FeedEntry, 'id' | 'createdAt'>) {
  const data = loadData();
  const newFeed: FeedEntry = {
    ...feed,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  data.feeds.push(newFeed);
  saveData(data);
  return newFeed;
}

export function addCategory(name: string) {
  const data = loadData();
  const newCategory: Category = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  data.categories.push(newCategory);
  saveData(data);
  return newCategory;
}