import { Injectable } from '@angular/core';

export interface CssInjection {
  id: string;
  scope: 'global' | 'board';
  css: string;
  element: HTMLStyleElement;
}

@Injectable({
  providedIn: 'root'
})
export class CustomCssService {
  private injections = new Map<string, CssInjection>();

  /**
   * Inject global custom CSS
   */
  injectGlobalCss(css: string): void {
    const id = 'custom-css-global';
    this.injectCss(id, css, 'global');
  }

  /**
   * Inject board-specific custom CSS
   */
  injectBoardCss(boardId: string, css: string): void {
    const id = `custom-css-board-${boardId}`;
    this.injectCss(id, css, 'board', boardId);
  }

  /**
   * Remove global custom CSS
   */
  removeGlobalCss(): void {
    this.removeCss('custom-css-global');
  }

  /**
   * Remove board-specific custom CSS
   */
  removeBoardCss(boardId: string): void {
    this.removeCss(`custom-css-board-${boardId}`);
  }

  /**
   * Remove all custom CSS
   */
  removeAllCss(): void {
    this.injections.forEach((_, id) => this.removeCss(id));
  }

  /**
   * Generic CSS injection method
   */
  private injectCss(
    id: string,
    css: string,
    scope: 'global' | 'board',
    boardId?: string
  ): void {
    // Remove existing injection if present
    this.removeCss(id);

    // Skip if CSS is empty
    if (!css || !css.trim()) {
      return;
    }

    // Create style element
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-custom-css-id', id);
    styleElement.setAttribute('data-scope', scope);

    if (boardId) {
      styleElement.setAttribute('data-board-id', boardId);

      // Wrap board-specific CSS to scope it to the board
      // This ensures board CSS only affects that specific board
      styleElement.textContent = `
        /* Board-specific custom CSS: ${boardId} */
        [data-board-id="${boardId}"] {
          ${css}
        }
      `;
    } else {
      // Global CSS
      styleElement.textContent = `
        /* Global custom CSS */
        ${css}
      `;
    }

    // Append to head
    document.head.appendChild(styleElement);

    // Store injection reference
    this.injections.set(id, {
      id,
      scope,
      css,
      element: styleElement
    });

    console.log(`[CustomCSS] Injected ${scope} CSS:`, id);
  }

  /**
   * Remove CSS injection
   */
  private removeCss(id: string): void {
    const injection = this.injections.get(id);

    if (injection) {
      injection.element.remove();
      this.injections.delete(id);
      console.log(`[CustomCSS] Removed CSS:`, id);
    }
  }

  /**
   * Get all active injections
   */
  getInjections(): CssInjection[] {
    return Array.from(this.injections.values());
  }

  /**
   * Check if CSS is currently injected
   */
  hasInjection(id: string): boolean {
    return this.injections.has(id);
  }
}
