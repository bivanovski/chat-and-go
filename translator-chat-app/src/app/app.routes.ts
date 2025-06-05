import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { ChatComponent } from './pages/chat/chat.component';
import { RegisterComponent } from './pages/register/register.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent},
     { path: 'chat', component: ChatComponent, canActivate: [authGuard] }
  ];
  
