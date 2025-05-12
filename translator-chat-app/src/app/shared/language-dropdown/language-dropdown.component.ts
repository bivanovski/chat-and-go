import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LanguageService } from '../../services/language.service';

interface Language {
  name: string;
  code: string;
  flag?: string;
  isSpeechSupported?: boolean;
}

@Component({
  selector: 'app-language-dropdown',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './language-dropdown.component.html',
  styleUrl: './language-dropdown.component.scss'
})
export class LanguageDropdownComponent implements OnInit {
  @Input() languages: Language[] = [];
  @Input() selectedLanguage: string = 'en';
  @Output() selectedLanguageChange = new EventEmitter<string>();

  constructor(private languageService: LanguageService) {}

  ngOnInit() {
    // Only fetch and filter languages with full speech support if not provided by parent
    if (!this.languages || this.languages.length === 0) {
      this.languageService.getLanguages().subscribe({
        next: (res) => (this.languages = this.getLanguagesBySupport(true, res)),
        error: () => console.warn('Failed to load languages')
      });
    } else {
      this.languages = this.getLanguagesBySupport(true, this.languages);
    }
  }

  getLanguagesBySupport(isSpeechSupported: boolean, langs: Language[] = this.languages): Language[] {
    return langs.filter(lang => lang.isSpeechSupported === isSpeechSupported);
  }

  onChange(languageCode: string) {
    this.selectedLanguage = languageCode;
    this.selectedLanguageChange.emit(languageCode);
  }
}