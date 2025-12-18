import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, signal, ViewChild, ElementRef, Renderer2, Inject, AfterViewInit, effect } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faList, faListOl } from '@fortawesome/free-solid-svg-icons';
import { Editor } from '@tiptap/core';
import { TiptapEditorDirective } from 'ngx-tiptap';
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Placeholder from '@tiptap/extension-placeholder';
import { NoteWidgetConfig } from '../../../core/models';

@Component({
  selector: 'app-note-widget',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TiptapEditorDirective],
  templateUrl: './note-widget.component.html',
  styleUrls: ['./note-widget.component.scss']
})
export class NoteWidgetComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() config: NoteWidgetConfig = { content: '' };
  @Input() editable: boolean = true;
  @Output() contentChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<NoteWidgetConfig>();
  @Output() saveStateChange = new EventEmitter<'idle' | 'editing' | 'saving' | 'saved'>();

  @ViewChild('floatingToolbar', { read: ElementRef }) toolbarRef?: ElementRef;

  // FontAwesome icons
  faList = faList;
  faListOl = faListOl;

  editor: Editor | null = null;
  isFocused = signal(false);
  saveState = signal<'idle' | 'editing' | 'saving' | 'saved'>('idle');
  private autoSaveTimeout: any;
  private saveStateTimeout: any;
  private toolbarMoved = false;

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Watch for toolbar visibility changes and move it to body
    effect(() => {
      const focused = this.isFocused();
      if (focused && this.editable) {
        // Toolbar should be visible, move it to body after a short delay
        setTimeout(() => this.moveToolbarToBody(), 100);
      } else {
        // Toolbar hidden, reset flag so it can be moved again next time
        this.toolbarMoved = false;
      }
    });
  }

  ngOnInit(): void {
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update editor editable state when input changes
    if (changes['editable'] && this.editor) {
      this.editor.setEditable(this.editable);
      console.log('Editor editable state changed to:', this.editable);

      // Reset save state when editable changes (e.g., toggling design mode)
      // This prevents the save indicator from appearing when just changing edit mode
      this.saveState.set('idle');
      this.saveStateChange.emit('idle');
      this.isFocused.set(false);
    }
  }

  ngAfterViewInit(): void {
    // Initial move if toolbar is already visible
    if (this.editable && this.isFocused()) {
      setTimeout(() => this.moveToolbarToBody(), 100);
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    if (this.saveStateTimeout) {
      clearTimeout(this.saveStateTimeout);
    }
    // Remove toolbar from body if it was moved there
    if (this.toolbarRef && this.toolbarMoved) {
      const toolbar = this.toolbarRef.nativeElement;
      if (toolbar.parentNode === this.document.body) {
        this.renderer.removeChild(this.document.body, toolbar);
      }
    }
  }

  private moveToolbarToBody(): void {
    if (this.toolbarRef && !this.toolbarMoved) {
      const toolbar = this.toolbarRef.nativeElement;
      if (toolbar && toolbar.parentNode !== this.document.body) {
        // Move toolbar to document body to escape all stacking contexts
        this.renderer.appendChild(this.document.body, toolbar);
        this.toolbarMoved = true;
        console.log('[Note Widget] Toolbar moved to document.body');
      }
    }
  }

  initEditor(): void {
    console.log('Initializing editor with editable:', this.editable);
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3]
          },
          bulletList: false,
          orderedList: false,
          listItem: false
        }),
        BulletList.configure({
          HTMLAttributes: {
            class: 'bullet-list'
          }
        }),
        OrderedList.configure({
          HTMLAttributes: {
            class: 'ordered-list'
          }
        }),
        ListItem.configure({
          HTMLAttributes: {
            class: 'list-item'
          }
        }),
        Placeholder.configure({
          placeholder: 'Start writing your notes...'
        })
      ],
      content: this.config.content || '',
      editable: this.editable,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        this.contentChange.emit(html);
        this.saveState.set('editing');
        this.saveStateChange.emit('editing');
        this.scheduleAutoSave(html);
      },
      onFocus: () => {
        this.isFocused.set(true);
      },
      onBlur: () => {
        this.isFocused.set(false);

        // If there are pending changes, save immediately on blur
        if (this.autoSaveTimeout) {
          clearTimeout(this.autoSaveTimeout);
          this.saveNote();
        } else if (this.saveState() === 'editing') {
          // Reset to idle if somehow in editing state with no pending changes
          this.saveState.set('idle');
          this.saveStateChange.emit('idle');
        }
      }
    });
    console.log('Editor initialized, isEditable:', this.editor.isEditable);
  }

  scheduleAutoSave(content: string): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Auto-save after 50ms of inactivity
    this.autoSaveTimeout = setTimeout(() => {
      this.saveNote(content);
    }, 50);
  }

  saveNote(content?: string): void {
    this.saveState.set('saving');
    this.saveStateChange.emit('saving');
    const noteContent = content || this.editor?.getHTML() || '';
    const updatedConfig: NoteWidgetConfig = {
      content: noteContent,
      lastModified: new Date()
    };
    this.save.emit(updatedConfig);

    // Show "Saved" for 2 seconds after save completes
    // Note: In a real implementation, you'd set this after the HTTP request completes
    setTimeout(() => {
      this.saveState.set('saved');
      this.saveStateChange.emit('saved');

      // Clear the saved state after 2 seconds
      if (this.saveStateTimeout) {
        clearTimeout(this.saveStateTimeout);
      }
      this.saveStateTimeout = setTimeout(() => {
        this.saveState.set('idle');
        this.saveStateChange.emit('idle');
      }, 2000);
    }, 500); // Simulate save delay
  }

  // Formatting methods
  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleStrike(): void {
    this.editor?.chain().focus().toggleStrike().run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  setHeading(level: 1 | 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  setParagraph(): void {
    this.editor?.chain().focus().setParagraph().run();
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  isActive(feature: string, options?: any): boolean {
    return this.editor?.isActive(feature, options) || false;
  }

  canUndo(): boolean {
    return this.editor?.can().undo() || false;
  }

  canRedo(): boolean {
    return this.editor?.can().redo() || false;
  }
}
