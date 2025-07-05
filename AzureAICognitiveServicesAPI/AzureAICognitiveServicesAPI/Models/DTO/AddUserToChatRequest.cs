namespace AzureAICognitiveServicesAPI.Models.DTO
{
    public class AddUserToChatRequest
    {
        public Guid ChatId { get; set; }
        public string Username { get; set; }
    }
}
