import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private baseUrl = environment.apiUrl;
  private apiUrl = `${this.baseUrl}/users/languages/azure`;

  constructor(private http: HttpClient) {}

  getLanguages(): Observable<{ code: string; name: string; isSpeechSupported: boolean }[]> {
    return this.http.get<{ code: string; name: string; isSpeechSupported: boolean }[]>(this.apiUrl);
  }

  updateUserLanguage(username: string, languageCode: string) {
    return this.http.put(`${this.baseUrl}/users/update-lang`, { username, languageCode });
  }
}