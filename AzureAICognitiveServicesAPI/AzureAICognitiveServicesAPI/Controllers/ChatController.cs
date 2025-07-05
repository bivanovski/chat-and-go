using AzureAICognitiveServicesAPI.Data;
using AzureAICognitiveServicesAPI.Models;
using AzureAICognitiveServicesAPI.Models.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AzureAICognitiveServicesAPI.Controllers
{
    [ApiController]
    [Route("chats")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        // POST: /chats
        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] CreateChatRequest request)
        {
            // Get current user from request instead of hardcoding
            if (string.IsNullOrEmpty(request.CurrentUserUsername))
                return BadRequest("Current user must be specified.");

            if (request.ParticipantUsernames == null || !request.ParticipantUsernames.Any())
                return BadRequest("At least one participant is required.");

            if (!request.IsGroup && request.ParticipantUsernames.Count != 1)
                return BadRequest("1-on-1 chats must have exactly one other participant.");

            // Include current user in the participant list
            var allUsernames = new List<string>(request.ParticipantUsernames) { request.CurrentUserUsername };

            var users = await _context.Users
                .Where(u => allUsernames.Contains(u.Username))
                .ToListAsync();

            if (users.Count != allUsernames.Distinct().Count())
                return BadRequest("One or more usernames not found.");

            // Check if private chat already exists between these users
            if (!request.IsGroup && request.ParticipantUsernames.Count == 1)
            {
                var existingChat = await _context.Chats
                    .Include(c => c.Participants)
                    .Where(c => !c.IsGroup && c.Participants.Count == 2)
                    .FirstOrDefaultAsync(c =>
                        c.Participants.Any(p => p.User.Username == request.CurrentUserUsername) &&
                        c.Participants.Any(p => p.User.Username == request.ParticipantUsernames[0])
                    );

                if (existingChat != null)
                {
                    return Ok(new
                    {
                        message = "Private chat already exists",
                        chatId = existingChat.ID
                    });
                }
            }

            var chat = new Chat
            {
                ID = Guid.NewGuid(),
                Title = request.Title,
                IsGroup = request.IsGroup,
                CreatedAt = DateTime.UtcNow
            };

            _context.Chats.Add(chat);

            foreach (var user in users)
            {
                _context.ChatParticipants.Add(new ChatParticipant
                {
                    ID = Guid.NewGuid(),
                    ChatId = chat.ID,
                    UserId = user.ID,
                    JoinedAt = DateTime.UtcNow,
                    IsMuted = false,
                    IsBot = false
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = request.IsGroup ? "Group chat created" : "Private chat started",
                chatId = chat.ID
            });
        }

        // GET: /chats/user/{username}
        [HttpGet("user/{username}")]
        public async Task<IActionResult> GetChatsForUser(string username)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound("User not found.");

            var chats = await _context.ChatParticipants
                .Where(cp => cp.UserId == user.ID)
                .Include(cp => cp.Chat)
                .ThenInclude(c => c.Participants)
                .ThenInclude(p => p.User)
                .Select(cp => new
                {
                    id = cp.Chat.ID,
                    title = cp.Chat.Title,
                    isGroup = cp.Chat.IsGroup,
                    createdAt = cp.Chat.CreatedAt,
                    participants = cp.Chat.Participants.Select(p => new
                    {
                        username = p.User.Username,
                        languageCode = p.User.LanguageCode
                    }).ToList()
                })
                .ToListAsync();

            return Ok(chats);
        }

        // POST: /chats/add-user
        [HttpPost("add-user")]
        public async Task<IActionResult> AddUserToChat([FromBody] AddUserToChatRequest request)
        {
            var chatExists = await _context.Chats.AnyAsync(c => c.ID == request.ChatId);
            if (!chatExists)
                return BadRequest("Chat not found.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null)
                return BadRequest("User not found.");

            var alreadyInChat = await _context.ChatParticipants
                .AnyAsync(cp => cp.ChatId == request.ChatId && cp.UserId == user.ID);

            if (alreadyInChat)
                return BadRequest("User is already in the chat.");

            var newParticipant = new ChatParticipant
            {
                ID = Guid.NewGuid(),
                ChatId = request.ChatId,
                UserId = user.ID,
                JoinedAt = DateTime.UtcNow,
                IsMuted = false,
                IsBot = false
            };

            _context.ChatParticipants.Add(newParticipant);
            await _context.SaveChangesAsync();

            return Ok("User added to chat.");
        }

        [HttpGet("{chatId}/participants")]
        public async Task<IActionResult> GetChatParticipants(Guid chatId)
        {
            var participants = await _context.ChatParticipants
                .Where(cp => cp.ChatId == chatId)
                .Include(cp => cp.User)
                .Select(cp => new
                {
                    id = cp.User.ID,
                    username = cp.User.Username,
                    languageCode = cp.User.LanguageCode,
                    joinedAt = cp.JoinedAt,
                    isMuted = cp.IsMuted,
                    isBot = cp.IsBot
                })
                .ToListAsync();

            if (participants.Count == 0)
                return NotFound("No participants found or chat does not exist.");

            return Ok(participants);
        }
    }
}