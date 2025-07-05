using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzureAICognitiveServicesAPI.Migrations
{
    /// <inheritdoc />
    public partial class FixCascadeMessageDelivery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ChatParticipants",
                newName: "ID");

            migrationBuilder.CreateTable(
                name: "MessageDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecipientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TranslatedText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AudioBase64 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserID = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageDeliveries_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageDeliveries_Users_RecipientId",
                        column: x => x.RecipientId,
                        principalTable: "Users",
                        principalColumn: "ID");
                    table.ForeignKey(
                        name: "FK_MessageDeliveries_Users_UserID",
                        column: x => x.UserID,
                        principalTable: "Users",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MessageDeliveries_MessageId",
                table: "MessageDeliveries",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageDeliveries_RecipientId",
                table: "MessageDeliveries",
                column: "RecipientId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageDeliveries_UserID",
                table: "MessageDeliveries",
                column: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MessageDeliveries");

            migrationBuilder.RenameColumn(
                name: "ID",
                table: "ChatParticipants",
                newName: "Id");
        }
    }
}
