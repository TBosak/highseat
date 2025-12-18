import { Component, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export interface CustomThemeData {
  name: string;
  author: string;
  variant: 'dark' | 'light';
  system: 'base16' | 'base24';
  palette: Record<string, string>;
}

@Component({
  selector: 'app-custom-theme-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './custom-theme-wizard.component.html',
  styleUrl: './custom-theme-wizard.component.scss'
})
export class CustomThemeWizardComponent {
  @Output() saved = new EventEmitter<CustomThemeData>();
  @Output() cancelled = new EventEmitter<void>();

  faTimes = faTimes;

  // Form fields
  themeName = signal('');
  themeAuthor = signal('');
  variant = signal<'dark' | 'light'>('dark');
  system = signal<'base16' | 'base24'>('base16');

  // Base16 colors (base00-base0F)
  base00 = signal('#000000');
  base01 = signal('#111111');
  base02 = signal('#222222');
  base03 = signal('#333333');
  base04 = signal('#999999');
  base05 = signal('#aaaaaa');
  base06 = signal('#cccccc');
  base07 = signal('#ffffff');
  base08 = signal('#ff0000');
  base09 = signal('#ff7700');
  base0A = signal('#ffff00');
  base0B = signal('#00ff00');
  base0C = signal('#00ffff');
  base0D = signal('#0000ff');
  base0E = signal('#ff00ff');
  base0F = signal('#883300');

  // Base24 additional colors (base10-base17)
  base10 = signal('#220000');
  base11 = signal('#002200');
  base12 = signal('#ff5500');
  base13 = signal('#ffdd00');
  base14 = signal('#aadd00');
  base15 = signal('#00dddd');
  base16 = signal('#0055ff');
  base17 = signal('#ff55ff');

  // Current wizard step
  currentStep = signal(1);

  // Computed
  isBase24 = computed(() => this.system() === 'base24');
  canProceed = computed(() => {
    if (this.currentStep() === 1) {
      return this.themeName().trim().length > 0 && this.themeAuthor().trim().length > 0;
    }
    return true;
  });

  nextStep() {
    if (this.canProceed()) {
      this.currentStep.update(step => Math.min(step + 1, 3));
    }
  }

  prevStep() {
    this.currentStep.update(step => Math.max(step - 1, 1));
  }

  save() {
    const palette: Record<string, string> = {
      base00: this.base00(),
      base01: this.base01(),
      base02: this.base02(),
      base03: this.base03(),
      base04: this.base04(),
      base05: this.base05(),
      base06: this.base06(),
      base07: this.base07(),
      base08: this.base08(),
      base09: this.base09(),
      base0A: this.base0A(),
      base0B: this.base0B(),
      base0C: this.base0C(),
      base0D: this.base0D(),
      base0E: this.base0E(),
      base0F: this.base0F()
    };

    if (this.isBase24()) {
      palette['base10'] = this.base10();
      palette['base11'] = this.base11();
      palette['base12'] = this.base12();
      palette['base13'] = this.base13();
      palette['base14'] = this.base14();
      palette['base15'] = this.base15();
      palette['base16'] = this.base16();
      palette['base17'] = this.base17();
    }

    this.saved.emit({
      name: this.themeName(),
      author: this.themeAuthor(),
      variant: this.variant(),
      system: this.system(),
      palette
    });
  }

  cancel() {
    this.cancelled.emit();
  }
}
