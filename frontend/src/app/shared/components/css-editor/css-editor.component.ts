import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCode, faEye, faEyeSlash, faUndo, faSave, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-css-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './css-editor.component.html',
  styleUrls: ['./css-editor.component.scss']
})
export class CssEditorComponent {
  @Input() css: string = '';
  @Input() placeholder: string = '/* Enter your custom CSS here */';
  @Input() label: string = 'Custom CSS';
  @Input() helpText?: string;
  @Input() examples?: string[];

  @Output() cssChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<string>();
  @Output() reset = new EventEmitter<void>();

  faCode = faCode;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faUndo = faUndo;
  faSave = faSave;
  faInfoCircle = faInfoCircle;

  previewEnabled = signal(false);
  showExamples = signal(false);
  localCss = signal('');

  ngOnInit(): void {
    this.localCss.set(this.css);
  }

  ngOnChanges(): void {
    this.localCss.set(this.css);
  }

  onCssChange(value: string): void {
    this.localCss.set(value);
    this.cssChange.emit(value);
  }

  togglePreview(): void {
    this.previewEnabled.update(v => !v);
  }

  toggleExamples(): void {
    this.showExamples.update(v => !v);
  }

  onSave(): void {
    this.save.emit(this.localCss());
  }

  onReset(): void {
    this.reset.emit();
  }

  insertExample(example: string): void {
    const current = this.localCss();
    const newCss = current ? `${current}\n\n${example}` : example;
    this.localCss.set(newCss);
    this.cssChange.emit(newCss);
  }

  getLineCount(): number {
    return (this.localCss().match(/\n/g) || []).length + 1;
  }
}
