import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class Reports {}