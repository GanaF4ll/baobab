import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginFormComponent } from './login-form/login-form.component';

@Component({
  selector: 'app-login',
  imports: [FormField, LoginFormComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // UI state
  protected readonly activeTab = signal<'login' | 'register'>('login');
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  // Register Form Model
  protected readonly registerModel = signal({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
  });

  // Register Form Configuration
  protected readonly registerForm = form(this.registerModel, (s) => {
    required(s.email, { message: 'Email is required' });
    email(s.email, { message: 'Invalid email address' });
    required(s.firstName, { message: 'First name is required' });
    required(s.lastName, { message: 'Last name is required' });
    required(s.password, { message: 'Password is required' });
    minLength(s.password, 6, { message: 'Password must be at least 6 characters' });
  });

  setTab(tab: 'login' | 'register') {
    this.activeTab.set(tab);
    this.error.set(null);
  }

  onLogin(credentials: { email: string; password: string }) {
    this.loading.set(true);
    this.error.set(null);

    this.authService.login(credentials.email, credentials.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Login failed. Please verify your credentials.');
      },
    });
  }

  onRegister() {
    submit(this.registerForm, async () => {
      this.loading.set(true);
      this.error.set(null);

      this.authService.register(this.registerModel()).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Registration failed. Please try again.');
        },
      });
    });
  }
}
