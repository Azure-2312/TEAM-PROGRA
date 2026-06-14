import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './result-detail.html',
  styleUrl: './result-detail.scss'
})
export class ResultDetail {}