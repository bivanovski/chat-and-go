namespace AzureAICognitiveServicesAPI.Models
{
    public class Message
    {
        public int ID { get; set; } //Primary Key
        public string OriginalText { get; set; } // The original text of the message
        public DateTime Timestamp { get; set; } = DateTime.Now; // The time the message was sent
        public int SenderID { get; set; } // Foreign Key to User
        public User Sender { get; set; } //Navigation property
        public ICollection<MessageDelivery> Deliveries { get; set; } = new List<MessageDelivery>(); // User list of message deliveries
    }
}
