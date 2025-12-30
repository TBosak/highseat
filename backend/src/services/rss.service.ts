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

// Create a worker instance for RSS parsing
let worker: Worker | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: RssFeed) => void;
  reject: (reason: Error) => void;
}>();

/**
 * Initialize the RSS worker
 */
function initWorker(): Worker {
  if (worker) return worker;

  worker = new Worker('./src/workers/rss.worker.ts');

  // Bun uses Web Worker API (onmessage, not .on('message'))
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const pending = pendingRequests.get(response.id);
    if (!pending) {
      console.warn(`[RSS Service] Received response for unknown request ID: ${response.id}`);
      return;
    }

    pendingRequests.delete(response.id);

    if (response.success && response.data) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || 'Unknown error'));
    }
  };

  worker.onerror = (error) => {
    console.error('[RSS Service] Worker error:', error);
    // Reject all pending requests
    for (const [id, pending] of pendingRequests.entries()) {
      pending.reject(new Error('Worker error'));
      pendingRequests.delete(id);
    }
  };

  console.log('[RSS Service] RSS worker initialized successfully');
  return worker;
}

/**
 * Fetch and parse an RSS feed using a worker thread
 * @param feedUrl - URL of the RSS feed
 * @param limit - Maximum number of items to return (default: 10)
 * @returns Parsed RSS feed data
 */
export async function fetchRssFeed(feedUrl: string, limit: number = 10): Promise<RssFeed> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timeoutId = setTimeout(() => {
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        reject(new Error('RSS fetch timeout'));
      }
    }, 15000); // 15 second timeout

    pendingRequests.set(id, {
      resolve: (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    });

    try {
      const w = initWorker();
      const message: WorkerMessage = { id, feedUrl, limit };
      w.postMessage(message);
      console.log(`[RSS Service] Sent fetch request to worker for ${feedUrl}`);
    } catch (error) {
      pendingRequests.delete(id);
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Validate RSS feed URL
 * @param url - URL to validate
 * @returns true if URL is valid
 */
export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
