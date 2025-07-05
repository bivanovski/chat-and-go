namespace AzureAICognitiveServicesAPI.Models.DTO
{
    public class MessageSendRequest
    {
        public string SenderUsername { get; set; }
        public Guid ChatId { get; set; }
        public string Content { get; set; }
    }
}
