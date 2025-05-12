using AzureAICognitiveServicesAPI.Data;
using AzureAICognitiveServicesAPI.Hubs;
using AzureAICognitiveServicesAPI.Models;
using AzureAICognitiveServicesAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.CognitiveServices.Speech.Transcription;
using Microsoft.EntityFrameworkCore;

namespace AzureAICognitiveServicesAPI.Controllers
{
    [ApiController]
    [Route("messages")]
    public class MessageController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TranslatorService _translator;
        private readonly SpeechService _speechService;
        private readonly IHubContext<MessageHub> _hub;

        public MessageController(AppDbContext context, TranslatorService translator, SpeechService speechService, IHubContext<MessageHub> hub)
        {
            _context = context;
            _translator = translator;
            _speechService = speechService;
            _hub = hub;
        }

        //Get: /messages/received/{username}
        [HttpGet("received/{username}")]
        public async Task<IActionResult> GetReceivedMessages(string username, int skip = 0, int take = 50)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
                return NotFound("User not found.");

            var messages = await _context.MessageDeliveries
                .Include(md => md.Message)
                .ThenInclude(m => m.Sender)
                .Where(md => md.RecipientId == user.ID)
                .OrderBy(md => md.Message.Timestamp)
                .Select(md => new
                {
                    SenderUsername = md.Message.Sender.Username,
                    OriginalText = md.Message.OriginalText,
                    TranslatedText = md.TranslatedText,
                    Timestamp = DateTime.SpecifyKind(md.Message.Timestamp, DateTimeKind.Utc),
                    audioContent = md.AudioBase64
                })
                .ToListAsync();

            return Ok(messages);
        }
        // POST: /messages/send
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] MessageSendRequest request)
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.SenderUsername);
            if (sender == null)
            {
                return NotFound("Sender not found.");
            }

            // Save the original message
            var message = new Message
            {
                SenderID = sender.ID,
                OriginalText = request.OriginalText,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            // Translate and deliver to all users, including the sender
            var allUsers = await _context.Users.ToListAsync();
            foreach (var user in allUsers)
            {
                var translatedText = await _translator.TranslateTextAsync(request.OriginalText, user.LanguageCode);
                var delivery = new MessageDelivery
                {
                    MessageId = message.ID,
                    RecipientId = user.ID,
                    TranslatedText = translatedText,
                };
                _context.MessageDeliveries.Add(delivery);
            }

            await _context.SaveChangesAsync();

            // SignalR real-time broadcast to all clients
            Console.WriteLine("📢 Broadcasting to SignalR...");
            foreach (var user in allUsers)
            {
                var delivery = await _context.MessageDeliveries
                    .FirstOrDefaultAsync(md => md.MessageId == message.ID && md.RecipientId == user.ID);

                await _hub.Clients.Group(user.Username).SendAsync("ReceiveMessage", new
                {
                    sender = sender.Username,
                    originalText = message.OriginalText,
                    translatedText = delivery?.TranslatedText,
                    timestamp = message.Timestamp
                });
            }
            Console.WriteLine("Broadcast sent.");

            return Ok(new { message = "Message sent and delivered to all users." });
        }

        // POST : /messages/send-audio
        [HttpPost("send-audio")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SendAudio([FromForm] MessageAudioRequest request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest("Audio file is required.");

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.SenderUsername);
            if (sender == null)
                return NotFound("Sender not found.");

            var tempFilePath = Path.GetTempFileName();
            using (var stream = System.IO.File.Create(tempFilePath))
            {
                await request.File.CopyToAsync(stream);
            }

            // Save the original message
            var message = new Message
            {
                SenderID = sender.ID,
                OriginalText = "",
                Timestamp = DateTime.UtcNow
            };
            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var allUsers = await _context.Users.ToListAsync();
            var audioResults = new List<(string Username, string LanguageCode, byte[] Audio)>();

            foreach (var user in allUsers)
            {
                // Skip the sender for translation, but keep the original for sender
                if (user.ID == sender.ID)
                    continue;

                var audioData = await _speechService.TranslateAndSpeakAsync(tempFilePath, user.LanguageCode);
                var translatedText = $"(Audio in {user.LanguageCode})";

                _context.MessageDeliveries.Add(new MessageDelivery
                {
                    MessageId = message.ID,
                    RecipientId = user.ID,
                    TranslatedText = translatedText,
                    AudioBase64 = Convert.ToBase64String(audioData) // Save audio
                });


                audioResults.Add((user.Username, user.LanguageCode, audioData));
            }

            // Also add the original message for the sender (so it stays in their chat)
            _context.MessageDeliveries.Add(new MessageDelivery
            {
                MessageId = message.ID,
                RecipientId = sender.ID,
                TranslatedText = "(speech input)",
                AudioBase64 = Convert.ToBase64String(await System.IO.File.ReadAllBytesAsync(tempFilePath))
            });

            await _context.SaveChangesAsync();
            

            //Console.WriteLine("📢 Broadcasting audio...");
            //await _hub.Clients.All.SendAsync("ReceiveMessage", new
            //{
            //    sender = sender.Username,
            //    text = "(speech input)",
            //    timestamp = message.Timestamp,
            //    recipients = allUsers.Select(u => new { username = u.Username, language = u.LanguageCode })
            //});

            // Send translated audio to recipients
            foreach (var (username, language, audioData) in audioResults)
            {
                var base64Audio = Convert.ToBase64String(audioData);

                await _hub.Clients.Group(username).SendAsync("ReceiveAudioMessage", new
                {
                    sender = sender.Username,
                    audio = base64Audio,
                    timestamp = message.Timestamp,
                    language = language,
                    localId = request.LocalId // Echo back localId if present
                });
            }

            // Send the original audio back to the sender so it stays in their chat
            if (!string.IsNullOrEmpty(request.LocalId))
            {
                var originalAudio = await System.IO.File.ReadAllBytesAsync(tempFilePath);
                var base64OriginalAudio = Convert.ToBase64String(originalAudio);

                await _hub.Clients.Group(sender.Username).SendAsync("ReceiveAudioMessage", new
                {
                    sender = sender.Username,
                    audio = base64OriginalAudio,
                    timestamp = message.Timestamp,
                    language = sender.LanguageCode,
                    localId = request.LocalId
                });
            }
            System.IO.File.Delete(tempFilePath);
            return Ok(new { message = "Audio message delivered — translated only to recipients." });
        }


        //[HttpPost("test-audio")]
        //[Consumes("multipart/form-data")]
        //public async Task<IActionResult> TestAudio([FromForm] MessageAudioRequest request)
        //{
        //    if (request.File == null || request.File.Length == 0)
        //        return BadRequest("No audio file provided.");

        //    var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.SenderUsername);
        //    if (sender == null)
        //        return NotFound("Sender not found.");

        //    var receiver = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.ReceiverUsername);
        //    if (receiver == null)
        //        return NotFound("Receiver not found.");

        //    var tempFile = Path.GetTempFileName();
        //    using (var fs = System.IO.File.Create(tempFile))
        //    {
        //        await request.File.CopyToAsync(fs);
        //    }

        //    var audioData = await _speechService.TranslateAndSpeakAsync(tempFile, receiver.LanguageCode);

        //    System.IO.File.Delete(tempFile);

        //    if (audioData.Length == 0)
        //        return BadRequest("Translation or synthesis failed.");

        //    return File(audioData, "audio/wav");
        //}




    }
}
