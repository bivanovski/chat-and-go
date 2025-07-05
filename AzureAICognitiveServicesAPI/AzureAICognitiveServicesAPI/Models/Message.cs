using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace AzureAICognitiveServicesAPI.Models
{
    public class Message
    {
        [Key]
        public Guid ID { get; set; } //Primary Key
        public Guid ChatId { get; set; }
        public Chat Chat { get; set; }

        public Guid SenderId { get; set; }
        public User Sender { get; set; }

        public string Content { get; set; }

        public MessageType Type { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public bool IsFromBot { get; set; }

        public ICollection<MessageDelivery> Deliveries { get; set; }

    }

    public enum MessageType
    {
        Text,
        Audio,
        TranslatedText,
        Feedback,
        Image
    }
}
