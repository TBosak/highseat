import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SystemNetworkWidgetConfig, NetworkStats } from '../../../core/models';

@Component({
  selector: 'app-system-network-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-network-widget.component.html',
  styleUrls: ['./system-network-widget.component.scss']
})
export class SystemNetworkWidgetComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private subscription?: Subscription;

  @Input() config: SystemNetworkWidgetConfig = {
    interface: 'all',
    units: 'MB/s'
  };

  networkStats = signal<NetworkStats | null>(null);
  connectionState = signal<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  ngOnInit(): void {
    // Subscribe to connection state
    this.wsService.connectionState$.subscribe(state => {
      this.connectionState.set(state);
    });

    // Subscribe to network stats
    this.subscription = this.wsService.systemNetwork$.subscribe(stats => {
      this.networkStats.set(stats);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Format bytes per second based on configured units
   */
  formatSpeed(bytesPerSecond: number): string {
    const units = this.config.units || 'MB/s';

    switch (units) {
      case 'B/s':
        return `${bytesPerSecond.toFixed(0)} B/s`;
      case 'KB/s':
        return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
      case 'MB/s':
      default:
        return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
    }
  }

  /**
   * Reconnect to WebSocket
   */
  reconnect(): void {
    this.wsService.reconnect();
  }

  /**
   * Get filtered interfaces based on config
   */
  getFilteredInterfaces() {
    const stats = this.networkStats();
    if (!stats) return [];

    if (this.config.interface && this.config.interface !== 'all') {
      return stats.interfaces.filter(iface => iface.name === this.config.interface);
    }

    return stats.interfaces;
  }
}
