import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameRoomRankingRegistration1794200000000 implements MigrationInterface {
  name = 'AddGameRoomRankingRegistration1794200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_rooms"
        ADD COLUMN "ranking_team_name" text,
        ADD COLUMN "ranking_registered_by" uuid,
        ADD COLUMN "ranking_registered_at" timestamptz,
        ADD CONSTRAINT "fk_game_rooms_ranking_registered_by"
          FOREIGN KEY ("ranking_registered_by") REFERENCES "users"("id")
          ON DELETE SET NULL,
        ADD CONSTRAINT "chk_game_rooms_ranking_registration_complete"
          CHECK (
            ("ranking_team_name" IS NULL AND "ranking_registered_at" IS NULL)
            OR
            ("ranking_team_name" IS NOT NULL AND "ranking_registered_at" IS NOT NULL)
          )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_game_rooms_ranking_registered_at"
        ON "game_rooms" ("ranking_registered_at")
        WHERE "ranking_registered_at" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "idx_game_rooms_ranking_registered_at"');
    await queryRunner.query(`
      ALTER TABLE "game_rooms"
        DROP CONSTRAINT "chk_game_rooms_ranking_registration_complete",
        DROP CONSTRAINT "fk_game_rooms_ranking_registered_by",
        DROP COLUMN "ranking_registered_at",
        DROP COLUMN "ranking_registered_by",
        DROP COLUMN "ranking_team_name"
    `);
  }
}
