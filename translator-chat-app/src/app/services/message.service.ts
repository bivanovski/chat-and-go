import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private baseUrl = environment.apiUrl;
  private apiUrl = `${this.baseUrl}/messages`;

  constructor(private http: HttpClient) {}

  // Get translated messages for a user (legacy method - kept for backwards compatibility)
  getMessages(username: string, page: number = 1, pageSize: number = 20): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/received/${username}`,
      { params: { page: page.toString(), pageSize: pageSize.toString() } }
    );
  }

  // Get messages for a specific chat (NEW - for chat functionality)
  getMessagesInChat(chatId: string, username: string, skip: number = 0, take: number = 50): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/chat/${chatId}`,
      { 
        params: { 
          username: username,
          skip: skip.toString(), 
          take: take.toString() 
        } 
      }
    );
  }

  // Send a new text message (UPDATED - now includes chatId)
  sendMessage(payload: { senderUsername: string, content: string, chatId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send`, payload);
  }

  // Send a new text message (legacy method - kept for backwards compatibility)
  sendLegacyMessage(payload: { senderUsername: string, originalText: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send`, payload);
  }

  // Send an audio message (WAV file) - UPDATED to include chatId
  sendAudio(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-audio`, formData);
  }

  // Mark messages as read in a chat
  markMessagesAsRead(chatId: string, username: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/chat/${chatId}/read`, { username });
  }

  // Get unread message count for a user
  getUnreadCount(username: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread/${username}`);
  }

  // Get unread message count for a specific chat
  getUnreadCountForChat(chatId: string, username: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/chat/${chatId}/unread/${username}`);
  }

  // Delete a message
  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${messageId}`);
  }

  // Edit a message
  editMessage(messageId: string, newContent: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${messageId}`, { content: newContent });
  }

  // Search messages in a chat
  searchMessages(chatId: string, query: string, username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/chat/${chatId}/search`, {
      params: { query, username }
    });
  }
}