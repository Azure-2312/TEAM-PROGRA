import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Analyze } from './pages/analyze/analyze';
import { History } from './pages/history/history';
import { ResultDetail } from './pages/result-detail/result-detail';
import { Reports } from './pages/reports/reports';
import { Profile } from './pages/profile/profile';
import { RecoverPassword } from './pages/recover-password/recover-password';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'recover-password', component: RecoverPassword },
  { path: 'dashboard', component: Dashboard },
  { path: 'analyze', component: Analyze },
  { path: 'history', component: History },
  { path: 'profile', component: Profile },
  { path: 'reports', component: Reports },
  { path: 'result-detail', component: ResultDetail },
];