# ChatnGo - Real-time Speech and Text Translating Instant Messaging App

ChatnGo is a real-time chat application with automatic translation capabilities, powered by Azure AI Cognitive Services. Users can communicate in their preferred language while text and vocie messages are automatically translated for recipients. 

---

## 🧱 Project Structure

The project consists of two main parts:

- **Frontend**: Angular-based chat interface (`/translator-chat-app`)
- **Backend**: .NET Core API using Azure AI services (`/AzureAICognitiveServicesAPI`)
- **Database**: SQL Server with EF Core migrations

---

## ✨ Features

- 💬 Real-time messaging using SignalR
- 🌐 Automatic translation between 100+ languages
- 🔊 Text-to-speech for audio messages
- 👤 User language preference settings
- 🔐 Optional user authentication
- 💾 Persistent chat history

---

## 🚀 Getting Started

### ✅ Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Angular CLI](https://angular.io/cli) (v15 or higher)
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [SQL Server](https://www.microsoft.com/sql-server/) or [SQL Server Express](https://www.microsoft.com/sql-server/sql-server-downloads)
- Azure account with Cognitive Services (Translator + Speech)

---

### 🔧 Backend Setup (`AzureAICognitiveServicesAPI`)

1. Navigate to the API folder:
   ```bash
   cd AzureAICognitiveServicesAPI
   ```

2. Install dependencies:
   ```bash
   dotnet restore
   ```

3. Create an `appsettings.Development.json` file:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Your-Local-SQL-Connection-Here"
     },
     "Speech": {
       "Key": "Your-Azure-Speech-Key",
       "Region": "Your-Azure-Speech-Region"
     },
     "Translator": {
       "Key": "Your-Azure-Translator-Key",
       "Region": "Your-Azure-Translator-Region"
     }
   }
   ```

4. Apply EF Core migrations:
   ```bash
   dotnet ef database update
   ```

5. Run the backend API:
   ```bash
   dotnet run
   ```

---

### 🎨 Frontend Setup (`translator-chat-app`)

1. Navigate to the frontend directory:
   ```bash
   cd translator-chat-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   ng serve
   ```

The app will be available at [http://localhost:4200](http://localhost:4200)

---

## 🌍 Azure Services Used

- **Azure Translator** – for message translation
- **Azure Speech Translation** – for text-to-speech and speech-to-text translation in one go.