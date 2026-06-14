import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatCard } from '../../components/stat-card/stat-card';
import { AnalysisItem } from '../../components/analysis-item/analysis-item';
import { ChartCard } from '../../components/chart-card/chart-card';
import { PageHeader } from '../../components/page-header/page-header';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Sidebar,
    StatCard,
    AnalysisItem,
    ChartCard,
    PageHeader
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  usuarioNombre: string = 'Usuario';
  totalAnalisis: number = 0;

  sanoCount: number = 0;
  sanoPct: string = '0%';

  podredumbreCount: number = 0;
  podredumbrePct: string = '0%';

  parasitoCount: number = 0;
  parasitoPct: string = '0%';

  ultimosAnalisis: any[] = [];
  chartData: any[] = [];

  constructor(private api: Api, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!userStr) {
      this.router.navigate(['/login']);
      return;
    }
    const user = JSON.parse(userStr);
    const usuarioId = user.id;
    this.usuarioNombre = user.nombre_completo;

    this.api.getDashboard(usuarioId).subscribe({
      next: (res: any) => {
        this.totalAnalisis = res.total_analisis;
        this.ultimosAnalisis = res.ultimos_analisis;

        let sano = 0;
        let podredumbre = 0;
        let parasito = 0;

        res.clasificaciones.forEach((c: any) => {
          if (c.codigo === 'cacao_sano') {
            sano += c.cantidad;
          } else if (c.codigo === 'cacao_moniliasis' || c.codigo === 'cacao_mazorca_negra') {
            podredumbre += c.cantidad;
          } else if (c.codigo === 'cacao_barrenador' || c.codigo === 'cacao_mirido') {
            parasito += c.cantidad;
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
      error: (err) => console.error('Error cargando dashboard:', err)
    });

    this.api.getReportes(usuarioId).subscribe({
      next: (res: any) => {
        const list = res.analisis_por_fecha || [];
        this.chartData = list.slice(-7);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando datos del gráfico:', err)
    });
  }

  getColorForClass(codigo: string): string {
    if (codigo === 'cacao_sano') return 'green';
    if (codigo === 'cacao_moniliasis' || codigo === 'cacao_mazorca_negra') return 'red';
    return 'orange';
  }
}