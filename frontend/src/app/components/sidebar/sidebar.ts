import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  constructor(private router: Router) {}

  onLogout(event: Event) {
    event.preventDefault();
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    this.router.navigate(['/home']);
  }
}
