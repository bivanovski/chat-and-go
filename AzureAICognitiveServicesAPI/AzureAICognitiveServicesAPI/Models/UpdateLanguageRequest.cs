namespace AzureAICognitiveServicesAPI.Models
{
    public class UpdateLanguageRequest
    {
        public string Username { get; set; } // The username of the user
        public string LanguageCode { get; set; } // The new language code for the user
    }
}
