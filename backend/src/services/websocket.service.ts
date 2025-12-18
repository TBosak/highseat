import { ServerWebSocket } from 'bun';
import { Worker } from 'worker_threads';
import type { WorkerRequest, WorkerResponse } from '../workers/system-metrics.worker';

export interface WebSocketMessage {
  type: 'system-metrics' | 'system-processes' | 'system-network' | 'error' | 'ping';
  data?: any;
  error?: string;
}

type WebSocketData = {
  createdAt: Date;
};

class WebSocketService {
  private broadcastInterval: NodeJS.Timeout | null = null;
  private clients: Set<ServerWebSocket<WebSocketData>> = new Set();
  private readonly BROADCAST_INTERVAL_MS = 5000; // 5 seconds - reduced load
  private worker: Worker | null = null;
  private workerReady = false;

  constructor() {
    this.initializeWorker();
  }

  /**
   * Initialize system metrics worker
   */
  private initializeWorker(): void {
    try {
      console.log('[WebSocket] Initializing system metrics worker...');

      this.worker = new Worker('./src/workers/system-metrics.worker.ts');

      this.worker.on('message', (response: WorkerResponse) => {
        this.handleWorkerResponse(response);
      });

      this.worker.on('error', (error) => {
        console.error('[WebSocket] Worker error:', error);
        this.workerReady = false;
      });

      this.worker.on('exit', (code) => {
        console.log('[WebSocket] Worker exited with code:', code);
        this.workerReady = false;

        // Restart worker if it crashes
        if (code !== 0) {
          console.log('[WebSocket] Restarting worker...');
          setTimeout(() => this.initializeWorker(), 1000);
        }
      });

      this.workerReady = true;
      console.log('[WebSocket] System metrics worker initialized successfully');
    } catch (error) {
      console.error('[WebSocket] Failed to initialize worker:', error);
      this.workerReady = false;
    }
  }

  /**
   * Handle response from worker
   */
  private handleWorkerResponse(response: WorkerResponse): void {
    if (response.type === 'error') {
      console.error('[WebSocket] Worker error:', response.error);
      this.broadcast({
        type: 'error',
        error: response.error || 'Failed to collect system metrics'
      });
      return;
    }

    if (response.type === 'all' && response.data) {
      const { metrics, processes, network } = response.data;
      this.broadcast({ type: 'system-metrics', data: metrics });
      this.broadcast({ type: 'system-processes', data: processes });
      this.broadcast({ type: 'system-network', data: network });
      console.log('[WebSocket] Broadcast complete');
    } else if (response.type === 'metrics') {
      this.broadcast({ type: 'system-metrics', data: response.data });
    } else if (response.type === 'processes') {
      this.broadcast({ type: 'system-processes', data: response.data });
    } else if (response.type === 'network') {
      this.broadcast({ type: 'system-network', data: response.data });
    }
  }

  /**
   * Request metrics from worker
   */
  private requestMetricsFromWorker(): void {
    if (!this.worker || !this.workerReady) {
      console.warn('[WebSocket] Worker not ready, skipping metrics collection');
      return;
    }

    this.worker.postMessage({
      type: 'collect-all',
      payload: { sortBy: 'cpu', limit: 10 }
    } as WorkerRequest);
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: ServerWebSocket<WebSocketData>): void {
    console.log('[WebSocket] Client connected');
    this.clients.add(ws);

    // Send initial data immediately
    this.sendInitialData(ws);

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      try {
        ws.send(JSON.stringify({ type: 'ping' }));
      } catch (error) {
        clearInterval(pingInterval);
      }
    }, 30000);

    // Store ping interval in data for cleanup
    (ws as any).pingInterval = pingInterval;
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnection(ws: ServerWebSocket<WebSocketData>): void {
    console.log('[WebSocket] Client disconnected');
    this.clients.delete(ws);

    // Clean up ping interval
    const pingInterval = (ws as any).pingInterval;
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(ws: ServerWebSocket<WebSocketData>, message: string): void {
    try {
      const data = JSON.parse(message);
      // Currently no client messages expected
      console.log('[WebSocket] Received message:', data);
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }

  /**
   * Send initial data to newly connected client
   */
  private sendInitialData(ws: ServerWebSocket<WebSocketData>): void {
    if (!this.worker || !this.workerReady) {
      console.warn('[WebSocket] Worker not ready, cannot send initial data');
      this.sendToClient(ws, {
        type: 'error',
        error: 'System metrics service is initializing...'
      });
      return;
    }

    console.log('[WebSocket] Requesting initial data from worker...');

    // Worker will broadcast to all clients, including this new one
    this.requestMetricsFromWorker();
  }

  /**
   * Start broadcasting system metrics
   */
  startBroadcasting(): void {
    if (this.broadcastInterval) {
      console.warn('[WebSocket] Broadcasting already started');
      return;
    }

    console.log(`[WebSocket] Starting metrics broadcast (every ${this.BROADCAST_INTERVAL_MS}ms)`);

    this.broadcastInterval = setInterval(() => {
      if (this.clients.size === 0) {
        return; // No clients, skip collection
      }

      console.log('[WebSocket] Requesting metrics from worker for', this.clients.size, 'client(s)');
      this.requestMetricsFromWorker();
    }, this.BROADCAST_INTERVAL_MS);
  }

  /**
   * Stop broadcasting
   */
  stopBroadcasting(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
      console.log('[WebSocket] Broadcasting stopped');
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    const deadClients: ServerWebSocket<WebSocketData>[] = [];

    this.clients.forEach(ws => {
      try {
        ws.send(data);
      } catch (error) {
        deadClients.push(ws);
      }
    });

    // Clean up dead connections
    deadClients.forEach(ws => this.clients.delete(ws));
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: ServerWebSocket<WebSocketData>, message: WebSocketMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WebSocket] Error sending to client:', error);
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    console.log('[WebSocket] Shutting down...');
    this.stopBroadcasting();

    // Terminate worker
    if (this.worker) {
      console.log('[WebSocket] Terminating worker...');
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
    }

    this.clients.forEach(ws => {
      try {
        ws.close(1000, 'Server shutting down');
      } catch (error) {
        console.error('[WebSocket] Error closing client connection:', error);
      }
    });
    this.clients.clear();
    console.log('[WebSocket] All clients disconnected');
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
