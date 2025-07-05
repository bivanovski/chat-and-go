import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export interface User {
  id: string;
  username: string;
  languageCode: string;
}

export interface Chat {
  id: string;
  title: string;
  isGroup: boolean;
  createdAt: string;
}

export interface CreateChatRequest {
  title: string;
  isGroup: boolean;
  participantUsernames: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = environment.apiUrl;
  private apiUrl = `${this.baseUrl}/chats`;

  constructor(private http: HttpClient) {}

  // Get all users
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  // Get chats for a specific user
  getChatsForUser(username: string): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}/user/${username}`);
  }

  // Create a new chat
  createChat(request: CreateChatRequest): Observable<{ message: string; chatId: string }> {
    return this.http.post<{ message: string; chatId: string }>(this.apiUrl, request);
  }

  // Add user to chat
  addUserToChat(chatId: string, username: string): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/add-user`, { chatId, username });
  }

  // Get chat participants
  getChatParticipants(chatId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${chatId}/participants`);
  }
}