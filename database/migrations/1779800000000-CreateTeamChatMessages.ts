import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamChatMessages1779800000000 implements MigrationInterface {
  name = 'CreateTeamChatMessages1779800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team_chat_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "game_room_id" uuid NOT NULL,
        "sender_user_id" uuid NOT NULL,
        "client_message_id" uuid,
        "content" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_chat_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_chat_messages_game_room_id" FOREIGN KEY ("game_room_id") REFERENCES "game_rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_team_chat_messages_sender_user_id" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_team_chat_messages_room_client_id" UNIQUE ("game_room_id", "client_message_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_team_chat_messages_room_created_at" ON "team_chat_messages" ("game_room_id", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."idx_team_chat_messages_room_created_at"');
    await queryRunner.query('DROP TABLE "team_chat_messages"');
  }
}
