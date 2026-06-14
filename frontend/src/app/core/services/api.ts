import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, data);
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  analizarImagen(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/analizar`, formData);
  }

  getHistorial(usuarioId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/historial/${usuarioId}`);
  }

  getDashboard(usuarioId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/${usuarioId}`);
  }

  getReportes(usuarioId: number, fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio && fechaFin) {
      params = params.set('fecha_inicio', fechaInicio).set('fecha_fin', fechaFin);
    }
    return this.http.get(`${this.baseUrl}/reportes/${usuarioId}`, { params });
  }

  getPerfil(usuarioId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/perfil/${usuarioId}`);
  }

  updatePerfil(usuarioId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/perfil/${usuarioId}`, data);
  }

  validarCorreoRecuperacion(correo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/recuperar-password/validar`, { correo });
  }

  verificarCodigoRecuperacion(correo: string, codigo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/recuperar-password/verificar`, { correo, codigo });
  }

  restablecerPassword(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/recuperar-password/restablecer`, payload);
  }
}