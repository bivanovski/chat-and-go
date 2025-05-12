using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;
using Microsoft.CognitiveServices.Speech.Translation;

namespace AzureAICognitiveServicesAPI.Services
{
    public class SpeechService
    {
        private readonly string _speechKey;
        private readonly string _region;

        public SpeechService(IConfiguration config)
        {
            _speechKey = config["Speech:Key"] ?? throw new ArgumentNullException(nameof(config), "Speech:Key is not configured.");
            _region = config["Speech:Region"] ?? throw new ArgumentNullException(nameof(config), "Speech:Region is not configured.");
        }

        public async Task<byte[]> TranslateAndSpeakAsync(string filePath, string targetLanguage)
        {
            try
            {
                // Validate input
                if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath))
                    throw new FileNotFoundException("The specified audio file does not exist.", filePath);

                if (string.IsNullOrEmpty(targetLanguage))
                    throw new ArgumentException("Target language must be specified.", nameof(targetLanguage));

                // Configure translation
                var endpoint = new Uri($"wss://{_region}.stt.speech.microsoft.com/speech/universal/v2");
                var speechTranslationConfig = SpeechTranslationConfig.FromEndpoint(endpoint, _speechKey);
                speechTranslationConfig.AddTargetLanguage(targetLanguage);

                var autoDetect = AutoDetectSourceLanguageConfig.FromOpenRange();
                var audioConfig = AudioConfig.FromWavFileInput(filePath);

                // Perform translation
                using var recognizer = new TranslationRecognizer(speechTranslationConfig, autoDetect, audioConfig);
                var result = await recognizer.RecognizeOnceAsync();

                if (result.Reason == ResultReason.TranslatedSpeech &&
                    result.Translations.TryGetValue(targetLanguage, out var translatedText))
                {
                    // Configure speech synthesis
                    var speechConfig = SpeechConfig.FromSubscription(_speechKey, _region);
                    speechConfig.SpeechSynthesisVoiceName = GetVoiceNameForLanguage(targetLanguage);

                    using var synthesizer = new SpeechSynthesizer(speechConfig);
                    var synthesisResult = await synthesizer.SpeakTextAsync(translatedText);

                    if (synthesisResult.Reason == ResultReason.SynthesizingAudioCompleted)
                        return synthesisResult.AudioData;

                    throw new InvalidOperationException("Speech synthesis failed. Reason: " + synthesisResult.Reason);
                }

                throw new InvalidOperationException("Translation failed. Reason: " + result.Reason);
            }
            catch (Exception ex)
            {
                // Log the error (you can replace this with a proper logging framework)
                Console.WriteLine($"Error in TranslateAndSpeakAsync: {ex.Message}");
                throw new ApplicationException("An error occurred while processing the audio translation and synthesis.", ex);
            }
        }

        private string GetVoiceNameForLanguage(string lang) => lang switch
        {
            "af" => "af-ZA-WillemNeural",          // Afrikaans
            "ar" => "ar-SA-ZariyahNeural",         // Arabic (Saudi Arabia)
            "bg" => "bg-BG-BorislavNeural",        // Bulgarian
            "bn" => "bn-BD-PradeepNeural",         // Bangla
            "bs" => "bs-BA-GoranNeural",           // Bosnian
            "ca" => "ca-ES-EnricNeural",           // Catalan (Spain)
            "cs" => "cs-CZ-VlastaNeural",          // Czech
            "da" => "da-DK-ChristelNeural",        // Danish
            "de" => "de-DE-FlorianMultilingualNeural", // German (Germany)
            "el" => "el-GR-AthinaNeural",          // Greek
            "en" => "en-US-AndrewMultilingualNeural", // English (US, Multilingual)
            "es" => "es-ES-IsidoraMultilingualNeural", // Spanish (Spain)
            "et" => "et-EE-AnuNeural",             // Estonian
            "fi" => "fi-FI-NooraNeural",           // Finnish
            "fr" => "fr-FR-JeromeNeural",          // French (France)
            "fil" => "fil-PH-AngeloNeural",        // Filipino
            "gu-IN" => "gu-IN-DhwaniNeural",
            "he" => "he-IL-HilaNeural",            // Hebrew
            "hi" => "hi-IN-MadhurNeural",          // Hindi (India)
            "hr" => "hr-HR-SreckoNeural",          // Croatian
            "hu" => "hu-HU-NoemiNeural",           // Hungarian
            "id" => "id-ID-GadisNeural",           // Indonesian
            "it" => "it-IT-DiegoNeural",           // Italian (Italy)
            "is" => "is-IS-GudrunNeural",          // Icelandic
            "ja" => "ja-JP-NanamiNeural",          // Japanese
            "ko" => "ko-KR-SunHiNeural",           // Korean
            "lt" => "lt-LT-OnaNeural",             // Lithuanian
            "lv" => "lv-LV-EveritaNeural",         // Latvian
            "ms" => "ms-MY-YasminNeural",          // Malay
            "ml-IN" => "ml-IN-SobhanaNeural",      // Malayalam
            "mt" => "mt-MT-GraceNeural",           // Maltese
            "nb" => "nb-NO-PernilleNeural",        // Norwegian Bokmål
            "nl" => "nl-NL-MaartenNeural",         // Dutch (Netherlands)
            "pl" => "pl-PL-ZofiaNeural",           // Polish
            "pt" => "pt-PT-FernandaNeural",        // Portuguese (Portugal)
            "pt-BR" => "pt-BR-FranciscaNeural",    // Portuguese (Brazil)
            "pa" => "pa-IN-OjasNeural",            // Punjabi
            "ro" => "ro-RO-AlinaNeural",           // Romanian
            "ru" => "ru-RU-DariyaNeural",          // Russian
            "sk" => "sk-SK-ViktoriaNeural",        // Slovak
            "sr-LATN" => "sr-Latn-RS-NicholasNeural", // Serbian-Latin
            "sr" => "sr-RS-SophieNeural",          // Serbian-Cyrillic
            "sl" => "sl-SI-PetraNeural",           // Slovenian
            "sv" => "sv-SE-SofieNeural",           // Swedish
            "ta-MY" => "ta-MY-KanilNeural",        // Tamil
            "th" => "th-TH-PremwadeeNeural",       // Thai
            "tr" => "tr-TR-AhmetNeural",           // Turkish
            "uk" => "uk-UA-PolinaNeural",          // Ukrainian
            "vi" => "vi-VN-HoaiMyNeural",          // Vietnamese
            "cy" => "cy-GB-NiaNeural",             // Welsh
            "zh" => "zh-CN-XiaoxiaoNeural",        // Chinese (Mandarin, Mainland)
            "zh-HK" => "zh-HK-HiuGaaiNeural",      // Chinese (Cantonese, Hong Kong)
            "zh-TW" => "zh-TW-HsiaoChenNeural",    // Chinese (Taiwan)
            _ => "en-US-AvaMultilingualNeural"
        };
    }
}
