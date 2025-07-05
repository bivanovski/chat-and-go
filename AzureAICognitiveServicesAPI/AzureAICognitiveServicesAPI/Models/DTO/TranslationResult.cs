namespace AzureAICognitiveServicesAPI.Models.DTO
{
    public class TranslationResult
    {
        public string RecognizedText { get; set; } // optional: original detected speech
        public string TranslatedText { get; set; }
        public byte[] TranslatedAudio { get; set; }
    }
}
