import { useEffect, useState } from 'react';
import { Rss } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { loadData } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { FeedData, FeedEntry } from '@/types/feed';

interface SidebarProps {
  onFeedSelect: (feed: FeedEntry) => void;
}

export default function Sidebar({ onFeedSelect }: SidebarProps) {
  const [data, setData] = useState<FeedData>({ categories: [], feeds: [] });
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  useEffect(() => {
    setData(loadData());
    
    const handleStorage = () => {
      setData(loadData());
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleFeedClick = (feed: FeedEntry) => {
    setSelectedFeedId(feed.id);
    onFeedSelect(feed);
  };

  return (
    <aside className="w-64 border-r h-full">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setSelectedFeedId(null);
                onFeedSelect(null);
              }}
            >
              <Rss className="mr-2 h-4 w-4" />
              All Feeds
            </Button>
          </div>

          {data.categories.map((category) => (
            <div key={category.id} className="space-y-1">
              <h3 className="font-medium text-sm px-4 py-1 text-muted-foreground">
                {category.name}
              </h3>
              {data.feeds
                .filter((feed) => feed.category === category.id)
                .map((feed) => (
                  <Button
                    key={feed.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start pl-8 hover:bg-accent hover:text-accent-foreground",
                      selectedFeedId === feed.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleFeedClick(feed)}
                  >
                    <Rss className="mr-2 h-4 w-4" />
                    {feed.title}
                  </Button>
                ))}
            </div>
          ))}

          {data.feeds.some(feed => !feed.category) && (
            <div className="space-y-1">
              <h3 className="font-medium text-sm px-4 py-1 text-muted-foreground">
                Uncategorized
              </h3>
              {data.feeds
                .filter((feed) => !feed.category)
                .map((feed) => (
                  <Button
                    key={feed.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start pl-8 hover:bg-accent hover:text-accent-foreground",
                      selectedFeedId === feed.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleFeedClick(feed)}
                  >
                    <Rss className="mr-2 h-4 w-4" />
                    {feed.title}
                  </Button>
                ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}