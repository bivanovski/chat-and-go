namespace AzureAICognitiveServicesAPI.Models
{
    public class MessageAudioRequest
    {
        public IFormFile File { get; set; }
        public string SenderUsername { get; set; }
        public string LocalId { get; set; }
    }
}
