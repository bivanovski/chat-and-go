using AzureAICognitiveServicesAPI.Models;
using Newtonsoft.Json.Linq;

namespace AzureAICognitiveServicesAPI.Services
{
    public class AzureLanguageService
    {
        private readonly HttpClient _httpClient;

        private static readonly HashSet<string> SpeechTranslationLanguages = new()
        {
        "af", "ar", "bn", "bs", "bg", "yue", "ca", "zh-Hans", "zh-Hant",
        "hr", "cs", "da", "nl", "en", "et", "fj", "fil", "fi", "fr",
        "de", "el", "gu", "ht", "he", "hi", "hu", "is", "id", "it", "ja",
        "sw", "tlh", "ko", "lv", "lt", "ms", "ml", "mt", "nb", "fa",
        "pl", "pt", "pa", "ro", "ru", "sr-Cyrl", "sr-Latn", "sk", "sl",
        "es", "sv", "ta", "te", "th", "tr", "uk", "ur", "vi", "cy"
        };

        public AzureLanguageService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<List<AzureLanguage>> GetSupportedLanguagesAsync()
        {
            var url = "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation";
            var response = await _httpClient.GetStringAsync(url);
            var root = JObject.Parse(response);

            var translation = root["translation"] as JObject ?? new JObject();

            var result = new List<AzureLanguage>();

            foreach (var prop in translation.Properties())
            {
                var code = prop.Name;
                var name = prop.Value["name"]?.ToString();

                result.Add(new AzureLanguage
                {
                    Code = code,
                    Name = name,
                    IsTranslationSupported = true,
                    IsSpeechSupported = SpeechTranslationLanguages.Contains(code)
                });
            }

            return result.OrderBy(l => l.Name).ToList();
        }
    }
}
