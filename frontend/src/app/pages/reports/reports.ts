import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatCard } from '../../components/stat-card/stat-card';
import { ChartCard } from '../../components/chart-card/chart-card';
import { PageHeader } from '../../components/page-header/page-header';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Sidebar,
    StatCard,
    ChartCard,
    PageHeader
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class Reports implements OnInit {
  totalAnalisis: number = 0;
  
  sanoCount: number = 0;
  sanoPct: string = '0%';
  
  podredumbreCount: number = 0;
  podredumbrePct: string = '0%';
  
  parasitoCount: number = 0;
  parasitoPct: string = '0%';

  fechaInicio: string = '';
  fechaFin: string = '';
  chartData: any[] = [];
  loading: boolean = false;
  usuarioId: number = 1;

  // Parámetros de configuración del Reporte PDF
  reportMode: string = 'general';  // 'general' | 'detailed' | 'alerts'
  filtroClasificacion: string = 'todas';
  includeCover: boolean = true;
  includeCharts: boolean = true;
  includeRecommendations: boolean = true;

  analisisDetallados: any[] = [];
  filteredDetalles: any[] = [];

  constructor(private api: Api, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!userStr) {
      this.router.navigate(['/login']);
      return;
    }
    const user = JSON.parse(userStr);
    this.usuarioId = user.id;

    const hoy = new Date();
    const hace30dias = new Date();
    hace30dias.setDate(hoy.getDate() - 30);

    this.fechaFin = this.formatDate(hoy);
    this.fechaInicio = this.formatDate(hace30dias);

    this.filtrarReportes();
  }

  formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  filtrarReportes() {
    this.loading = true;
    this.api.getReportes(this.usuarioId, this.fechaInicio, this.fechaFin).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.totalAnalisis = res.total_analisis;
        this.chartData = res.analisis_por_fecha || [];
        this.analisisDetallados = res.analisis_detallados || [];
        this.aplicarFiltroClasificacion();

        let sano = 0;
        let podredumbre = 0;
        let parasito = 0;

        res.distribucion.forEach((d: any) => {
          if (d.codigo === 'cacao_sano') {
            sano += d.cantidad;
          } else if (d.codigo === 'cacao_moniliasis' || d.codigo === 'cacao_mazorca_negra') {
            podredumbre += d.cantidad;
          } else if (d.codigo === 'cacao_barrenador' || d.codigo === 'cacao_mirido') {
            parasito += d.cantidad;
          }
        });

        this.sanoCount = sano;
        this.sanoPct = this.totalAnalisis > 0 ? (sano / this.totalAnalisis * 100).toFixed(1) + '%' : '0%';

        this.podredumbreCount = podredumbre;
        this.podredumbrePct = this.totalAnalisis > 0 ? (podredumbre / this.totalAnalisis * 100).toFixed(1) + '%' : '0%';

        this.parasitoCount = parasito;
        this.parasitoPct = this.totalAnalisis > 0 ? (parasito / this.totalAnalisis * 100).toFixed(1) + '%' : '0%';
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar reportes:', err);
        this.cdr.detectChanges();
      }
    });
  }

  get pieChartGradient(): string {
    if (this.totalAnalisis === 0) {
      return 'conic-gradient(#444 0% 100%)';
    }
    const sanoPctNum = (this.sanoCount / this.totalAnalisis) * 100;
    const podredumbrePctNum = (this.podredumbreCount / this.totalAnalisis) * 100;
    
    const sanoEnd = sanoPctNum.toFixed(1);
    const podredumbreEnd = (sanoPctNum + podredumbrePctNum).toFixed(1);
    
    return `conic-gradient(#4caf50 0% ${sanoEnd}%, #ff4d4d ${sanoEnd}% ${podredumbreEnd}%, #ffa500 ${podredumbreEnd}% 100%)`;
  }

  exportarReporte() {
    this.cdr.detectChanges();
    setTimeout(() => {
      window.print();
    }, 100);
  }

  aplicarFiltroClasificacion() {
    if (this.filtroClasificacion === 'todas') {
      // Si el modo es alertas, filtrar solo los enfermos
      if (this.reportMode === 'alerts') {
        this.filteredDetalles = this.analisisDetallados.filter(d => d.codigo !== 'cacao_sano');
      } else {
        this.filteredDetalles = this.analisisDetallados;
      }
    } else {
      this.filteredDetalles = this.analisisDetallados.filter(d => d.codigo === this.filtroClasificacion);
    }
    this.cdr.detectChanges();
  }

  get nombreUsuarioLogueado(): string {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.nombre_completo || 'Usuario CacaoDetect';
    }
    return 'Usuario CacaoDetect';
  }

  get fechaActual(): string {
    return new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get totalFiltrados(): number {
    return this.filteredDetalles.length;
  }

  get cacaosEnfermosFiltrados(): number {
    return this.filteredDetalles.filter(d => d.codigo !== 'cacao_sano').length;
  }

  get porcentajeEnfermosFiltrados(): string {
    if (this.totalFiltrados === 0) return '0%';
    const pct = (this.cacaosEnfermosFiltrados / this.totalFiltrados) * 100;
    return pct.toFixed(1) + '%';
  }

  get cacaosSanosFiltrados(): number {
    return this.filteredDetalles.filter(d => d.codigo === 'cacao_sano').length;
  }

  get porcentajeSanosFiltrados(): string {
    if (this.totalFiltrados === 0) return '0%';
    const pct = (this.cacaosSanosFiltrados / this.totalFiltrados) * 100;
    return pct.toFixed(1) + '%';
  }

  get distribucionFiltrada(): any[] {
    const list: any[] = [];
    const counts: { [key: string]: { name: string, count: number } } = {
      'cacao_sano': { name: 'Cacao Sano', count: 0 },
      'cacao_moniliasis': { name: 'Moniliasis', count: 0 },
      'cacao_mazorca_negra': { name: 'Mazorca Negra', count: 0 },
      'cacao_barrenador': { name: 'Barrenador de la Mazorca', count: 0 },
      'cacao_mirido': { name: 'Mírido del Cacao', count: 0 }
    };

    this.filteredDetalles.forEach(d => {
      if (counts[d.codigo]) {
        counts[d.codigo].count++;
      }
    });

    Object.keys(counts).forEach(key => {
      const cantidad = counts[key].count;
      const pct = this.totalFiltrados > 0 ? ((cantidad / this.totalFiltrados) * 100).toFixed(1) : '0';
      list.push({
        codigo: key,
        nombre: counts[key].name,
        cantidad: cantidad,
        porcentaje: pct
      });
    });

    return list;
  }

  formatReadableDate(rawDate: string): string {
    // Convierte "13/06/2026 22:30" o similar a formato legible si es necesario, o lo retorna directo
    return rawDate;
  }
}