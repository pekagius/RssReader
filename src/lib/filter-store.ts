import { FilterData, FeedFilter } from '@/types/feed';

const FILTER_KEY = 'rss-reader-filters';

const defaultData: FilterData = {
  filters: [],
};

export function loadFilterData(): FilterData {
  try {
    const data = localStorage.getItem(FILTER_KEY);
    return data ? JSON.parse(data) : defaultData;
  } catch {
    return defaultData;
  }
}

export function saveFilterData(data: FilterData) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(data));
}

export function getFeedFilters(feedId: string): string[] {
  const data = loadFilterData();
  const feedFilter = data.filters.find(f => f.feedId === feedId);
  return feedFilter?.hiddenElements || [];
}

export function addHiddenElement(feedId: string, selector: string) {
  const data = loadFilterData();
  const feedFilter = data.filters.find(f => f.feedId === feedId);
  
  if (feedFilter) {
    if (!feedFilter.hiddenElements.includes(selector)) {
      feedFilter.hiddenElements.push(selector);
    }
  } else {
    data.filters.push({
      feedId,
      hiddenElements: [selector],
    });
  }
  
  saveFilterData(data);
}

export function removeHiddenElement(feedId: string, selector: string) {
  const data = loadFilterData();
  const feedFilter = data.filters.find(f => f.feedId === feedId);
  
  if (feedFilter) {
    feedFilter.hiddenElements = feedFilter.hiddenElements.filter(
      s => s !== selector
    );
    saveFilterData(data);
  }
}