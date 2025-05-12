import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


interface User {
  id?: number;
  username: string;
  languageCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7160/users';


  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, {
      username,
      password
      });
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

  logout() {
    sessionStorage.removeItem('user');
  }
}
