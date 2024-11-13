import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { fetchArticleContent } from '@/lib/content-fetcher';
import type { FeedItem } from '@/types/feed';
import { format } from 'date-fns';

interface FeedContentDialogProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenElements: string[];
}

function createImageHtml(src: string) {
  return `<img src="${src}" class="w-full h-auto rounded-lg mb-6" loading="lazy" decoding="async" />`;
}

export default function FeedContentDialog({
  item,
  open,
  onOpenChange,
  hiddenElements,
}: FeedContentDialogProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const cardImageRef = useRef<string | null>(null);

  useEffect(() => {
    if (item?.content) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(item.content, 'text/html');
      const img = doc.querySelector('img');
      cardImageRef.current = img?.src || null;
    }
  }, [item]);

  useEffect(() => {
    let mounted = true;

    async function loadContent() {
      if (!item?.link) return;
      
      try {
        setLoading(true);
        setError(null);
        
        if (cardImageRef.current) {
          let initialContent = item.content;
          
          if (hiddenElements.length > 0) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(initialContent, 'text/html');
            hiddenElements.forEach(selector => {
              try {
                doc.querySelectorAll(selector).forEach(el => el.remove());
              } catch (e) {
                // Ignore invalid selectors
              }
            });
            initialContent = doc.body.innerHTML;
          }
          
          const contentWithImage = `${createImageHtml(cardImageRef.current)}${initialContent}`;
          setContent(contentWithImage);
        } else {
          setContent(item.content);
        }
        
        const article = await fetchArticleContent(item.link);
        
        if (!mounted) return;

        if (article) {
          let filteredContent = article.content;
          
          if (hiddenElements.length > 0) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(filteredContent, 'text/html');
            hiddenElements.forEach(selector => {
              try {
                doc.querySelectorAll(selector).forEach(el => el.remove());
              } catch (e) {
                // Ignore invalid selectors
              }
            });
            filteredContent = doc.body.innerHTML;
          }

          const hasProminentImage = (() => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(filteredContent, 'text/html');
            const img = doc.querySelector('img');
            return img && img.width > 300;
          })();

          if (!hasProminentImage && cardImageRef.current) {
            filteredContent = `${createImageHtml(cardImageRef.current)}${filteredContent}`;
          }
          
          setContent(filteredContent);
        }
      } catch (err) {
        console.error('Error loading full content:', err);
        if (mounted) {
          setError('Failed to load the full article content');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (open && item) {
      loadContent();
    }

    return () => {
      mounted = false;
    };
  }, [open, item, retryCount, hiddenElements]);

  const handleRetry = () => {
    setRetryCount(count => count + 1);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pr-12">
          <div className="flex flex-col space-y-2">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl">{item.title}</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => window.open(item.link, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Original
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {item.isoDate && (
                <span>{format(new Date(item.isoDate), 'PPP')}</span>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="relative flex-1 mt-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading content...</span>
              </div>
            </div>
          )}

          {error ? (
            <div className="p-4 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <article className="prose dark:prose-invert max-w-none p-4">
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </article>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}