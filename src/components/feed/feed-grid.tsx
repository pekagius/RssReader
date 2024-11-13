import { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseFeed, ParsedFeed } from '@/lib/feed-parser';
import type { FeedItem } from '@/types/feed';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, DollarSign } from 'lucide-react';
import FeedContentDialog from './feed-content-dialog';
import { getFeedFilters } from '@/lib/filter-store';
import { detectPaywall } from '@/lib/paywall-store';
import { Badge } from '@/components/ui/badge';

interface FeedGridProps {
  urls: string[];
  feedId: string;
}

function filterContent(content: string, hiddenElements: string[]): string {
  if (hiddenElements.length === 0) return content;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  
  hiddenElements.forEach(selector => {
    try {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  return doc.body.innerHTML;
}

export default function FeedGrid({ urls, feedId }: FeedGridProps) {
  const [feedData, setFeedData] = useState<ParsedFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [hiddenElements, setHiddenElements] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setHiddenElements(getFeedFilters(feedId));
  }, [feedId]);

  useEffect(() => {
    const handleFilterUpdate = () => {
      setHiddenElements(getFeedFilters(feedId));
    };
    
    window.addEventListener('filter-updated', handleFilterUpdate);
    return () => window.removeEventListener('filter-updated', handleFilterUpdate);
  }, [feedId]);

  useEffect(() => {
    async function fetchFeeds() {
      try {
        setLoading(true);
        setError(null);

        // Create a Set to track unique items by URL
        const uniqueItems = new Map<string, FeedItem>();
        const errors: string[] = [];
        
        // Fetch and parse all feeds
        for (const url of urls) {
          try {
            const data = await parseFeed(url);
            
            // Process all items from all categories
            Object.values(data.items).flat().forEach(item => {
              if (!uniqueItems.has(item.link)) {
                // Check for paywall
                const hasPaywall = detectPaywall(item.content);
                
                // Apply filters
                const filteredContent = filterContent(item.content, hiddenElements);
                const filteredSnippet = filterContent(item.contentSnippet || '', hiddenElements);
                
                uniqueItems.set(item.link, {
                  ...item,
                  content: filteredContent,
                  contentSnippet: filteredSnippet,
                  hasPaywall
                });
              }
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to fetch feed ${url}: ${message}`);
          }
        }

        if (uniqueItems.size === 0) {
          if (errors.length > 0) {
            setError(errors.join('\n'));
          } else {
            setError('No items found in any of the feeds');
          }
          return;
        }

        // If we have some successful feeds but also some errors, show a warning
        if (errors.length > 0) {
          console.warn('Some feeds failed to load:', errors);
        }

        // Convert unique items back to array and sort by date
        const items = Array.from(uniqueItems.values()).sort((a, b) => {
          return new Date(b.isoDate || 0).getTime() - new Date(a.isoDate || 0).getTime();
        });

        // Group items by category
        const categories = new Map<string, FeedItem[]>();
        
        // Add "All" category first
        categories.set('all', items);
        
        // Then add individual categories
        items.forEach(item => {
          (item.categories || ['Uncategorized']).forEach(category => {
            if (!categories.has(category)) {
              categories.set(category, []);
            }
            categories.get(category)!.push(item);
          });
        });

        // Create feed data structure
        const feedData: ParsedFeed = {
          categories: Array.from(categories.entries()).map(([name, items]) => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            count: items.length
          })),
          items: Object.fromEntries(categories)
        };

        setFeedData(feedData);
        setAllItems(items);
        setTotalItems(items.length);
        
        // Set "all" as default category
        setActiveCategory('all');
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load feeds');
        setFeedData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchFeeds();
  }, [urls, hiddenElements]);

  const handleItemClick = (item: FeedItem) => {
    setSelectedItem(item);
    setShowContentDialog(true);
  };

  const breakpointColumns = {
    default: 3,
    1100: 2,
    700: 1
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[400px]" />
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-background"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="mb-4">
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </Masonry>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!feedData) return null;

  return (
    <div className="space-y-4">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="h-auto flex-wrap">
          {feedData.categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {category.name} ({category.count})
            </TabsTrigger>
          ))}
        </TabsList>
        {feedData.categories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-background"
            >
              {feedData.items[category.name].map((item, index) => (
                <Card key={index} className="mb-4">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg">
                        <button
                          onClick={() => handleItemClick(item)}
                          className="text-left hover:underline w-full"
                        >
                          {item.title}
                        </button>
                      </CardTitle>
                      {item.hasPaywall && (
                        <Badge variant="secondary" className="shrink-0">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Paywall
                        </Badge>
                      )}
                    </div>
                    {item.isoDate && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.isoDate), 'PPP')}
                      </p>
                    )}
                    {item.creator && (
                      <p className="text-sm text-muted-foreground">
                        By {item.creator}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: item.contentSnippet || item.content }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Masonry>
          </TabsContent>
        ))}
      </Tabs>

      <FeedContentDialog
        item={selectedItem}
        open={showContentDialog}
        onOpenChange={setShowContentDialog}
        hiddenElements={hiddenElements}
      />
    </div>
  );
}