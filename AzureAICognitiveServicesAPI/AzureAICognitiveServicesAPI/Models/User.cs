namespace AzureAICognitiveServicesAPI.Models
{
    public class User
    {
        public int ID { get; set; } //Primary Key
        public string Username { get; set; } // Display name for login and tag
        public string Password { get; set; } // Password for login
        public string LanguageCode { get; set; } // Language code for translation

        public ICollection<Message> SentMessages { get; set; } = new List<Message>();// Messages sent by the user
        public ICollection<MessageDelivery> ReceivedDeliveries { get; set; } = new List<MessageDelivery>();// Translated messages received by the user

    }
}
