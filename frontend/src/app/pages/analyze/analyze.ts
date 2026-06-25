import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { PageHeader } from '../../components/page-header/page-header';
import { UploadBox } from '../../components/upload-box/upload-box';
import { ResultCard } from '../../components/result-card/result-card';
import { RecommendationCard } from '../../components/recommendation-card/recommendation-card';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-analyze',
  standalone: true,
  imports: [
    CommonModule,
    UpperCasePipe,
    FormsModule,
    Sidebar,
    PageHeader,
    UploadBox,
    ResultCard,
    RecommendationCard
  ],
  templateUrl: './analyze.html',
  styleUrl: './analyze.scss'
})
export class Analyze implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef;
  selectedFile: File | null = null;
  selectedImage: string | null = null;
  isAnalyzed: boolean = false;
  loading: boolean = false;
  modeloSeleccionado: string = 'yolo';  // 'yolo' o 'keras'
  resultado: any = null;
  errorMsg: string = '';
  activeTab: 'upload' | 'camera' = 'upload';
  mediaStream: MediaStream | null = null;

  constructor(private api: Api, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!userStr) {
      this.router.navigate(['/login']);
    }
  }

  onImageSelected(file: File): void {
    this.selectedFile = file;
    this.selectedImage = URL.createObjectURL(file);
    this.isAnalyzed = false;
    this.resultado = null;
    this.errorMsg = '';
    this.cdr.detectChanges();
  }

  onChangeImageSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.onImageSelected(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.selectedImage = null;
    this.isAnalyzed = false;
    this.resultado = null;
    this.errorMsg = '';
    this.cdr.detectChanges();
  }

  analyzeImage(): void {
    if (!this.selectedFile) return;

    let usuarioId = 1; // Fallback demo
    const userStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (userStr) {
      const user = JSON.parse(userStr);
      usuarioId = user.id;
    }

    const formData = new FormData();
    formData.append('usuario_id', usuarioId.toString());
    formData.append('imagen', this.selectedFile);
    formData.append('modelo', this.modeloSeleccionado);

    this.loading = true;
    this.errorMsg = '';
    this.resultado = null;
    this.cdr.detectChanges();

    this.api.analizarImagen(formData).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.resultado = res;
        this.isAnalyzed = true;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'Ocurrió un error al procesar la imagen con la Inteligencia Artificial.';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }

  resetAnalysis(): void {
    this.selectedFile = null;
    this.selectedImage = null;
    this.isAnalyzed = false;
    this.resultado = null;
    this.errorMsg = '';
    this.cdr.detectChanges();
    if (this.activeTab === 'camera') {
      this.startCamera();
    }
  }

  setTab(tab: 'upload' | 'camera'): void {
    this.activeTab = tab;
    this.selectedFile = null;
    this.selectedImage = null;
    this.isAnalyzed = false;
    this.resultado = null;
    this.errorMsg = '';
    
    if (tab === 'upload') {
      this.stopCamera();
    } else {
      this.startCamera();
    }
    this.cdr.detectChanges();
  }

  retakePhoto(): void {
    this.selectedFile = null;
    this.selectedImage = null;
    this.isAnalyzed = false;
    this.resultado = null;
    this.errorMsg = '';
    this.startCamera();
  }

  startCamera(): void {
    this.errorMsg = '';
    this.cdr.detectChanges();

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Use back camera by default for field use
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
    .then((stream) => {
      this.mediaStream = stream;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      }, 50);
    })
    .catch((err) => {
      console.error('Error al acceder a la cámara:', err);
      this.errorMsg = 'No se pudo acceder a la cámara. Por favor asegúrate de otorgar los permisos de video.';
      this.activeTab = 'upload';
      this.cdr.detectChanges();
    });
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cdr.detectChanges();
  }

  capturePhoto(): void {
    if (!this.mediaStream || !this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `cacao_camara_${Date.now()}.jpg`, { type: 'image/jpeg' });
          this.onImageSelected(file);
          this.stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}