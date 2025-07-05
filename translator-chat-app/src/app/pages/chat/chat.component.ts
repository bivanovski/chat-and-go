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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MessageService } from '../../services/message.service';
import { SignalrService } from '../../services/signalr.service';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { LanguageDialogComponent } from '../../dialogs/language-dialog/language-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, BehaviorSubject, timer } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MessageSkeletonComponent 
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollMe') scrollContainer!: ElementRef;
  
  // User and chat properties
  currentUser: any;
  currentChatId: string | null = null;
  chatParticipants: any[] = [];
  chatTitle: string = '';
  chatInfo: any = null;
  
  // Message properties
  messages: any[] = [];
  newMessage: string = '';
  loading = true;
  private shouldScrollToBottom = false;
  private previousLoadingState = true;
  
  // Pagination properties
  pageSize = 20;
  currentPage = 1;
  hasMoreMessages = true;
  isLoadingMore = false;

  // Sending properties
  isSending = false;
  isSendingText = false;
  private sendTimeout: any = null;
  private readonly SEND_TIMEOUT_DURATION = 3000; // 3 seconds timeout
  private readonly AUDIO_SEND_TIMEOUT_DURATION = 15000; // 15 seconds timeout

  // Audio recording properties
  isRecording = false;
  audioBlob: Blob | null = null;
  recordingDuration = 0;
  private recordingTimer: any = null;
  private audioContext!: AudioContext;
  private mediaStream!: MediaStream;
  private input!: MediaStreamAudioSourceNode;
  private recorder: ScriptProcessorNode | null = null;
  private audioData: Float32Array[] = [];
  
  // Audio playback properties
  currentPlayingIndex: number | null = null;
  currentAudio: HTMLAudioElement | null = null;
  
  // Typing indicator properties
  typingUsers = new Set<string>();
  private typingTimeout: any = null;
  
  // Loading and subscription management
  skeletonCount = 5;
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private messageSubscription?: Subscription;
  private routeSubscription?: Subscription;
  
  // Language mapping
  languageMap: Record<string, string> = {};

  constructor(
    private messageService: MessageService,
    private signalRService: SignalrService,
    private languageService: LanguageService,
    private authService: AuthService,
    private chatService: ChatService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Set up loading subject with debounce to prevent flickering
    this.loadingSubject
      .pipe(debounceTime(300))
      .subscribe(isLoading => this.loading = isLoading);
  }

  ngOnInit(): void {
    const stored = sessionStorage.getItem('user');
    this.currentUser = stored ? JSON.parse(stored) : null;

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to route parameters to get chat ID
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.currentChatId = params.get('id');
      if (this.currentChatId) {
        this.loadChatInfo();
        this.loadMessages(true);
      } else {
        // If no chat ID, redirect to home
        this.router.navigate(['/home']);
      }
    });

    // Load language mappings
    this.languageService.getLanguages().subscribe({
      next: (langs) => {
        this.languageMap = langs.reduce((map, lang) => {
          map[lang.code] = lang.name;
          return map;
        }, {} as Record<string, string>);
      },
      error: (error) => {
        console.error('Error loading languages:', error);
      }
    });

    // Set up SignalR connection
    this.signalRService.connect((textData) => {
      console.log('💬 Text message received:', textData);
      if (textData.chatId === this.currentChatId) {
        this.messages.push({
          senderUsername: textData.senderUsername ?? textData.SenderUsername ?? textData.sender,
          originalText: textData.originalText ?? textData.OriginalText,
          translatedText: textData.translatedText ?? textData.TranslatedText,
          timestamp: textData.timestamp ?? textData.Timestamp,
          chatId: textData.chatId
        });
        this.shouldScrollToBottom = true;
      }
    });

    this.signalRService.onAudioMessage((audioData) => {
      console.log('🎵 Audio message received:', audioData);
      if (audioData.chatId !== this.currentChatId) {
        return;
      }
      const isSelfMessage = audioData.sender === this.currentUser.username;
      if (!audioData.audio) {
        console.log('Ignoring audio message with empty audio content', audioData);
        return;
      }
      let idx = -1;
      if (audioData.localId) {
        idx = this.messages.findIndex(m => m.localId === audioData.localId);
      }
      if (idx === -1 && isSelfMessage) {
        idx = this.messages.findIndex(m =>
          m.senderUsername === this.currentUser.username &&
          m.pending === true
        );
      }
      if (idx !== -1) {
        console.log('Updating existing message at index', idx);
        this.messages[idx].audioContent = audioData.audio;
        this.messages[idx].translatedText = `(Audio in ${audioData.language})`;
        this.messages[idx].pending = false;
        this.messages[idx].timestamp = audioData.timestamp;
        this.messages[idx].isProcessed = true;
        this.messages[idx].localId = undefined;
      } else if (!isSelfMessage) {
        console.log('Adding new message from another user');
        this.messages.push({
          senderUsername: audioData.sender,
          audioContent: audioData.audio,
          timestamp: audioData.timestamp,
          translatedText: `(Audio in ${audioData.language})`,
          isProcessed: true,
          chatId: audioData.chatId
        });
      } else {
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
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.signalRService.disconnect();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
    if (this.sendTimeout) {
      clearTimeout(this.sendTimeout);
    }
  }

  // Load chat information and participants
  loadChatInfo(): void {
    if (!this.currentChatId) return;
    this.chatService.getChatParticipants(this.currentChatId).subscribe({
      next: (participants) => {
        this.chatParticipants = participants;
        if (participants.length <= 2) {
          const otherParticipant = participants.find(p => p.username !== this.currentUser.username);
          this.chatTitle = otherParticipant ? `Chat with ${otherParticipant.username}` : 'Private Chat';
        } else {
          this.chatTitle = `Group Chat (${participants.length} members)`;
        }
      },
      error: (error) => {
        console.error('Error loading chat info:', error);
        this.snackBar.open('Failed to load chat information', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/home']);
      }
    });
  }

  loadMessages(initial = true): void {
    if (!this.currentChatId) return;

    if (initial) {
      this.loadingSubject.next(true);
      this.currentPage = 1;
    } else {
      this.isLoadingMore = true;
    }
    this.messageService.getMessagesInChat(
      this.currentChatId, 
      this.currentUser.username, 
      (this.currentPage - 1) * this.pageSize, 
      this.pageSize
    ).subscribe({
      next: (msgs) => {
        if (initial) {
          this.messages = msgs;
          this.loadingSubject.next(false);
        } else {
          // Save scroll position before adding older messages
          const scrollContainer = this.scrollContainer.nativeElement;
          const oldScrollHeight = scrollContainer.scrollHeight;
          const oldScrollTop = scrollContainer.scrollTop;
          // Prepend older messages
          this.messages = [...msgs, ...this.messages];
          this.isLoadingMore = false;
          // Restore scroll position relative to new content after next view check
          setTimeout(() => {
            const newScrollHeight = scrollContainer.scrollHeight;
            const scrollOffset = newScrollHeight - oldScrollHeight;
            scrollContainer.scrollTop = oldScrollTop + scrollOffset;
          }, 0);
        }
        this.hasMoreMessages = msgs.length >= this.pageSize;
        this.currentPage++;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loadingSubject.next(false);
        this.isLoadingMore = false;
        this.snackBar.open('Failed to load messages', 'Dismiss', { duration: 3000 });
      }
    });
  }

  loadMoreMessages(): void {
    if (this.hasMoreMessages && !this.isLoadingMore) {
      this.isLoadingMore = true;
      this.loadMessages(false);
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentChatId || this.isSending) return;

    // Set sending state
    this.isSending = true;
    this.isSendingText = true;
    const messageToSend = this.newMessage.trim();
    this.newMessage = '';
    this.stopTypingIndicator();

    const payload = {
      senderUsername: this.currentUser.username,
      content: messageToSend,
      chatId: this.currentChatId
    };

    this.sendTimeout = setTimeout(() => {
      this.isSending = false;
      this.isSendingText = false;
      console.log('Send button timeout completed - button re-enabled');
    }, this.SEND_TIMEOUT_DURATION);

    this.messageService.sendMessage(payload).subscribe({
      next: () => {
        // Message sent successfully
        this.shouldScrollToBottom = true;
        // Button will be re-enabled by timeout
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.isSending = false;
        this.isSendingText = false;
        if (this.sendTimeout) {
          clearTimeout(this.sendTimeout);
          this.sendTimeout = null;
        }
        this.newMessage = messageToSend; // Restore message to input
        this.snackBar.open('Failed to send message. Please try again.', 'Dismiss', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
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
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    ) {
      return 'Yesterday';
    }
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

  ngAfterViewChecked(): void {
    if (this.previousLoadingState === true && this.loading === false) {
      this.scrollToBottom();
    }
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
    this.previousLoadingState = this.loading;
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer && this.scrollContainer.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = 
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  onScroll(event: any): void {
    // Load more messages when scrolling near the TOP to fetch older messages
    if (event.target.scrollTop < 100 && this.hasMoreMessages && !this.isLoadingMore) {
      this.loadMoreMessages();
    }
  }

  // --- AUDIO RECORDING UI LOGIC ---

  startRecording(): void {
    this.isRecording = true;
    this.audioBlob = null;
    this.audioData = [];
    this.recordingDuration = 0;
    this.recordingTimer = setInterval(() => this.recordingDuration++, 1000);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    }).catch((error) => {
      console.error('Error accessing microphone:', error);
      this.snackBar.open('Failed to access microphone', 'Dismiss', { duration: 3000 });
      this.isRecording = false;
    });
  }

  stopRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.input) {
      this.input.disconnect();
    }
    if (this.recorder) {
      this.recorder.disconnect();
    }
    const flat = Float32Array.from(
      (this.audioData as Float32Array[]).flatMap((arr) => Array.from(arr))
    );
    this.audioBlob = this.encodeWAV(flat, this.audioContext.sampleRate);
  }

  toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  playPreview(): void {
    if (!this.audioBlob) return;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.currentPlayingIndex = null;
    }
    const audio = new Audio(URL.createObjectURL(this.audioBlob));
    audio.onended = () => {
      // Reset when preview finished playing
    };
    audio.play().catch((error) => {
      console.error('Error playing preview:', error);
      this.snackBar.open('Failed to play preview', 'Dismiss', { duration: 3000 });
    });
  }

  cancelRecording(): void {
    this.audioBlob = null;
    if (this.isRecording) {
      this.stopRecording();
    }
  }

  sendAudio(): void {
    if (!this.audioBlob || !this.currentChatId || this.isSending) return;
    if (this.sendTimeout) {
      clearTimeout(this.sendTimeout);
    }
    this.isSending = true;
    this.isSendingText = false; 
    this.sendTimeout = setTimeout(() => {
      console.warn('Audio send timeout reached. Resetting UI.');
      this.isSending = false;
    }, this.AUDIO_SEND_TIMEOUT_DURATION);
    const localId = Date.now().toString() + Math.random().toString().slice(2);
    const formData = new FormData();
    formData.append('file', this.audioBlob, 'recording.wav');
    formData.append('senderUsername', this.currentUser.username);
    formData.append('chatId', this.currentChatId);
    formData.append('localId', localId);
    // Add the audio message to the chat immediately
    const localMsg = {
      senderUsername: this.currentUser.username,
      audioContent: null as string | null,
      timestamp: new Date().toISOString(),
      translatedText: '(Sending audio...)',
      pending: true,
      localId: localId,
      isProcessed: false,
      chatId: this.currentChatId
    };
    // Read the blob as base64 for local playback
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        localMsg.audioContent = (reader.result as string).split(',')[1];
        this.messages.push(localMsg);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    };
    reader.readAsDataURL(this.audioBlob);
    this.messageService.sendAudio(formData).subscribe({
      next: () => {
        clearTimeout(this.sendTimeout);
        this.sendTimeout = null;
        this.audioBlob = null;
        this.isSending = false;
        this.isRecording = false;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error sending audio:', error);
        clearTimeout(this.sendTimeout);
        this.sendTimeout = null;
        this.isSending = false;
        const idx = this.messages.findIndex(m => m.localId === localId);
        if (idx !== -1) {
          this.messages[idx].translatedText = '(Failed to send audio)';
          this.messages[idx].pending = false;
        }
        this.snackBar.open('Failed to send audio message. Please try again.', 'Dismiss', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // --- Enhanced send button disable & tooltip UI from main branch ---
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
  // ---------------------------------------------------------------

  // Audio playback methods
  playOrPauseAudio(base64: string, idx: number): void {
    if (this.currentPlayingIndex === idx && this.currentAudio) {
      this.currentAudio.pause();
      this.currentPlayingIndex = null;
      this.currentAudio = null;
      return;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.currentPlayingIndex = null;
    }
    const audioBlob = this.signalRService.base64ToBlob(base64, 'audio/wav');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.onloadedmetadata = () => {
      if (!this.messages[idx].audioDuration || this.messages[idx].audioDuration === 0) {
        this.messages[idx].audioDuration = audio.duration;
      }
    };
    audio.onended = () => {
      this.currentPlayingIndex = null;
      this.currentAudio = null;
    };
    audio.onerror = () => {
      this.currentPlayingIndex = null;
      this.currentAudio = null;
      this.snackBar.open('Failed to play audio', 'Dismiss', { duration: 3000 });
    };
    this.currentPlayingIndex = idx;
    this.currentAudio = audio;
    audio.play().catch((error) => {
      console.error('Audio playback failed:', error);
      this.currentPlayingIndex = null;
      this.currentAudio = null;
      this.snackBar.open('Audio playback failed', 'Dismiss', { duration: 3000 });
    });
  }

  formatAudioDuration(duration: number | null | undefined): string {
    if (duration === null || duration === undefined || isNaN(duration) || duration < 0) {
      return '00:00';
    }
    const totalSeconds = Math.round(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      error: (error) => {
        console.error('Error loading languages:', error);
        this.snackBar.open('Failed to load languages', 'Dismiss', { duration: 3000 });
      }
    });
  }

  updateUserLanguage(languageCode: string): void {
    this.languageService.updateUserLanguage(this.currentUser.username, languageCode).subscribe({
      next: () => {
        this.currentUser.languageCode = languageCode;
        sessionStorage.setItem('user', JSON.stringify(this.currentUser));
        this.snackBar.open('Language updated successfully', 'Dismiss', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating language:', error);
        this.snackBar.open('Failed to update language', 'Dismiss', { duration: 3000 });
      }
    });
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

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    }
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => view.setUint8(i, b));
    view.setUint32(4, 36 + samples.length * 2, true);
    [0x57, 0x41, 0x56, 0x45].forEach((b, i) => view.setUint8(8 + i, b));
    [0x66, 0x6d, 0x74, 0x20].forEach((b, i) => view.setUint8(12 + i, b));
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    [0x64, 0x61, 0x74, 0x61].forEach((b, i) => view.setUint8(36 + i, b));
    view.setUint32(40, samples.length * 2, true);
    floatTo16BitPCM(view, 44, samples);
    return new Blob([view], { type: 'audio/wav' });
  }
}
