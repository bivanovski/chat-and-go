import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { LanguageDropdownComponent } from '../../shared/language-dropdown/language-dropdown.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LanguageDropdownComponent
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  languageCode: string = 'en';
  hidePassword: boolean = true;
  isLoading: boolean = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  onRegister() {
    if (!this.validateForm()) return;
    
    this.isLoading = true;
    this.authService.register(this.username, this.password, this.languageCode).subscribe({
      next: (res) => {
        this.showSuccessMessage('Registration successful! Please log in.');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        // Handle different types of errors
        let errorMessage = 'Registration failed';
        
        if (err instanceof ProgressEvent || err.status === 0) {
          // Network error (connection issue) or server offline
          errorMessage = 'The server appears to be offline. Please try again later.';
        } else if (err.status === 400) {
          // Bad request - usually validation errors
          errorMessage = err.error || 'Invalid registration data. Please check your information.';
        } else if (err.status === 409) {
          // Conflict - usually username already exists
          errorMessage = 'This username is already taken. Please choose another.';
        } else if (err.error && typeof err.error === 'string') {
          // Server returned error message
          errorMessage = `Registration failed: ${err.error}`;
        } else if (err.message) {
          // Other error with message - but clean it up first
          const cleanMessage = err.message.replace(/Http failure response for.*:\s/, '');
          errorMessage = `Registration failed: ${cleanMessage}`;
        }
        
        this.showErrorMessage(errorMessage);
        console.error('Registration error details:', err);
        this.isLoading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.username.trim()) {
      this.showErrorMessage('Username is required');
      return false;
    }
    
    if (!this.password) {
      this.showErrorMessage('Password is required');
      return false;
    }
    
    if (this.password.length < 6) {
      this.showErrorMessage('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }
  
}