import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  usuario: any = {};
  loading: boolean = false;
  editMode: boolean = false;
  
  nombreCompleto: string = '';
  correo: string = '';
  username: string = '';
  passwordNueva: string = '';
  showPasswordInput: boolean = false;
  
  successMsg: string = '';
  errorMsg: string = '';

  constructor(private api: Api, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!userStr) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarPerfil();
  }

  cargarPerfil() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const usuarioId = user.id;

    this.loading = true;
    this.api.getPerfil(usuarioId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.usuario = res;
        this.nombreCompleto = res.nombre_completo;
        this.correo = res.correo;
        this.username = res.username;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar perfil:', err);
        this.cdr.detectChanges();
      }
    });
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.successMsg = '';
    this.errorMsg = '';
    if (!this.editMode) {
      this.nombreCompleto = this.usuario.nombre_completo;
      this.correo = this.usuario.correo;
      this.username = this.usuario.username;
      this.showPasswordInput = false;
      this.passwordNueva = '';
    }
    this.cdr.detectChanges();
  }

  guardarCambios() {
    if (!this.nombreCompleto || !this.correo || !this.username) {
      this.errorMsg = 'Los campos nombre, correo y usuario son requeridos.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.cdr.detectChanges();

    const payload: any = {
      nombre_completo: this.nombreCompleto,
      correo: this.correo,
      username: this.username
    };

    if (this.showPasswordInput && this.passwordNueva) {
      payload.password = this.passwordNueva;
    }

    this.api.updatePerfil(this.usuario.id, payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMsg = '¡Perfil actualizado correctamente!';
        
        this.usuario.nombre_completo = this.nombreCompleto;
        this.usuario.correo = this.correo;
        this.usuario.username = this.username;
        
        const isLocal = localStorage.getItem('usuario') !== null;
        const storage = isLocal ? localStorage : sessionStorage;
        const userStr = storage.getItem('usuario');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.nombre_completo = this.nombreCompleto;
          userObj.correo = this.correo;
          userObj.username = this.username;
          storage.setItem('usuario', JSON.stringify(userObj));
        }

        this.cdr.detectChanges();

        setTimeout(() => {
          this.editMode = false;
          this.showPasswordInput = false;
          this.passwordNueva = '';
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'Error al actualizar el perfil.';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }
}
