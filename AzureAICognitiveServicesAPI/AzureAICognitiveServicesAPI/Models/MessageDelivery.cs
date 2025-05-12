namespace AzureAICognitiveServicesAPI.Models
{
    public class MessageDelivery
    {
        public int Id { get; set; } // Primary Key

        public int MessageId { get; set; } // Foreign Key to Message
        public Message Message { get; set; } // Navigation property

        public int RecipientId { get; set; } // Foreign Key to User
        public User Recipient { get; set; } // Navigation property

        public string TranslatedText { get; set; } // The translated text of the message

        public string? AudioBase64 { get; set; } // The translated audio file
    }
}