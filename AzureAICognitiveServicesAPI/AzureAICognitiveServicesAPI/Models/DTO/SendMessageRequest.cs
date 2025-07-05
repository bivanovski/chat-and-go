namespace AzureAICognitiveServicesAPI.Models.DTO
{
    public class SendMessageRequest
    {
        public string SenderUsername { get; set; }
        public Guid ChatId { get; set; }
        public string Content { get; set; }
        public MessageType Type { get; set; } = MessageType.Text;
    }
}
