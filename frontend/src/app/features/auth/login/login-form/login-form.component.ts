import { Component, input, output, signal } from '@angular/core';
import { email, FormField, form, required, submit } from '@angular/forms/signals';

@Component({
  selector: 'app-login-form',
  imports: [FormField],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css',
})
export class LoginFormComponent {
  loading = input<boolean>(false);
  error = input<string | null>(null);
  loginSubmit = output<{ email: string; password: string }>();

  protected readonly model = signal({
    email: '',
    password: '',
  });

  protected readonly loginForm = form(this.model, (s) => {
    required(s.email, { message: 'Email is required' });
    email(s.email, { message: 'Invalid email address' });
    required(s.password, { message: 'Password is required' });
  });

  onSubmit() {
    submit(this.loginForm, async () => {
      this.loginSubmit.emit({
        email: this.model().email,
        password: this.model().password,
      });
    });
  }
}
