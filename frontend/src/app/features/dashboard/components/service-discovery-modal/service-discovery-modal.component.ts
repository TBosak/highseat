import { Component, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes, faSpinner, faNetworkWired, faPlus } from '@fortawesome/free-solid-svg-icons';
import { HttpClient } from '@angular/common/http';

export interface DiscoveredService {
  name: string;
  type: 'docker' | 'port' | 'process';
  containerName?: string;
  port?: number;
  iconId?: string;
  suggestedTitle: string;
  suggestedUrl?: string;
  selected: boolean;
}

@Component({
  selector: 'app-service-discovery-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './service-discovery-modal.component.html',
  styleUrls: ['./service-discovery-modal.component.scss']
})
export class ServiceDiscoveryModalComponent implements OnInit {
  private http = inject(HttpClient);

  @Output() servicesSelected = new EventEmitter<DiscoveredService[]>();
  @Output() cancelled = new EventEmitter<void>();

  // Icons
  faTimes = faTimes;
  faSpinner = faSpinner;
  faNetworkWired = faNetworkWired;
  faPlus = faPlus;

  // State
  loading = signal(true);
  discoveredServices = signal<DiscoveredService[]>([]);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.discoverServices();
  }

  discoverServices(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<DiscoveredService[]>('/api/services/discover').subscribe({
      next: (services) => {
        // Mark all as selected by default
        const servicesWithSelection = services.map(s => ({ ...s, selected: true }));
        this.discoveredServices.set(servicesWithSelection);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to discover services:', err);
        this.error.set('Failed to discover services. Please check the backend logs.');
        this.loading.set(false);
      }
    });
  }

  toggleService(service: DiscoveredService): void {
    const services = this.discoveredServices();
    const updated = services.map(s =>
      s === service ? { ...s, selected: !s.selected } : s
    );
    this.discoveredServices.set(updated);
  }

  toggleAll(): void {
    const services = this.discoveredServices();
    const allSelected = services.every(s => s.selected);
    const updated = services.map(s => ({ ...s, selected: !allSelected }));
    this.discoveredServices.set(updated);
  }

  getSelectedCount(): number {
    return this.discoveredServices().filter(s => s.selected).length;
  }

  handleSubmit(): void {
    const selected = this.discoveredServices().filter(s => s.selected);
    if (selected.length === 0) {
      alert('Please select at least one service');
      return;
    }
    this.servicesSelected.emit(selected);
  }

  handleCancel(): void {
    this.cancelled.emit();
  }

  retry(): void {
    this.discoverServices();
  }
}
