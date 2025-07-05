using AzureAICognitiveServicesAPI.Data;
using AzureAICognitiveServicesAPI.Hubs;
using AzureAICognitiveServicesAPI.Models;
using AzureAICognitiveServicesAPI.Models.DTO;
using AzureAICognitiveServicesAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
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

        // POST: /messages/send
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] MessageSendRequest request)
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.SenderUsername);
            if (sender == null)
            {
                return NotFound("Sender not found.");
            }


            var chatGuid = request.ChatId;


            var chat = await _context.Chats
                .Include(c => c.Participants)
                .ThenInclude(cp => cp.User)
                .FirstOrDefaultAsync(c => c.ID == chatGuid);

            if (chat == null || !chat.Participants.Any(p => p.UserId == sender.ID))
            {
                return BadRequest("Chat not found or sender is not a participant.");
            }

            // Create and save the message
            var message = new Message
            {
                ChatId = chat.ID,
                SenderId = sender.ID,
                Content = request.Content,
                Type = MessageType.Text,
                SentAt = DateTime.UtcNow,
                IsFromBot = false
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var deliveryList = new List<MessageDelivery>();

            var deliveryTasks = chat.Participants.Select(async participant =>
            {
                var recipient = participant.User;

                await Task.Delay(250); // 250ms = 4 req/sec max

                var translatedText = await _translator.TranslateTextAsync(request.Content, recipient.LanguageCode);

                var delivery = new MessageDelivery
                {
                    MessageId = message.ID,
                    RecipientId = recipient.ID,
                    TranslatedText = translatedText
                };

                lock (deliveryList)
                {
                    deliveryList.Add(delivery);
                }

                // Send to SignalR group with chat ID
                await _hub.Clients.Group(recipient.Username).SendAsync("ReceiveMessage", new
                {
                    senderUsername = sender.Username,
                    originalText = request.Content,
                    translatedText = translatedText,
                    timestamp = message.SentAt,
                    chatId = request.ChatId
                });
            });

            await Task.WhenAll(deliveryTasks);

            _context.MessageDeliveries.AddRange(deliveryList);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Message sent and translated to all participants." });
        }

        [HttpPost("send-audio")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SendAudio([FromForm] AudioMessageRequest request)
        {
            try
            {
                Console.WriteLine($"Received audio request from: {request.SenderUsername}");
                Console.WriteLine($"Chat ID: {request.ChatId}");
                Console.WriteLine($"File size: {request.File?.Length ?? 0} bytes");

                if (request.File == null || request.File.Length == 0)
                    return BadRequest("Audio file is required.");

                var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.SenderUsername);
                if (sender == null)
                    return NotFound("Sender not found.");

                // Parse ChatId as Guid
                if (!Guid.TryParse(request.ChatId, out var chatGuid))
                {
                    return BadRequest("Invalid chat ID format.");
                }

                var chat = await _context.Chats
                    .Include(c => c.Participants)
                    .ThenInclude(cp => cp.User)
                    .FirstOrDefaultAsync(c => c.ID == chatGuid);

                if (chat == null || !chat.Participants.Any(p => p.UserId == sender.ID))
                {
                    return BadRequest("Chat not found or sender is not a participant.");
                }

                // Save file to disk
                var tempFilePath = Path.GetTempFileName();
                try
                {
                    using (var stream = System.IO.File.Create(tempFilePath))
                    {
                        await request.File.CopyToAsync(stream);
                    }

                    // Get original speech-to-text for sender's language
                    TranslationResult senderSpeechResult = null;
                    try
                    {
                        senderSpeechResult = await _speechService.TranslateAndSpeakAsync(tempFilePath, sender.LanguageCode);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Speech recognition failed: {ex.Message}");
                        // Fallback: use original audio
                        var originalAudioBytes = await System.IO.File.ReadAllBytesAsync(tempFilePath);
                        senderSpeechResult = new TranslationResult
                        {
                            RecognizedText = "(Speech recognition failed)",
                            TranslatedText = "(Speech recognition failed)",
                            TranslatedAudio = originalAudioBytes
                        };
                    }

                    // Create and save the message
                    var message = new Message
                    {
                        ID = Guid.NewGuid(),
                        ChatId = chat.ID,
                        SenderId = sender.ID,
                        Content = senderSpeechResult.RecognizedText ?? "(Audio Message)",
                        Type = MessageType.Audio,
                        SentAt = DateTime.UtcNow,
                        IsFromBot = false
                    };

                    _context.Messages.Add(message);
                    await _context.SaveChangesAsync();

                    var deliveryList = new List<MessageDelivery>();

                    // Process each chat participant
                    var deliveryTasks = chat.Participants.Select(async participant =>
                    {
                        var recipient = participant.User;

                       // await Task.Delay(250); // Rate limiting

                        TranslationResult result = null;
                        try
                        {
                            if (recipient.ID == sender.ID)
                            {
                                // For sender, use original result
                                result = senderSpeechResult;
                            }
                            else
                            {
                                // For others, translate to their language
                                result = await _speechService.TranslateAndSpeakAsync(tempFilePath, recipient.LanguageCode);
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Translation failed for user {recipient.Username}: {ex.Message}");
                            // Fallback: provide original audio and text
                            var originalAudioBytes = await System.IO.File.ReadAllBytesAsync(tempFilePath);
                            result = new TranslationResult
                            {
                                RecognizedText = senderSpeechResult.RecognizedText ?? "(Audio Message)",
                                TranslatedText = "(Translation failed)",
                                TranslatedAudio = originalAudioBytes
                            };
                        }

                        var delivery = new MessageDelivery
                        {
                            ID = Guid.NewGuid(),
                            MessageId = message.ID,
                            RecipientId = recipient.ID,
                            TranslatedText = result.TranslatedText ?? "(no translation)",
                            AudioBase64 = Convert.ToBase64String(result.TranslatedAudio ?? Array.Empty<byte>())
                        };

                        lock (deliveryList)
                        {
                            deliveryList.Add(delivery);
                        }

                        // Send to SignalR
                        var base64Audio = Convert.ToBase64String(result.TranslatedAudio ?? Array.Empty<byte>());
                        await _hub.Clients.Group(recipient.Username).SendAsync("ReceiveAudioMessage", new
                        {
                            sender = sender.Username,
                            audio = base64Audio,
                            translatedText = result.TranslatedText ?? "(no translation)",
                            timestamp = message.SentAt,
                            language = recipient.LanguageCode,
                            chatId = request.ChatId,
                            localId = request.LocalId
                        });
                    });

                    await Task.WhenAll(deliveryTasks);

                    _context.MessageDeliveries.AddRange(deliveryList);
                    await _context.SaveChangesAsync();

                    return Ok(new { message = "Audio message delivered, translated for recipients." });
                }
                finally
                {
                    // Clean up temp file
                    if (System.IO.File.Exists(tempFilePath))
                    {
                        System.IO.File.Delete(tempFilePath);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SendAudio: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpGet("chat/{chatId}")]
        public async Task<IActionResult> GetMessagesInChat(Guid chatId, [FromQuery] string username, int skip = 0, int take = 50)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
                return NotFound("User not found.");

            // Ensure the user is a participant in the chat
            var isParticipant = await _context.ChatParticipants
                .AnyAsync(cp => cp.ChatId == chatId && cp.UserId == user.ID);

            if (!isParticipant)
                return Forbid("User is not a participant in this chat.");

            // Get the delivered messages for this chat and this user
            var deliveries = await _context.MessageDeliveries
                .Include(md => md.Message)
                    .ThenInclude(m => m.Sender)
                .Where(md => md.RecipientId == user.ID && md.Message.ChatId == chatId)
                .OrderByDescending(md => md.Message.SentAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            var result = deliveries.Select(md => new
            {
                messageId = md.Message.ID,
                senderUsername = md.Message.Sender.Username,
                content = md.Message.Content,
                originalText = md.Message.Content,
                translatedText = md.TranslatedText,
                audioContent = md.AudioBase64,
                type = md.Message.Type,
                timestamp = md.Message.SentAt,
                isFromBot = md.Message.IsFromBot
            }).Reverse(); // Reverse to get chronological order

            return Ok(result);
        }
    }
}