using Microsoft.EntityFrameworkCore;
using AzureAICognitiveServicesAPI.Models;

namespace AzureAICognitiveServicesAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Chat> Chats { get; set; }
        public DbSet<ChatParticipant> ChatParticipants { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<MessageDelivery> MessageDeliveries { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ChatParticipant>()
                .HasOne(cp => cp.User)
                .WithMany(u => u.ChatParticipants)
                .HasForeignKey(cp => cp.UserId);

            modelBuilder.Entity<ChatParticipant>()
                .HasOne(cp => cp.Chat)
                .WithMany(c => c.Participants)
                .HasForeignKey(cp => cp.ChatId);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Chat)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ChatId);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.MessagesSent)
                .HasForeignKey(m => m.SenderId);

            modelBuilder.Entity<MessageDelivery>()
                .HasOne(md => md.Recipient)
                .WithMany()
                .HasForeignKey(md => md.RecipientId)
                .OnDelete(DeleteBehavior.NoAction); 

            modelBuilder.Entity<MessageDelivery>()
                .HasOne(md => md.Message)
                .WithMany(m => m.Deliveries)
                .HasForeignKey(md => md.MessageId)
                .OnDelete(DeleteBehavior.Cascade); 
        }
    }
}
