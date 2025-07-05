using System;
using System.ComponentModel.DataAnnotations;

namespace AzureAICognitiveServicesAPI.Models
{
    public class ChatParticipant
    {
        [Key]
        public Guid ID { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; }

        public Guid ChatId { get; set; }
        public Chat Chat { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        public bool IsMuted { get; set; }

        public bool IsBot { get; set; }
    }
}
