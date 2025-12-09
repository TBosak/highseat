import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import type { Permission } from '../../core/models';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private destroy$ = new Subject<void>();

  @Input() hasPermission: Permission | Permission[] = [];

  ngOnInit(): void {
    this.authService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const permissions = Array.isArray(this.hasPermission)
      ? this.hasPermission
      : [this.hasPermission];

    if (this.authService.hasPermissions(permissions)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
