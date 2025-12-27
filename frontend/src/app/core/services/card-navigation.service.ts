import { Injectable, signal } from '@angular/core';

export interface CardNavigationTarget {
  cardId: string;
  boardSlug: string;
}

@Injectable({
  providedIn: 'root'
})
export class CardNavigationService {
  // Signal to communicate card navigation across components
  targetCard = signal<CardNavigationTarget | null>(null);

  navigateToCard(cardId: string, boardSlug: string): void {
    this.targetCard.set({ cardId, boardSlug });
  }

  clearTarget(): void {
    this.targetCard.set(null);
  }

  // Scroll to card and highlight it
  scrollToCard(cardId: string): void {
    // Wait for next tick to ensure DOM is updated
    setTimeout(() => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add temporary highlight effect
        cardElement.classList.add('card-highlight');
        setTimeout(() => {
          cardElement.classList.remove('card-highlight');
        }, 2000); // Remove highlight after 2 seconds
      }
    }, 100);
  }
}
