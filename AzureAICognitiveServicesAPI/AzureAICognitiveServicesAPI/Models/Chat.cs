using System.ComponentModel.DataAnnotations;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AzureAICognitiveServicesAPI.Models
{
    public class Chat
    {
        [Key]
        public Guid ID { get; set; }

        public string Title { get; set; }

        public bool IsGroup { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ChatParticipant> Participants { get; set; }
        public ICollection<Message> Messages { get; set; }

    }
}
