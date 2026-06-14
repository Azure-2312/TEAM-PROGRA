import { Component } from '@angular/core';

import { Sidebar } from '../../components/sidebar/sidebar';
import { PageHeader } from '../../components/page-header/page-header';
import { UploadBox } from '../../components/upload-box/upload-box';
import { ResultCard } from '../../components/result-card/result-card';
import { RecommendationCard } from '../../components/recommendation-card/recommendation-card';

@Component({
  selector: 'app-analyze',
  standalone: true,

  imports: [
    Sidebar,
    PageHeader,
    UploadBox,
    ResultCard,
    RecommendationCard
  ],

  templateUrl: './analyze.html',
  styleUrl: './analyze.scss'
})

export class Analyze {

  selectedImage: string | null = null;

  isAnalyzed: boolean = false;

  onImageSelected(imageUrl: string): void {

    this.selectedImage = imageUrl;

    this.isAnalyzed = false;
  }

  removeImage(): void {

    this.selectedImage = null;

    this.isAnalyzed = false;
  }

  analyzeImage(): void {

    this.isAnalyzed = true;
  }
  resetAnalysis(): void {
    this.selectedImage = null;
    this.isAnalyzed = false;
  }

}