import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faEnvelope, faLock, faSpinner, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // FontAwesome Icons
  faUser = faUser;
  faEnvelope = faEnvelope;
  faLock = faLock;
  faSpinner = faSpinner;
  faRightToBracket = faRightToBracket;

  isLoginMode = signal(true);
  username = signal('');
  password = signal('');
  displayName = signal('');
  error = signal('');
  loading = signal(false);

  toggleMode(): void {
    this.isLoginMode.update(v => !v);
    this.error.set('');
  }

  onSubmit(): void {
    if (!this.username() || !this.password()) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const auth$ = this.isLoginMode()
      ? this.authService.login(this.username(), this.password())
      : this.authService.register(this.username(), this.password(), this.displayName());

    auth$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Authentication failed');
      }
    });
  }
}
