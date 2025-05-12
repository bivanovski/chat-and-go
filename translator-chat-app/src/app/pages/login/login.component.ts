import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule, MatSnackBarConfig } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  hidePassword: boolean = true;
  isLoading: boolean = false;

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {}

  onLogin() {
    if (!this.username.trim() || !this.password) {
      this.showErrorMessage('Username and password are required');
      return;
    }

    this.isLoading = true;
    this.authService.login(this.username, this.password).subscribe({
      next: (user) => {
        sessionStorage.setItem('user', JSON.stringify(user));
        this.showSuccessMessage('Login successful! Redirecting to chat...');
        setTimeout(() => {
          this.router.navigate(['/chat']);
          this.isLoading = false;
        }, 1000); // Short delay for better UX
      },
      error: (err) => {
        // Handle different types of errors
        let errorMessage = 'Login failed';
        
        if (err instanceof ProgressEvent || err.status === 0) {
          // Network error (connection issue) or server offline
          errorMessage = 'The server appears to be offline. Please try again later.';
        } else if (err.status === 401) {
          // Authentication failure
          errorMessage = 'Invalid username or password. Please try again.';
        } else if (err.status === 404) {
          // Server not found
          errorMessage = 'Server not available. Please try again later.';
        } else if (err.error && typeof err.error === 'string') {
          // Server returned error message
          errorMessage = `Login failed: ${err.error}`;
        } else if (err.message) {
          // Other error with message - but clean it up first
          const cleanMessage = err.message.replace(/Http failure response for.*:\s/, '');
          errorMessage = `Login failed: ${cleanMessage}`;
        }
        
        this.showErrorMessage(errorMessage);
        console.error('Login error details:', err);
        this.isLoading = false;
      }
    });
  }

  private showErrorMessage(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 6000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar', 'animated-snackbar'],
      data: { icon: 'error' }
    };
    
    const snackBarRef = this.snackBar.open(message, 'Dismiss', config);
    
    // Add animated entrance
    const containerElement = snackBarRef.containerInstance['_elementRef'].nativeElement;
    containerElement.style.transform = 'translateY(0)'; 
  }
  
  private showSuccessMessage(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['success-snackbar', 'animated-snackbar'],
      data: { icon: 'check_circle' }
    };
    
    const snackBarRef = this.snackBar.open(message, 'OK', config);
    
    // Add animated entrance
    const containerElement = snackBarRef.containerInstance['_elementRef'].nativeElement;
    containerElement.style.transform = 'translateY(0)';
  }
}