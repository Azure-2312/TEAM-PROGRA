import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { PageHeader } from '../../components/page-header/page-header';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    RouterLink,
    Sidebar,
    PageHeader
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History {}