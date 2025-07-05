import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ChatService, User, Chat } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateChatDialogComponent } from '../../dialogs/createchatdialog/createchatdialog.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  currentUser: any;
  chats: Chat[] = [];
  loading = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadChats();
  }

  loadChats(): void {
    this.loading = true;
    this.chatService.getChatsForUser(this.currentUser.username).subscribe({
      next: (chats) => {
        this.chats = chats;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading chats:', error);
        this.loading = false;
        this.snackBar.open('Failed to load chats', 'Dismiss', { duration: 3000 });
      }
    });
  }

  openCreateChatDialog(): void {
    const dialogRef = this.dialog.open(CreateChatDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      autoFocus: false,
      data: { currentUser: this.currentUser }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadChats(); // Refresh chat list
      }
    });
  }

  openChat(chatId: string): void {
    // Navigate to chat page with chatId parameter
    this.router.navigate(['/chat', chatId]);
  }

  logout(): void {
    this.authService.logout();
    this.snackBar.open('Successfully logged out!', 'Dismiss', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'center'
    });
    this.router.navigate(['/login']);
  }
}