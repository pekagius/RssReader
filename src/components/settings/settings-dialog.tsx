import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { loadData, saveData } from '@/lib/store';
import type { FeedData, FeedEntry } from '@/types/feed';
import { format } from 'date-fns';
import EditFeedDialog from './edit-feed-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaywallSettings from './paywall-settings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [data, setData] = useState<FeedData>({ categories: [], feeds: [] });
  const [editingFeed, setEditingFeed] = useState<FeedEntry | null>(null);

  useEffect(() => {
    if (open) {
      setData(loadData());
    }
  }, [open]);

  const handleDelete = (feedId: string) => {
    const newData = {
      ...data,
      feeds: data.feeds.filter(feed => feed.id !== feedId)
    };
    saveData(newData);
    setData(newData);
    window.dispatchEvent(new Event('storage'));
  };

  const handleEdit = (feed: FeedEntry) => {
    setEditingFeed(feed);
  };

  const handleEditComplete = () => {
    setEditingFeed(null);
    setData(loadData());
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="feeds" className="mt-4">
            <TabsList>
              <TabsTrigger value="feeds">Feed Management</TabsTrigger>
              <TabsTrigger value="paywall">Paywall Detection</TabsTrigger>
            </TabsList>
            
            <TabsContent value="feeds">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>URLs</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.feeds.map((feed) => (
                    <TableRow key={feed.id}>
                      <TableCell className="font-medium">{feed.title}</TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="space-y-1">
                          {feed.urls.map((url, index) => (
                            <div key={index} className="truncate max-w-[200px]">
                              {url}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {feed.category
                          ? data.categories.find(c => c.id === feed.category)?.name
                          : 'Uncategorized'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(feed.createdAt), 'PP')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(feed)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(feed.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="paywall">
              <PaywallSettings />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EditFeedDialog
        feed={editingFeed}
        open={!!editingFeed}
        onOpenChange={(open) => !open && setEditingFeed(null)}
        onComplete={handleEditComplete}
      />
    </>
  );
}