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

  // Get translated messages for a user
   getMessages(username: string, page: number = 1, pageSize: number = 20): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/received/${username}`,
      { params: { page: page.toString(), pageSize: pageSize.toString() } }
    );
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