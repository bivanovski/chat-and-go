import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChatService, User } from '../../services/chat.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-createchatdialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './createchatdialog.component.html',
  styleUrls: ['./createchatdialog.component.scss']
})
export class CreateChatDialogComponent implements OnInit {
  users: User[] = [];
  selectedUsers: User[] = [];
  chatTitle = '';
  isGroup = false;
  loading = false;
  loadingUsers = false;

  constructor(
    private dialogRef: MatDialogRef<CreateChatDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentUser: any },
    private chatService: ChatService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.chatService.getAllUsers().subscribe({
      next: (users) => {
        // Filter out current user
        this.users = users.filter(user => user.username !== this.data.currentUser.username);
        this.loadingUsers = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loadingUsers = false;
        this.snackBar.open('Failed to load users', 'Dismiss', { duration: 3000 });
      }
    });
  }

  onUserSelectionChange(user: User, selected: boolean): void {
    if (selected) {
      this.selectedUsers.push(user);
    } else {
      this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    }

    // Update group chat flag based on selection
    // isGroup = true if more than 1 participant is selected
    this.isGroup = this.selectedUsers.length > 1;
    
    // If switching from group to private, clear the title
    if (!this.isGroup && this.chatTitle === 'Group Chat') {
      this.chatTitle = '';
    }
  }

  isUserSelected(user: User): boolean {
    return this.selectedUsers.some(u => u.id === user.id);
  }

  createChat(): void {
    if (this.selectedUsers.length === 0) {
      this.snackBar.open('Please select at least one participant', 'Dismiss', { duration: 3000 });
      return;
    }

    // Validate group chat requirements
    if (this.isGroup && this.selectedUsers.length < 2) {
      this.snackBar.open('Group chats require at least 2 participants', 'Dismiss', { duration: 3000 });
      return;
    }

    // Validate private chat requirements
    if (!this.isGroup && this.selectedUsers.length !== 1) {
      this.snackBar.open('Private chats must have exactly 1 participant', 'Dismiss', { duration: 3000 });
      return;
    }

    this.loading = true;

    // Set appropriate title based on chat type
    let title = this.chatTitle;
    if (!title) {
      title = this.isGroup ? 'Group Chat' : 'Private Chat';
    }

    const request = {
      title: title,
      isGroup: this.isGroup,
      participantUsernames: this.selectedUsers.map(u => u.username),
      currentUserUsername: this.data.currentUser.username
    };

    console.log('Creating chat with request:', request);

    this.chatService.createChat(request).subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open(response.message || 'Chat created successfully', 'Dismiss', { duration: 3000 });
        
        // Close dialog and navigate to the new chat
        this.dialogRef.close(true);
        this.router.navigate(['/chat', response.chatId]);
      },
      error: (error) => {
        console.error('Error creating chat:', error);
        this.loading = false;
        
        // Better error handling
        let errorMessage = 'Failed to create chat';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}