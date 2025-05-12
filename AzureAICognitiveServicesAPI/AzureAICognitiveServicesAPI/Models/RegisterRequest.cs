using System.ComponentModel.DataAnnotations;

namespace AzureAICognitiveServicesAPI.Models
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; }

        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; }

        [Required(ErrorMessage = "Language code is required")]
        public string LanguageCode { get; set; }
    }
}
