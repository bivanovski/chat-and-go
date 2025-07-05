using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AzureAICognitiveServicesAPI.Models
{
    public class MessageDelivery
    {
        [Key]
        public Guid ID { get; set; } // Primary Key

        [Required]
        public Guid MessageId { get; set; } // Foreign Key to Message
        
        [ForeignKey("MessageId")]
        public Message Message { get; set; } // Navigation property

        [Required]
        public Guid RecipientId { get; set; } // Foreign Key to User

        [ForeignKey("RecipientId")]
        public User Recipient { get; set; } // Navigation property

        public string TranslatedText { get; set; } // The translated text of the message

        public string? AudioBase64 { get; set; } // The translated audio file
    }
}