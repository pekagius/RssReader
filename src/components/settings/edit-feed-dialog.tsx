import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';
import { loadData, saveData } from '@/lib/store';
import type { FeedEntry, Category } from '@/types/feed';

interface EditFeedDialogProps {
  feed: FeedEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function EditFeedDialog({
  feed,
  open,
  onOpenChange,
  onComplete,
}: EditFeedDialogProps) {
  const [title, setTitle] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [category, setCategory] = useState('uncategorized');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (feed) {
      setTitle(feed.title);
      setUrls(feed.urls);
      setCategory(feed.category || 'uncategorized');
    }
    setCategories(loadData().categories);
  }, [feed]);

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feed) return;

    // Filter out empty URLs
    const validUrls = urls.filter(url => url.trim() !== '');

    if (validUrls.length > 0) {
      const data = loadData();
      const updatedFeed: FeedEntry = {
        ...feed,
        title,
        urls: validUrls,
        category: category === 'uncategorized' ? undefined : category,
      };

      const updatedFeeds = data.feeds.map(f =>
        f.id === feed.id ? updatedFeed : f
      );

      saveData({
        ...data,
        feeds: updatedFeeds,
      });

      onComplete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Feed</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Feed Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>RSS URLs</Label>
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  className="bg-background flex-1"
                  placeholder="https://example.com/feed.xml"
                  required
                />
                <div className="flex gap-1">
                  {index === urls.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addUrlField}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {urls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeUrlField(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}