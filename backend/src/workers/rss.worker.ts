import Parser from 'rss-parser';

interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
  guid?: string;
}

interface RssFeed {
  title: string;
  description?: string;
  link?: string;
  items: RssItem[];
  lastBuildDate?: string;
}

interface WorkerMessage {
  id: string;
  feedUrl: string;
  limit: number;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: RssFeed;
  error?: string;
}

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'Highseat Dashboard RSS Reader/1.0'
  }
});

// Listen for messages from the main thread (Bun uses Web Worker API)
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, feedUrl, limit } = event.data;

  try {
    console.log(`[RSS Worker] Fetching feed: ${feedUrl}`);

    const feed = await parser.parseURL(feedUrl);

    const items: RssItem[] = (feed.items || [])
      .slice(0, limit)
      .map((item, index) => {
        if (!item.title) {
          console.warn(`[RSS Worker] Item ${index} has no title. Available fields:`, Object.keys(item));
        }
        return {
          title: item.title || item['title:encoded'] || item.summary || 'Untitled',
          link: item.link || '',
          description: item.contentSnippet || item.content || item.description || item['content:encoded'],
          pubDate: item.pubDate || item.isoDate || item.published,
          author: item.creator || item.author || item['dc:creator'],
          guid: item.guid || item.id || item.link
        };
      });

    const rssFeed: RssFeed = {
      title: feed.title || 'RSS Feed',
      description: feed.description,
      link: feed.link,
      items,
      lastBuildDate: feed.lastBuildDate
    };

    console.log(`[RSS Worker] Successfully fetched ${items.length} items from ${feedUrl}`);

    const response: WorkerResponse = {
      id,
      success: true,
      data: rssFeed
    };

    self.postMessage(response);
  } catch (error) {
    console.error(`[RSS Worker] Error fetching feed ${feedUrl}:`, error);

    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    self.postMessage(response);
  }
};

export type { WorkerMessage, WorkerResponse };
