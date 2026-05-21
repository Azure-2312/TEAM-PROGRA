import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-analyze',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './analyze.html',
  styleUrl: './analyze.scss'
})
export class Analyze {}