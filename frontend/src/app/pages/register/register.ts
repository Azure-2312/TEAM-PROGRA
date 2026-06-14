import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register implements OnInit {
  nombreCompleto: string = '';
  correo: string = '';
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  aceptarTerminos: boolean = false;
  errorMsg: string = '';
  successMsg: string = '';
  showTermsModal: boolean = false;
  loading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (userStr) {
      this.router.navigate(['/dashboard']);
    }
  }

  openTerms(event: Event): void {
    event.preventDefault();
    this.showTermsModal = true;
    this.cdr.detectChanges();
  }

  closeTerms(): void {
    this.showTermsModal = false;
    this.cdr.detectChanges();
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.nombreCompleto || !this.nombreCompleto.trim()) {
      this.errorMsg = 'El campo "Nombre completo" es obligatorio.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.correo || !this.correo.trim()) {
      this.errorMsg = 'El campo "Correo electrónico" es obligatorio.';
      this.cdr.detectChanges();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.correo.trim())) {
      this.errorMsg = 'El formato del correo electrónico no es válido (ejemplo: usuario@dominio.com).';
      this.cdr.detectChanges();
      return;
    }

    if (!this.username || !this.username.trim()) {
      this.errorMsg = 'El campo "Nombre de usuario" es obligatorio.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.password) {
      this.errorMsg = 'El campo "Contraseña" es obligatorio.';
      this.cdr.detectChanges();
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.confirmPassword) {
      this.errorMsg = 'Por favor, confirme su contraseña.';
      this.cdr.detectChanges();
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.aceptarTerminos) {
      this.errorMsg = 'Debe aceptar los Términos y condiciones para poder registrarse.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const payload = {
      nombre_completo: this.nombreCompleto.trim(),
      correo: this.correo.trim(),
      username: this.username.trim(),
      password: this.password
    };

    this.api.register(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMsg = '¡Usuario registrado correctamente! Redirigiendo al login...';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err: any) => {
        this.loading = false;
        let mensaje = 'Error al registrar usuario.';
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