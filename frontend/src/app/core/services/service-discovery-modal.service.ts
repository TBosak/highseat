import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ServiceDiscoveryModalService {
  showModal = signal(false);

  open(): void {
    this.showModal.set(true);
  }

  close(): void {
    this.showModal.set(false);
  }
}
