import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { addFeed, addCategory, loadData } from '@/lib/store';
import type { Category } from '@/types/feed';

interface AddFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddFeedDialog({ open, onOpenChange }: AddFeedDialogProps) {
  const [title, setTitle] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [category, setCategory] = useState('uncategorized');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setCategories(loadData().categories);
  }, [open]);

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
    
    let categoryId = category;
    if (showNewCategory && newCategory) {
      const newCat = addCategory(newCategory);
      categoryId = newCat.id;
    }

    // Filter out empty URLs
    const validUrls = urls.filter(url => url.trim() !== '');

    if (validUrls.length > 0) {
      addFeed({
        title,
        urls: validUrls,
        category: categoryId === 'uncategorized' ? undefined : categoryId,
      });

      window.dispatchEvent(new Event('storage'));

      setTitle('');
      setUrls(['']);
      setCategory('uncategorized');
      setNewCategory('');
      setShowNewCategory(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New RSS Feed</DialogTitle>
          <DialogDescription>
            Add a new RSS feed to your reader. You can add multiple URLs for the same source.
          </DialogDescription>
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
            {!showNewCategory ? (
              <>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCategory(true)}
                  className="w-full mt-2"
                >
                  Add New Category
                </Button>
              </>
            ) : (
              <>
                <Label htmlFor="newCategory">New Category</Label>
                <Input
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCategory(false)}
                  className="w-full mt-2"
                >
                  Select Existing Category
                </Button>
              </>
            )}
          </div>
          <Button type="submit" className="w-full">
            Add Feed
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}