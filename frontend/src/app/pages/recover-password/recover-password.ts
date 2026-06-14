import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recover-password.html',
  styleUrl: './recover-password.scss'
})
export class RecoverPassword {
  step: number = 1; // 1: Validar correo, 2: Verificar código, 3: Restablecer contraseña, 4: Éxito
  correo: string = '';
  codigo: string = '';
  passwordNueva: string = '';
  confirmarPasswordNueva: string = '';
  
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  loading: boolean = false;
  errorMsg: string = '';
  successMsg: string = '';

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  validarCorreo(event: Event) {
    event.preventDefault();
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.correo || !this.correo.trim()) {
      this.errorMsg = 'Por favor, ingrese su correo electrónico.';
      this.cdr.detectChanges();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.correo.trim())) {
      this.errorMsg = 'El formato del correo electrónico no es válido.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.api.validarCorreoRecuperacion(this.correo.trim()).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMsg = 'Código enviado correctamente a su correo electrónico.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.step = 2;
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.error || 'Error al validar el correo.';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }

  verificarCodigo(event: Event) {
    event.preventDefault();
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.codigo || !this.codigo.trim()) {
      this.errorMsg = 'Por favor, ingrese el código de verificación.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.api.verificarCodigoRecuperacion(this.correo.trim(), this.codigo.trim().toUpperCase()).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMsg = 'Código verificado con éxito.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.step = 3;
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.error || 'Código incorrecto o expirado.';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }

  restablecerPassword(event: Event) {
    event.preventDefault();
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.passwordNueva) {
      this.errorMsg = 'Por favor, ingrese la nueva contraseña.';
      this.cdr.detectChanges();
      return;
    }
    if (this.passwordNueva.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.confirmarPasswordNueva) {
      this.errorMsg = 'Por favor, confirme su contraseña.';
      this.cdr.detectChanges();
      return;
    }
    if (this.passwordNueva !== this.confirmarPasswordNueva) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const payload = {
      correo: this.correo.trim(),
      codigo: this.codigo.trim().toUpperCase(),
      password: this.passwordNueva
    };

    this.api.restablecerPassword(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMsg = 'Contraseña restablecida correctamente.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.step = 4;
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.error || 'Error al restablecer la contraseña.';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }
}
