import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {

  private hubConnection!: signalR.HubConnection;

  constructor() {}

  connect(
    onTextMessage: (data: any) => void,
  ): void {
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

    if (!currentUser.username) {
      console.error('❌ No logged in user found.');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:7160/hub/messages?username=${currentUser.username}`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveMessage', onTextMessage);

    this.hubConnection.start()
      .then(() => console.log(`✅ SignalR connected as ${currentUser.username}`))
      .catch(err => console.error('❌ SignalR connection error:', err));
  }

  onAudioMessage(callback: (data: any) => void): void {
    if (!this.hubConnection) {
      console.error('❌ hubConnection not initialized.');
      return;
    }

    this.hubConnection.on('ReceiveAudioMessage', callback);
  }

  base64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
  
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
  
    return new Blob(byteArrays, { type: mimeType });
  }

  // Send typing status to the backend
sendTypingStatus(isTyping: boolean): void {
  if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
    this.hubConnection.invoke('UserTyping', isTyping)
      .catch(err => console.error('Error sending typing status:', err));
  }
}

// Listen for typing status updates from the backend
onTypingStatusUpdate(callback: (username: string, isTyping: boolean) => void): void {
  if (!this.hubConnection) return;
  this.hubConnection.on('UpdateTypingStatus', callback);
}
  

  disconnect(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      console.log('🔌 SignalR disconnected');
    }
  }
}
