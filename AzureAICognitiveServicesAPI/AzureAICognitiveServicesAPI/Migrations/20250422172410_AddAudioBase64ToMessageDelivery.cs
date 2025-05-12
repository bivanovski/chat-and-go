using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzureAICognitiveServicesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAudioBase64ToMessageDelivery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AudioBase64",
                table: "MessageDeliveries",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AudioBase64",
                table: "MessageDeliveries");
        }
    }
}
