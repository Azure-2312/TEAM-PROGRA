import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatCard } from '../../components/stat-card/stat-card';
import { AnalysisItem } from '../../components/analysis-item/analysis-item';
import { ChartCard } from '../../components/chart-card/chart-card';
import { PageHeader } from '../../components/page-header/page-header';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
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
export class Dashboard {}