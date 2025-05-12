import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './language-dialog.component.html',
  styleUrls: ['./language-dialog.component.scss']
})
export class LanguageDialogComponent {
  languages: { code: string; name: string; isSpeechSupported: boolean }[] = [];
  selectedLanguage: string;

  constructor(
    public dialogRef: MatDialogRef<LanguageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentLanguage: string },
    private languageService: LanguageService
  ) {
    this.selectedLanguage = data.currentLanguage;
  }

  ngOnInit(): void {
    this.languageService.getLanguages().subscribe(langs => {
      this.languages = langs;
    });
  }

   /**
   * Filters languages based on speech support status
   * @param isSpeechSupported Whether to get languages that support speech (true) or don't (false)
   * @returns Filtered array of languages
   */
   getLanguagesBySupport(isSpeechSupported: boolean): any[] {
    return this.languages.filter(lang => lang.isSpeechSupported === isSpeechSupported);
  }
}