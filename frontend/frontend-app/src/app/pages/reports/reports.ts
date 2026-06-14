import { Component } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatCard } from '../../components/stat-card/stat-card';
import { ChartCard } from '../../components/chart-card/chart-card';
import { PageHeader } from '../../components/page-header/page-header';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    Sidebar,
    StatCard,
    ChartCard,
    PageHeader
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class Reports {}