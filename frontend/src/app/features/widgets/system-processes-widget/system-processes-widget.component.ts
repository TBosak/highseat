import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SystemProcessesWidgetConfig, ProcessInfo } from '../../../core/models';

@Component({
  selector: 'app-system-processes-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-processes-widget.component.html',
  styleUrls: ['./system-processes-widget.component.scss']
})
export class SystemProcessesWidgetComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private subscription?: Subscription;

  @Input() config: SystemProcessesWidgetConfig = {
    sortBy: 'cpu',
    processCount: 10
  };

  processes = signal<ProcessInfo[]>([]);
  connectionState = signal<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  ngOnInit(): void {
    // Subscribe to connection state
    this.wsService.connectionState$.subscribe(state => {
      this.connectionState.set(state);
    });

    // Subscribe to process info
    this.subscription = this.wsService.systemProcesses$.subscribe(processes => {
      if (processes) {
        // Limit to configured process count
        const limitedProcesses = processes.slice(0, this.config.processCount || 10);
        this.processes.set(limitedProcesses);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Reconnect to WebSocket
   */
  reconnect(): void {
    this.wsService.reconnect();
  }

  /**
   * Truncate command if too long
   */
  truncateCommand(command: string, maxLength: number = 40): string {
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength) + '...';
  }
}
