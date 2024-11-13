import { useState } from 'react';
import TopBar from '@/components/layout/top-bar';
import Sidebar from '@/components/layout/sidebar';
import FeedGrid from '@/components/feed/feed-grid';
import FeedSidebar from '@/components/feed/feed-sidebar';
import type { FeedEntry } from '@/types/feed';

function App() {
  const [selectedFeed, setSelectedFeed] = useState<FeedEntry | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar onFeedSelect={setSelectedFeed} />
        <main className="flex-1 p-6 overflow-auto">
          {selectedFeed ? (
            <FeedGrid urls={selectedFeed.urls} feedId={selectedFeed.id} />
          ) : (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
              <h2 className="text-3xl font-semibold tracking-tight mb-4">
                Welcome to RSS Reader
              </h2>
              <p className="text-muted-foreground text-lg">
                Select a feed from the sidebar or add a new one using the plus button in the top bar.
              </p>
            </div>
          )}
        </main>
        {selectedFeed && <FeedSidebar feed={selectedFeed} />}
      </div>
    </div>
  );
}

export default App;