import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { PageHeader } from '../../components/page-header/page-header';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, PageHeader],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History implements OnInit {
  historial: any[] = [];
  loading: boolean = false;
  searchQuery: string = '';
  selectedResultFilter: string = 'todos';

  constructor(private api: Api, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!userStr) {
      this.router.navigate(['/login']);
      return;
    }
    const user = JSON.parse(userStr);
    const usuarioId = user.id;

    this.loading = true;
    this.api.getHistorial(usuarioId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.historial = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error cargando historial:', err);
        this.cdr.detectChanges();
      }
    });
  }

  get filteredHistorial() {
    return this.historial.filter(item => {
      const matchesSearch = item.nombre_analisis.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            item.nombre.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      let matchesResult = true;
      if (this.selectedResultFilter !== 'todos') {
        const color = this.getColorForClass(item.codigo);
        if (this.selectedResultFilter === 'sano' && color !== 'green') matchesResult = false;
        if (this.selectedResultFilter === 'podredumbre' && color !== 'red') matchesResult = false;
        if (this.selectedResultFilter === 'parasitos' && color !== 'orange') matchesResult = false;
      }
      return matchesSearch && matchesResult;
    });
  }

  getColorForClass(codigo: string): string {
    if (codigo === 'cacao_sano') return 'green';
    if (codigo === 'cacao_moniliasis' || codigo === 'cacao_mazorca_negra') return 'red';
    return 'orange';
  }
}