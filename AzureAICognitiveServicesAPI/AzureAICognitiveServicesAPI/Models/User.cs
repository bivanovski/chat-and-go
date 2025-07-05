using System.ComponentModel.DataAnnotations;
using System;
using System.Collections.Generic;

namespace AzureAICognitiveServicesAPI.Models
{
    public class User
    {

        [Key]
        public Guid ID { get; set; } //Primary Key

        [Required]
        public string Username { get; set; } // Display name for login and tag
        public string Password { get; set; } // Password for login
        public string LanguageCode { get; set; } // Language code for translation

        public ICollection<Message> MessagesSent { get; set; } = new List<Message>();// Messages sent by the user

        public ICollection<ChatParticipant> ChatParticipants { get; set; }


        public ICollection<MessageDelivery> ReceivedMessages { get; set; }


        //public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;



        //public ICollection<MessageDelivery> ReceivedDeliveries { get; set; } = new List<MessageDelivery>();// Translated messages received by the user

    }
}
