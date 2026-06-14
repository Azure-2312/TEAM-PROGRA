import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  usuarioCorreo: string = '';
  password: string = '';
  errorMsg: string = '';
  loading: boolean = false;
  showPassword: boolean = false;
  recordarme: boolean = false;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (userStr) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.errorMsg = '';

    if (!this.usuarioCorreo || !this.usuarioCorreo.trim()) {
      this.errorMsg = 'El campo "Usuario o correo" es obligatorio.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.password) {
      this.errorMsg = 'El campo "Contraseña" es obligatorio.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.api.login({ usuario_correo: this.usuarioCorreo.trim(), password: this.password }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const userJson = JSON.stringify(res.usuario);
        if (this.recordarme) {
          localStorage.setItem('usuario', userJson);
          sessionStorage.removeItem('usuario');
        } else {
          sessionStorage.setItem('usuario', userJson);
          localStorage.removeItem('usuario');
        }
        this.cdr.detectChanges();
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading = false;
        let mensaje = 'Error al iniciar sesión. Verifique sus credenciales.';
        if (err && err.error) {
          if (typeof err.error === 'object' && err.error.error) {
            mensaje = err.error.error;
          } else if (typeof err.error === 'string') {
            mensaje = err.error;
          }
        }
        this.errorMsg = mensaje;
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }
}