using AzureAICognitiveServicesAPI.Data;
using AzureAICognitiveServicesAPI.Hubs;
using AzureAICognitiveServicesAPI.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<TranslatorService>();
builder.Services.AddSingleton<SpeechService>();
builder.Services.AddHttpClient<AzureLanguageService>();
builder.Services.AddSignalR();



builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ...existing code...

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(
                "http://localhost:4200", // For local development
                "https://icy-bay-07412650f.6.azurestaticapps.net" // Azure Static Web Apps URL
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger", false))
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        // Set Swagger UI at the app's root
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
        options.RoutePrefix = "swagger";
    });

}
else
{
    // Only add this root endpoint if Swagger UI is not at the root
    app.MapGet("/", () => "ChatnGo API is running!");
}
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.UseCors("AllowFrontend");

app.MapHub<MessageHub>("/hub/messages");

app.Run();
