import { Component, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MessageService } from '../../services/message.service';
import { SignalrService } from '../../services/signalr.service';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { LanguageDialogComponent } from '../../dialogs/language-dialog/language-dialog.component';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, BehaviorSubject, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { MessageSkeletonComponent } from '../../message-skeleton/message-skeleton.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    FlexLayoutModule,
    MatProgressSpinnerModule,
    MessageSkeletonComponent 
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollMe') scrollContainer!: ElementRef;
  currentUser: any;
  messages: any[] = [];
  newMessage: string = '';
  recordingDuration = 0;
  private recordingTimer: any = null;
  loading = true;
  private shouldScrollToBottom = false;
  private previousLoadingState = true;
  
  isSending = false;
  isSendingText = false;
  private sendTimeout: any = null;
  private readonly SEND_TIMEOUT_DURATION = 3000; // 3 seconds timeout
  private readonly AUDIO_SEND_TIMEOUT_DURATION = 15000; // 15 seconds timeout

  // For progressive loading
  pageSize = 20;
  currentPage = 1;
  hasMoreMessages = true;
  isLoadingMore = false;
  
  // For skeleton loaders
  skeletonCount = 5;
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private messageSubscription?: Subscription;

  isRecording = false;
  audioBlob: Blob | null = null;
  private audioContext!: AudioContext;
  private mediaStream!: MediaStream;
  private input!: MediaStreamAudioSourceNode;
  private recorder: ScriptProcessorNode | null = null;
  private audioData: Float32Array[] = [];
  currentPlayingIndex: number | null = null;
  currentAudio: HTMLAudioElement | null = null;
  typingUsers = new Set<string>();
  private typingTimeout: any = null;

  constructor(
    private messageService: MessageService,
    private signalRService: SignalrService,
    private languageService: LanguageService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Set up loading subject with debounce to prevent flickering
    this.loadingSubject
      .pipe(debounce(() => timer(300)))
      .subscribe(isLoading => this.loading = isLoading);
  }

  languageMap: Record<string, string> = {};

  ngOnInit(): void {
    const stored = sessionStorage.getItem('user');
    this.currentUser = stored ? JSON.parse(stored) : null;

    this.loadMessages(true);

    this.languageService.getLanguages().subscribe({
      next: (langs) => {
        this.languageMap = langs.reduce((map, lang) => {
          map[lang.code] = lang.name;
          return map;
        }, {} as Record<string, string>);
      },
    });

    this.signalRService.connect((textData) => {
    console.log('💬 Text message received:', textData);
    this.messages.push({
      senderUsername: textData.senderUsername ?? textData.SenderUsername ?? textData.sender,
      originalText: textData.originalText ?? textData.OriginalText,
      translatedText: textData.translatedText ?? textData.TranslatedText,
      timestamp: textData.timestamp ?? textData.Timestamp,
    });
    this.shouldScrollToBottom = true; // Set flag to scroll after view update
  });

    this.signalRService.onAudioMessage((audioData) => {
      console.log('🎵 Audio message received:', audioData);
      const isSelfMessage = audioData.sender === this.currentUser.username;
    
      // Ignore audio messages with empty or missing audio content
      if (!audioData.audio) {
        console.log('Ignoring audio message with empty audio content', audioData);
        return;
      }
    
      // Try to find a local pending message to update first by localId
      let idx = -1;
      if (audioData.localId) {
        idx = this.messages.findIndex(m => m.localId === audioData.localId);
      }
    
      // If not found and it's our own message, try to find by sender and pending status
      if (idx === -1 && isSelfMessage) {
        idx = this.messages.findIndex(m =>
          m.senderUsername === this.currentUser.username &&
          m.pending === true
        );
      }
    
      if (idx !== -1) {
        // Update existing message instead of adding a new one
        console.log('Updating existing message at index', idx);
        this.messages[idx].audioContent = audioData.audio;
        this.messages[idx].translatedText = `(Audio in ${audioData.language})`;
        this.messages[idx].pending = false;
        this.messages[idx].timestamp = audioData.timestamp;
        this.messages[idx].isProcessed = true;
        this.messages[idx].localId = undefined; // Clear localId after processing
      } else if (!isSelfMessage) {
        // Only add new message if it's from someone else
        console.log('Adding new message from another user');
        this.messages.push({
          senderUsername: audioData.sender,
          audioContent: audioData.audio,
          timestamp: audioData.timestamp,
          translatedText: `(Audio in ${audioData.language})`,
          isProcessed: true
        });
      } else {
        // Do not add or update anything if it's a duplicate self message
        console.log('Ignoring duplicate self message', audioData);
      }
    
      this.shouldScrollToBottom = true;
    });
    
    this.signalRService.onTypingStatusUpdate(
      (username: string, isTyping: boolean) => {
        console.log('Typing status update:', username, isTyping);
        if (isTyping) {
          this.typingUsers.add(username);
        } else {
          this.typingUsers.delete(username);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.signalRService.disconnect();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
     // Clean up send timeout
    if (this.sendTimeout) {
      clearTimeout(this.sendTimeout);
    }
  }

  shouldShowDateDivider(index: number): boolean {
    if (index === 0) return true;
    const current = new Date(this.messages[index].timestamp);
    const previous = new Date(this.messages[index - 1].timestamp);
    return (
      current.getFullYear() !== previous.getFullYear() ||
      current.getMonth() !== previous.getMonth() ||
      current.getDate() !== previous.getDate()
    );
  }
  
  getDateLabel(timestamp: string): string {
    const date = new Date(timestamp);
    const today = new Date();
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) {
      return 'Today';
    }
    // Optionally, handle "Yesterday"
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    ) {
      return 'Yesterday';
    }
    // Otherwise, return formatted date
    return date.toLocaleDateString();
  }

  getTypingUsernames(): string[] {
    return Array.from(this.typingUsers);
  }

  onTyping(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    } else {
      this.signalRService.sendTypingStatus(true);
    }
    this.typingTimeout = setTimeout(() => {
      this.signalRService.sendTypingStatus(false);
      this.typingTimeout = null;
    }, 1500);
  }

  stopTypingIndicator(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    this.signalRService.sendTypingStatus(false);
  }

   ngAfterViewChecked() {
    // Check if loading state changed from true to false (messages finished loading)
    if (this.previousLoadingState === true && this.loading === false) {
      this.scrollToBottom();
    }
    
    // Also scroll if flag is set (for new messages)
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
    
    // Update previous loading state
    this.previousLoadingState = this.loading;
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer && this.scrollContainer.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = 
          this.scrollContainer.nativeElement.scrollHeight;
        console.log('Scrolled to bottom:', this.scrollContainer.nativeElement.scrollHeight);
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

onScroll(event: any): void {
    const target = event.target;
    // Load more messages when scrolling near the BOTTOM to fetch newer messages.
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 150) {
      this.loadMoreMessages();
    }
  }

 loadMessages(initial = true) {
    if (initial) {
      this.loadingSubject.next(true);
      // Reset state for a fresh load
      this.currentPage = 1;
      this.hasMoreMessages = true;
      this.messages = [];
    }

    // Prevent making a request if we know there are no more messages or are already loading
    if (!this.hasMoreMessages || this.isLoadingMore) {
      if (!this.hasMoreMessages) console.log('No more messages to load.');
      this.isLoadingMore = false;
      return;
    }
    
    this.isLoadingMore = true;

    this.messageService.getMessages(this.currentUser.username, this.currentPage, this.pageSize).subscribe({
      next: (newMessages) => {
        if (initial) this.loadingSubject.next(false);

        // If the API returns an empty array, we've reached the end.
        if (!newMessages || newMessages.length === 0) {
          this.hasMoreMessages = false;
          this.isLoadingMore = false;
          return;
        }

        // DO NOT REVERSE. We assume the API sends messages in chronological order (oldest first).
        // We will append the newer messages to the end of the list.
        this.messages = [...this.messages, ...newMessages];

        // If we received less than a full page of messages, it's the last page.
        this.hasMoreMessages = newMessages.length === this.pageSize;
        
        // Only increment the page if there might be more messages
        if (this.hasMoreMessages) {
          this.currentPage++;
        }

        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.isLoadingMore = false;
        if (initial) this.loadingSubject.next(false);
        this.snackBar.open('Failed to load messages.', 'Dismiss', { duration: 3000 });
      }
    });
  }
  

  loadMoreMessages(): void {
    if (this.hasMoreMessages && !this.isLoadingMore) {
      this.loadMessages(false);
    }
  }


  sendMessage() {
    // Prevent sending if already sending or no message content
    if (!this.newMessage.trim() || this.isSending) return;

    // Set sending state
    this.isSending = true;
    this.isSendingText = true;
    
    // Store the message to send
    const messageToSend = this.newMessage.trim();
    
    // Clear the input immediately for better UX
    this.newMessage = '';
    this.stopTypingIndicator();

    const payload = {
      senderUsername: this.currentUser.username,
      originalText: messageToSend,
    };

    // Set timeout to re-enable send button after specified duration
    this.sendTimeout = setTimeout(() => {
      this.isSending = false;
      this.isSendingText = false;
      console.log('Send button timeout completed - button re-enabled');
    }, this.SEND_TIMEOUT_DURATION);

    this.messageService.sendMessage(payload).subscribe({
      next: (response) => {
        console.log('Message sent successfully:', response);
        // Message sent successfully - button will be re-enabled by timeout
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        
        // Re-enable send button immediately on error
        this.isSending = false;
        this.isSendingText = false;
        if (this.sendTimeout) {
          clearTimeout(this.sendTimeout);
          this.sendTimeout = null;
        }
        
        // Restore the message to input field on error
        this.newMessage = messageToSend;
        
        // Show error notification
        this.snackBar.open('Failed to send message. Please try again.', 'Dismiss', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // --- AUDIO RECORDING UI LOGIC ---

  startRecording() {
    this.isRecording = true;
    this.audioBlob = null;
    this.audioData = [];
    this.recordingDuration = 0;
    this.recordingTimer = setInterval(() => this.recordingDuration++, 1000);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.mediaStream = stream;
      this.input = this.audioContext.createMediaStreamSource(stream);

      const bufferSize = 4096;
      this.recorder = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      this.recorder.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRecording) return;
        this.audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      this.input.connect(this.recorder);
      this.recorder.connect(this.audioContext.destination);
    });
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.mediaStream.getTracks().forEach((track) => track.stop());
    this.input.disconnect();
    this.recorder?.disconnect();

    const flat = Float32Array.from(
      (this.audioData as Float32Array[]).flatMap((arr) => Array.from(arr))
    );
    this.audioBlob = this.encodeWAV(flat, this.audioContext.sampleRate);
  }

  playPreview() {
    if (!this.audioBlob) return;

    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.currentPlayingIndex = null;
    }

    // Play the preview
    const audio = new Audio(URL.createObjectURL(this.audioBlob));
    audio.onended = () => {
      // Reset when preview finished playing
    };
    audio.play();
  }

  cancelRecording() {
    this.audioBlob = null;
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  playAudioBlob() {
    if (!this.audioBlob) return;
    const url = URL.createObjectURL(this.audioBlob);
    const audio = new Audio(url);
    audio.play();
  }

   sendAudio() {
    if (!this.audioBlob || this.isSending) return;
    
    if (this.sendTimeout) {
      clearTimeout(this.sendTimeout);
    }
    
    // Set sending state
    this.isSending = true;
    this.isSendingText = false; 

     // Set timeout to re-enable send button
    this.sendTimeout = setTimeout(() => {
      console.warn('Audio send timeout reached. Resetting UI.');
      this.isSending = false;
      // We leave the audio blob so the user can try again.
    }, this.AUDIO_SEND_TIMEOUT_DURATION);
    
    const localId = Date.now().toString() + Math.random().toString().slice(2);
    const formData = new FormData();
    formData.append('file', this.audioBlob, 'recording.wav');
    formData.append('senderUsername', this.currentUser.username);
    formData.append('localId', localId);


    // Add the audio message to the chat immediately
    const localMsg = {
      senderUsername: this.currentUser.username,
      audioContent: null as string | null,
      timestamp: new Date().toISOString(),
      translatedText: '(Sending audio...)',
      pending: true,
      localId: localId,
      isProcessed: false
    };

    // Read the blob as base64 for local playback
    const reader = new FileReader();
    reader.onload = () => {
      localMsg.audioContent = (reader.result as string).split(',')[1];
      this.messages.push(localMsg);
      setTimeout(() => this.scrollToBottom(), 100);
    };
    reader.readAsDataURL(this.audioBlob);

    this.messageService.sendAudio(formData).subscribe({
      next: (response) => {
        console.log('Audio sent successfully:', response);

        clearTimeout(this.sendTimeout);
        this.sendTimeout = null;

        this.audioBlob = null;
        this.isSending = false;
        this.isRecording = false;
        // Button will be re-enabled by timeout
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error sending audio:', error);

        clearTimeout(this.sendTimeout);
        this.sendTimeout = null;
        
        // Re-enable send button immediately on error
        this.isSending = false;
        if (this.sendTimeout) {
          clearTimeout(this.sendTimeout);
          this.sendTimeout = null;
        }
        
        // Find and mark the message as failed
        const idx = this.messages.findIndex(m => m.localId === localId);
        if (idx !== -1) {
          this.messages[idx].translatedText = '(Failed to send audio)';
          this.messages[idx].pending = false;
        }
        
        // Show error notification
        this.snackBar.open('Failed to send audio message. Please try again.', 'Dismiss', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

isSendButtonDisabled(): boolean {
    // Disable if loading, sending, recording, an audio blob exists, or no text is entered.
    return this.loading || this.isSending || this.isRecording || !!this.audioBlob || !this.newMessage.trim();
  }

   getSendButtonTooltip(): string {
    if (this.isRecording) {
      return 'Recording in progress...';
    }
    if (this.isSending) {
      return 'Sending message...';
    }
    if (!this.newMessage.trim() && !this.audioBlob) {
      return 'Type a message or record audio to send';
    }
    return 'Send message';
  }
  
  // WAV encoding helper
  encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    function floatTo16BitPCM(
      output: DataView,
      offset: number,
      input: Float32Array
    ) {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    }
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => view.setUint8(i, b));
    view.setUint32(4, 36 + samples.length * 2, true);
    [0x57, 0x41, 0x56, 0x45].forEach((b, i) => view.setUint8(8 + i, b));
    [0x66, 0x6d, 0x74, 0x20].forEach((b, i) => view.setUint8(12 + i, b));
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat
    view.setUint16(22, 1, true); // NumChannels
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    [0x64, 0x61, 0x74, 0x61].forEach((b, i) => view.setUint8(36 + i, b));
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
  }

  openLanguageDialog(): void {
    if (!this.currentUser) return;
    this.languageService.getLanguages().subscribe({
      next: (languages) => {
        const dialogRef = this.dialog.open(LanguageDialogComponent, {
          width: '380px',
          panelClass: 'custom-dialog-container',
          autoFocus: false,
          data: {
            currentLanguage: this.currentUser.languageCode,
            languages: languages,
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result && result !== this.currentUser.languageCode) {
            this.updateUserLanguage(result);
          }
        });
      },
    });
  }

  updateUserLanguage(languageCode: string): void {
    this.languageService
      .updateUserLanguage(this.currentUser.username, languageCode)
      .subscribe(() => {
        this.currentUser.languageCode = languageCode;
        sessionStorage.setItem('user', JSON.stringify(this.currentUser));
      });
  }

  playAudio(base64: string) {
    try {
      const audioBlob = this.signalRService.base64ToBlob(base64, 'audio/wav');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (error) => {
        console.error('Error playing audio:', error);
        alert('Failed to play audio. The format may be unsupported.');
      };

      audio.play().catch((error) => {
        console.error('Audio playback failed:', error);
        alert('Audio playback failed: ' + error.message);
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio data');
    }
  }

  playOrPauseAudio(base64: string, idx: number) {
    // If already playing this audio, pause it
    if (this.currentPlayingIndex === idx && this.currentAudio) {
      this.currentAudio.pause();
      this.currentPlayingIndex = null;
      return;
    }

    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.currentPlayingIndex = null;
    }

    // Play new audio
    const audioBlob = this.signalRService.base64ToBlob(base64, 'audio/wav');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onloadedmetadata = () => {
      // Set the duration for the message if not already set or if it's 0
      if (
        !this.messages[idx].audioDuration ||
        this.messages[idx].audioDuration === 0
      ) {
        this.messages[idx].audioDuration = audio.duration;
      }
    };

    audio.onended = () => {
      this.currentPlayingIndex = null;
      this.currentAudio = null;
    };
    audio.onerror = (error) => {
      this.currentPlayingIndex = null;
      this.currentAudio = null;
      alert('Failed to play audio.');
    };

    this.currentPlayingIndex = idx;
    this.currentAudio = audio;
    audio.play();
  }

  formatAudioDuration(duration: number | null | undefined): string {
    if (
      duration === null ||
      duration === undefined ||
      isNaN(duration) ||
      duration < 0
    ) {
      return '00:00';
    }
    const totalSeconds = Math.round(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  logout(): void {
    this.authService.logout();
    this.signalRService.disconnect();
    this.snackBar.open('Successfully logged out!', 'Dismiss', {
      duration: 4000,
      verticalPosition: 'top',
      horizontalPosition: 'center',
      panelClass: ['success-snackbar'],
      announcementMessage: 'You have been logged out successfully'
    });
    this.router.navigate(['/login']);
  }
}