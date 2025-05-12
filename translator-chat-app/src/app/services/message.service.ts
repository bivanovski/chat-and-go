import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'https://localhost:7160/messages';

  constructor(private http: HttpClient) {}

  // Get translated messages for a user
  getMessages(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/received/${username}`);
  }

  // Send a new text message
  sendMessage(payload: { senderUsername: string, originalText: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send`, payload);
  }

  // Send an audio message (WAV file)
  sendAudio(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-audio`, formData);
  }
  
}
