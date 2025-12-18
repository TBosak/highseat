import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SystemMetricsWidgetConfig, SystemMetrics } from '../../../core/models';

@Component({
  selector: 'app-system-metrics-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-metrics-widget.component.html',
  styleUrls: ['./system-metrics-widget.component.scss']
})
export class SystemMetricsWidgetComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private subscription?: Subscription;

  @Input() config: SystemMetricsWidgetConfig = {
    showCPU: true,
    showMemory: true,
    showDisk: true,
    warningThreshold: 70,
    criticalThreshold: 90
  };

  metrics = signal<SystemMetrics | null>(null);
  connectionState = signal<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  ngOnInit(): void {
    // Subscribe to connection state
    this.wsService.connectionState$.subscribe(state => {
      this.connectionState.set(state);
    });

    // Subscribe to system metrics
    this.subscription = this.wsService.systemMetrics$.subscribe(metrics => {
      if (metrics) {
        this.metrics.set(metrics);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Get status color based on percentage and thresholds
   */
  getStatusColor(percentage: number): string {
    if (percentage >= (this.config.criticalThreshold || 90)) {
      return 'critical';
    } else if (percentage >= (this.config.warningThreshold || 70)) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Reconnect to WebSocket
   */
  reconnect(): void {
    this.wsService.reconnect();
  }
}
