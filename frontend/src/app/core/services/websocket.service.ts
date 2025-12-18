import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, Observable, timer, EMPTY } from 'rxjs';
import { retryWhen, tap, delayWhen } from 'rxjs/operators';
import { SystemMetrics, ProcessInfo, NetworkStats } from '../models';

interface WebSocketMessage {
  type: 'system-metrics' | 'system-processes' | 'system-network' | 'error' | 'ping';
  data?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000; // 3 seconds

  // BehaviorSubjects cache the last value and emit it to new subscribers immediately
  private systemMetricsSubject = new BehaviorSubject<SystemMetrics | null>(null);
  private systemProcessesSubject = new BehaviorSubject<ProcessInfo[] | null>(null);
  private systemNetworkSubject = new BehaviorSubject<NetworkStats | null>(null);
  private connectionStateSubject = new BehaviorSubject<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  private errorSubject = new Subject<string>();

  // Public observables
  public systemMetrics$ = this.systemMetricsSubject.asObservable();
  public systemProcesses$ = this.systemProcessesSubject.asObservable();
  public systemNetwork$ = this.systemNetworkSubject.asObservable();
  public connectionState$ = this.connectionStateSubject.asObservable();
  public errors$ = this.errorSubject.asObservable();

  constructor() {
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.connectionStateSubject.next('connecting');

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.connectionStateSubject.next('connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.connectionStateSubject.next('error');
        this.errorSubject.next('WebSocket connection error');
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.connectionStateSubject.next('disconnected');
        this.ws = null;

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
          this.errorSubject.next('Failed to connect to WebSocket server');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.connectionStateSubject.next('error');
      this.errorSubject.next('Failed to establish WebSocket connection');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'system-metrics':
          if (message.data) {
            this.systemMetricsSubject.next(message.data);
          }
          break;

        case 'system-processes':
          if (message.data) {
            this.systemProcessesSubject.next(message.data);
          }
          break;

        case 'system-network':
          if (message.data) {
            this.systemNetworkSubject.next(message.data);
          }
          break;

        case 'error':
          if (message.error) {
            this.errorSubject.next(message.error);
          }
          break;

        case 'ping':
          // Heartbeat - no action needed
          break;

        default:
          console.warn('[WebSocket] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }

  /**
   * Send message to server
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }

  /**
   * Manually reconnect
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
