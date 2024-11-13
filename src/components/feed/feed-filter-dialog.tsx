import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Plus, DollarSign } from 'lucide-react';
import { fetchArticleContent } from '@/lib/content-fetcher';
import { parseFeed } from '@/lib/feed-parser';
import { getFeedFilters, addHiddenElement, removeHiddenElement } from '@/lib/filter-store';
import { detectPaywall } from '@/lib/paywall-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { FeedEntry, FeedItem } from '@/types/feed';

interface FeedFilterDialogProps {
  feed: FeedEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ElementInfo {
  selector: string;
  count: number;
  hidden: boolean;
}

function extractElements(html: string): Set<string> {
  const selectors = new Set<string>();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Process elements with IDs
  doc.querySelectorAll('[id]').forEach(el => {
    selectors.add(`#${el.id}`);
  });

  // Process elements with classes
  doc.querySelectorAll('[class]').forEach(el => {
    el.classList.forEach(className => {
      selectors.add(`.${className}`);
    });
  });

  return selectors;
}

export default function FeedFilterDialog({
  feed,
  open,
  onOpenChange,
}: FeedFilterDialogProps) {
  const [loading, setLoading] = useState(false);
  const [elements, setElements] = useState<ElementInfo[]>([]);
  const [manualSelector, setManualSelector] = useState('');
  const [manualType, setManualType] = useState<'tag' | 'class' | 'id' | 'attr'>('tag');
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [paywallItems, setPaywallItems] = useState<FeedItem[]>([]);
  const [activeTab, setActiveTab] = useState<'elements' | 'paywall'>('elements');
  const statusTimeoutRef = useRef<number>();

  const addStatusMessage = (message: string) => {
    setStatusMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 5 messages to prevent overflow
      return newMessages.slice(-5);
    });
  };

  useEffect(() => {
    async function analyzeContent() {
      if (!open) return;

      try {
        setLoading(true);
        setStatusMessages([]); // Clear previous messages
        const hiddenElements = getFeedFilters(feed.id);
        const elementCounts = new Map<string, number>();
        const errors: string[] = [];
        const paywallArticles: FeedItem[] = [];
        
        // Parse feed to get items
        addStatusMessage('Parsing RSS feeds...');
        
        const items: FeedItem[] = [];
        for (const url of feed.urls) {
          try {
            const feedData = await parseFeed(url);
            items.push(...Object.values(feedData.items).flat());
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to parse feed ${url}: ${message}`);
          }
        }

        if (items.length === 0) {
          throw new Error(errors.length > 0 
            ? errors.join('\n')
            : 'No items found in any of the feeds'
          );
        }

        // Take only the first 10 items for analysis
        const itemsToAnalyze = items.slice(0, 10);
        addStatusMessage(`Found ${itemsToAnalyze.length} articles to analyze`);
        
        // Fetch full content for each item
        for (const [index, item] of itemsToAnalyze.entries()) {
          if (!item.link) continue;
          
          try {
            addStatusMessage(`Analyzing article ${index + 1} of ${itemsToAnalyze.length}...`);
            const article = await fetchArticleContent(item.link);
            if (!article) {
              throw new Error('Failed to fetch article content');
            }
            
            // Check for paywall
            if (detectPaywall(article.content)) {
              paywallArticles.push(item);
            }
            
            const selectors = extractElements(article.content);
            selectors.forEach(selector => {
              elementCounts.set(
                selector,
                (elementCounts.get(selector) || 0) + 1
              );
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            addStatusMessage(`Warning: Failed to analyze article ${index + 1}: ${message}`);
          }
        }
        
        if (elementCounts.size === 0) {
          throw new Error('No elements found to analyze');
        }
        
        addStatusMessage('Processing results...');
        
        // Convert to array and sort by frequency
        const elementInfo: ElementInfo[] = Array.from(elementCounts.entries())
          .map(([selector, count]) => ({
            selector,
            count,
            hidden: hiddenElements.includes(selector),
          }))
          .sort((a, b) => b.count - a.count);
        
        setElements(elementInfo);
        setPaywallItems(paywallArticles);
        addStatusMessage('Analysis complete!');
      } catch (error) {
        console.error('Error analyzing content:', error);
        addStatusMessage(`Error: ${error instanceof Error ? error.message : 'Failed to analyze content'}`);
        setElements([]);
      } finally {
        setLoading(false);
        // Clear messages after 10 seconds
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
        statusTimeoutRef.current = window.setTimeout(() => {
          setStatusMessages([]);
        }, 10000);
      }
    }

    analyzeContent();

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [open, feed.id, feed.urls]);

  const toggleElement = (selector: string, hidden: boolean) => {
    if (hidden) {
      addHiddenElement(feed.id, selector);
    } else {
      removeHiddenElement(feed.id, selector);
    }
    
    setElements(elements.map(el =>
      el.selector === selector ? { ...el, hidden } : el
    ));
    
    // Trigger a re-render of the feed grid
    window.dispatchEvent(new Event('filter-updated'));
  };

  const handleAddManualSelector = () => {
    if (!manualSelector) return;

    let selector = manualSelector;
    switch (manualType) {
      case 'class':
        selector = `.${manualSelector.replace(/^\./, '')}`;
        break;
      case 'id':
        selector = `#${manualSelector.replace(/^#/, '')}`;
        break;
      case 'attr':
        selector = `[${manualSelector}]`;
        break;
      case 'tag':
        selector = manualSelector.toLowerCase();
        break;
    }

    addHiddenElement(feed.id, selector);
    setElements([
      ...elements,
      { selector, count: 0, hidden: true }
    ]);
    setManualSelector('');
    window.dispatchEvent(new Event('filter-updated'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Feed Filter - {feed.title}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'elements' | 'paywall')} className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="elements">Element Filters</TabsTrigger>
            <TabsTrigger value="paywall">
              Paywall Detection
              {paywallItems.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {paywallItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="elements" className="flex-1 flex gap-4 mt-0">
            {/* Manual Entry Sidebar */}
            <div className="w-72 border-r pr-4">
              <div className="space-y-4">
                <h3 className="font-medium">Add Custom Filter</h3>
                
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['tag', 'class', 'id', 'attr'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={manualType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setManualType(type)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    {manualType === 'tag' && 'HTML Tag'}
                    {manualType === 'class' && 'CSS Class'}
                    {manualType === 'id' && 'CSS ID'}
                    {manualType === 'attr' && 'HTML Attribute'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={manualSelector}
                      onChange={(e) => setManualSelector(e.target.value)}
                      placeholder={
                        manualType === 'tag' ? 'div' :
                        manualType === 'class' ? 'my-class' :
                        manualType === 'id' ? 'my-id' :
                        'role="module"'
                      }
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={handleAddManualSelector}
                      disabled={!manualSelector}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-[calc(85vh-10rem)]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-lg font-medium">Analyzing content...</span>
                    </div>
                    <div className="space-y-2">
                      {statusMessages.map((message, index) => (
                        <p
                          key={index}
                          className="text-sm text-muted-foreground animate-fade-in"
                        >
                          {message}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {elements.map(({ selector, count, hidden }) => (
                      <div
                        key={selector}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card"
                      >
                        <div>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">
                            {selector}
                          </code>
                          <span className="ml-2 text-sm text-muted-foreground">
                            Found in {count} articles
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleElement(selector, !hidden)}
                        >
                          {hidden ? (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Show
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Hide
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="paywall" className="flex-1 mt-0">
            <ScrollArea className="h-[calc(85vh-10rem)]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-lg font-medium">Analyzing content...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-medium">
                      {paywallItems.length} articles with paywall detected
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {paywallItems.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <h3 className="font-medium mb-2">{item.title}</h3>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {item.link}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}