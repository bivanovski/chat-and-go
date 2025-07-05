namespace AzureAICognitiveServicesAPI.Models.DTO
{
    public class AudioMessageRequest
    {
        public string SenderUsername { get; set; }
        public string ChatId { get; set; }
        public IFormFile File { get; set; }
        public string? LocalId { get; set; } // Optional – used to echo back to frontend
    }
}
