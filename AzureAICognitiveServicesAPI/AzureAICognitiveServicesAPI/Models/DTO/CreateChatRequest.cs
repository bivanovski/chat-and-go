namespace AzureAICognitiveServicesAPI.Models.DTO
{
    public class CreateChatRequest
    {
        public string CurrentUserUsername { get; set; } = string.Empty; // ✅ Add this
        public string Title { get; set; }  // Optional, useful for group
        public bool IsGroup { get; set; }
        public List<string> ParticipantUsernames { get; set; }  // excluding self
    }
}
