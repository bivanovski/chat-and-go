using Microsoft.AspNetCore.SignalR;

namespace AzureAICognitiveServicesAPI.Hubs
{
    public class MessageHub : Hub
    {
        private const string GroupName = "global-chat";

        public override async Task OnConnectedAsync()
        {
            var username = Context.GetHttpContext()?.Request.Query["username"];
            if (!string.IsNullOrEmpty(username))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, username);
                Console.WriteLine($"✅ {username} joined group '{username}'");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var username = Context.GetHttpContext()?.Request.Query["username"];
            if (!string.IsNullOrEmpty(username))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, username);
            }
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessageToGroup(object message)
        {
            await Clients.Group(GroupName).SendAsync("ReceiveMessage", message);
        }

        public async Task UserTyping(bool isTyping)
        {
            var username = Context.GetHttpContext()?.Request.Query["username"].ToString();
            if (!string.IsNullOrEmpty(username))
            {
                await Clients.Others.SendAsync("UpdateTypingStatus", username, isTyping);
            }
        }
    }
}
