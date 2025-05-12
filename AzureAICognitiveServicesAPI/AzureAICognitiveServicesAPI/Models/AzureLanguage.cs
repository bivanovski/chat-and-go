namespace AzureAICognitiveServicesAPI.Models
{
    public class AzureLanguage
    {
        public string Code { get; set; } // Language code (e.g., "en", "fr", "de")
        public string Name { get; set; } // Full name of the language (e.g., "English", "French", "German")
        public bool IsTranslationSupported { get; set; }
        public bool IsSpeechSupported { get; set; }

    }
}
