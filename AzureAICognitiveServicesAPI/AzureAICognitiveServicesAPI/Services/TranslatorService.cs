using Newtonsoft.Json.Linq;
using System.Text;

namespace AzureAICognitiveServicesAPI.Services
{
    public class TranslatorService
    {
        private readonly HttpClient _httpClient;
        private readonly string _subscriptionKey;
        private readonly string _region;
        private readonly string _endpoint;

        public TranslatorService(IConfiguration configuration)
        {
            _httpClient = new HttpClient();
            _subscriptionKey = configuration["Translator:Key"];
            _region = configuration["Translator:Region"];
            _endpoint = "https://api.cognitive.microsofttranslator.com";
        }
        public async Task<string> TranslateTextAsync(string text, string targetLanguage)
        {
            Console.OutputEncoding = Encoding.UTF8;
            var route = $"/translate?api-version=3.0&to={targetLanguage}";
            var body = new object[] { new { Text = text } };
            var requestBody = new StringContent(System.Text.Json.JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, _endpoint + route);
            request.Content = requestBody;
            request.Headers.Add("Ocp-Apim-Subscription-Key", _subscriptionKey);
            request.Headers.Add("Ocp-Apim-Subscription-Region", _region);

            var response = await _httpClient.SendAsync(request);
            var result = await response.Content.ReadAsStringAsync();

            Console.WriteLine("🔍 Translator raw response:");
            Console.WriteLine(result); // <- this is what I need to see

            try
            {
                var json = JArray.Parse(result);
                var translatedText = json[0]["translations"]?[0]?["text"]?.ToString();
                return translatedText ?? "(no translation)";
            }
            catch (Exception ex)
            {
                Console.WriteLine("Translation parsing failed: " + ex.Message);
                return "(translation error)";
            }
        }


    }
}
