using Microsoft.EntityFrameworkCore;
using AzureAICognitiveServicesAPI.Models;

namespace AzureAICognitiveServicesAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } // Table for users
        public DbSet<Message> Messages { get; set; } // Table for messages
        public DbSet<MessageDelivery> MessageDeliveries { get; set; } // Table for message deliveries

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasMany(u => u.SentMessages)
                .WithOne(m => m.Sender)
                .HasForeignKey(m => m.SenderID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasMany(u => u.ReceivedDeliveries)
                .WithOne(md => md.Recipient)
                .HasForeignKey(md => md.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Message>()
                .HasMany(m => m.Deliveries)
                .WithOne(md => md.Message)
                .HasForeignKey(md => md.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        }

    }
}
