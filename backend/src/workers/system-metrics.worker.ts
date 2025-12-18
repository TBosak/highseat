import { systemInfoService } from '../services/system-info.service';

export interface WorkerRequest {
  type: 'collect-all' | 'collect-metrics' | 'collect-processes' | 'collect-network';
  payload?: {
    sortBy?: 'cpu' | 'mem';
    limit?: number;
  };
}

export interface WorkerResponse {
  type: 'metrics' | 'processes' | 'network' | 'all' | 'error';
  data?: any;
  error?: string;
}

/**
 * System metrics worker - handles intensive system info collection
 * off the main thread to prevent blocking
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case 'collect-all': {
        console.log('[Worker] Collecting all metrics...');

        // Collect sequentially to reduce load
        const metrics = await systemInfoService.getSystemMetrics();
        const processes = await systemInfoService.getProcessInfo(
          request.payload?.sortBy || 'cpu',
          request.payload?.limit || 10
        );
        const network = await systemInfoService.getNetworkStats();

        self.postMessage({
          type: 'all',
          data: { metrics, processes, network }
        } as WorkerResponse);
        break;
      }

      case 'collect-metrics': {
        const metrics = await systemInfoService.getSystemMetrics();
        self.postMessage({
          type: 'metrics',
          data: metrics
        } as WorkerResponse);
        break;
      }

      case 'collect-processes': {
        const processes = await systemInfoService.getProcessInfo(
          request.payload?.sortBy || 'cpu',
          request.payload?.limit || 10
        );
        self.postMessage({
          type: 'processes',
          data: processes
        } as WorkerResponse);
        break;
      }

      case 'collect-network': {
        const network = await systemInfoService.getNetworkStats();
        self.postMessage({
          type: 'network',
          data: network
        } as WorkerResponse);
        break;
      }

      default:
        throw new Error(`Unknown request type: ${(request as any).type}`);
    }
  } catch (error) {
    console.error('[Worker] Error collecting metrics:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as WorkerResponse);
  }
};

console.log('[Worker] System metrics worker initialized');
