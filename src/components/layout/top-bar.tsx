import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Rss, Plus, Moon, Sun, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddFeedDialog from '@/components/feed/add-feed-dialog';
import SettingsDialog from '@/components/settings/settings-dialog';

export default function TopBar() {
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Rss className="h-6 w-6 text-primary" />
        <span className="text-xl font-semibold tracking-tight">RSS Reader</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 hover:bg-accent hover:text-accent-foreground"
          onClick={() => setShowAddFeed(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 hover:bg-accent hover:text-accent-foreground"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 hover:bg-accent hover:text-accent-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>

      <AddFeedDialog open={showAddFeed} onOpenChange={setShowAddFeed} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </header>
  );
}