using AzureAICognitiveServicesAPI.Data;
using AzureAICognitiveServicesAPI.Models;
using AzureAICognitiveServicesAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AzureAICognitiveServicesAPI.Controllers
{
    [ApiController]
    [Route("users")]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserController(AppDbContext context)
        {
            _context = context;
        }

        // GET: /users
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.ID, u.Username, u.LanguageCode })
                .ToListAsync();

            return Ok(users);
        }

        // GET: /users/{username}
        [HttpGet("{username}")]
        public async Task<IActionResult> GetUserByUsername(string username)
        {
            var user = await _context.Users
                .Where(u => u.Username == username)
                .Select(u => new { u.ID, u.Username, u.LanguageCode })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound("User not found.");

            return Ok(user);
        }

        // GET: /users/languages/azure
        [HttpGet("languages/azure")]
        public async Task<IActionResult> GetAzureLanguages([FromServices] AzureLanguageService azureLanguageService)
        {
            var languages = await azureLanguageService.GetSupportedLanguagesAsync();
            return Ok(languages);
        }

        // POST: /users/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (existingUser != null)
                return BadRequest("Username already exists.");

            var newUser = new User
            {
                ID = Guid.NewGuid(),
                Username = request.Username,
                Password = request.Password,
                LanguageCode = request.LanguageCode,
                //RegisteredAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful", newUser.Username, newUser.LanguageCode });
        }

        // POST: /users/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest loginData)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == loginData.Username && u.Password == loginData.Password);

            if (user == null)
                return Unauthorized("Invalid username or password.");

            return Ok(new { message = "Login successful", user.Username, user.LanguageCode });
        }

        // PUT: /users/update-lang
        [HttpPut("update-lang")]
        public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null)
                return NotFound("User not found.");

            user.LanguageCode = request.LanguageCode;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Language updated successfully", user.Username, user.LanguageCode });
        }

        // DELETE: /users/dev/clear-all (for dev only)
        [HttpDelete("dev/clear-all")]
        public async Task<IActionResult> ClearAll()
        {
            _context.Messages.RemoveRange(_context.Messages);
            _context.ChatParticipants.RemoveRange(_context.ChatParticipants);
            _context.Chats.RemoveRange(_context.Chats);
            _context.Users.RemoveRange(_context.Users);

            await _context.SaveChangesAsync();

            return Ok("All users and chat history cleared.");
        }
    }
}
