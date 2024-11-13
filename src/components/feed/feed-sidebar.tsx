import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Settings2, EyeOff } from 'lucide-react';
import FeedFilterDialog from './feed-filter-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { getFeedFilters } from '@/lib/filter-store';
import type { FeedEntry } from '@/types/feed';

interface FeedSidebarProps {
  feed: FeedEntry;
}

export default function FeedSidebar({ feed }: FeedSidebarProps) {
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [hiddenElements, setHiddenElements] = useState<string[]>([]);

  useEffect(() => {
    setHiddenElements(getFeedFilters(feed.id));
    
    const handleFilterUpdate = () => {
      setHiddenElements(getFeedFilters(feed.id));
    };
    
    window.addEventListener('filter-updated', handleFilterUpdate);
    return () => window.removeEventListener('filter-updated', handleFilterUpdate);
  }, [feed.id]);

  return (
    <aside className="w-64 border-l">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <h3 className="font-medium text-sm mb-4">Feed Settings</h3>
          
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowFilterDialog(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Feed Filter
          </Button>

          {hiddenElements.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Hidden Elements
                </h4>
                <div className="space-y-1">
                  {hiddenElements.map((selector) => (
                    <div
                      key={selector}
                      className="text-xs bg-muted p-1.5 rounded-md font-mono"
                    >
                      {selector}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <FeedFilterDialog
        feed={feed}
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
      />
    </aside>
  );
}