import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { PageHeader } from '../../components/page-header/page-header';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, Sidebar, PageHeader],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile {}
