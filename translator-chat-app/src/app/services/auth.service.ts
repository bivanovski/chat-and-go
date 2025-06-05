import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';

interface User {
  id?: number;
  username: string;
  languageCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private apiUrl = `${this.baseUrl}/users`;

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, {
      username,
      password
    }).pipe(
      tap(user => {
        sessionStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  register(username: string, password: string, languageCode: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, {
      username,
      password,
      languageCode
    });
  }

  getCurrentUser(): User | null {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  logout() {
    sessionStorage.removeItem('user');
  }
}