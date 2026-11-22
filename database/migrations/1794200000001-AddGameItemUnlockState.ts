import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameItemUnlockState1794200000001 implements MigrationInterface {
  name = 'AddGameItemUnlockState1794200000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_room_items"
        ADD COLUMN "active_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN "unlock_reason" text,
        ADD COLUMN "unlocked_at" timestamptz,
        ADD CONSTRAINT "chk_game_room_items_active_count_nonnegative"
          CHECK ("active_count" >= 0)
    `);
    await queryRunner.query(`
      UPDATE "game_room_items"
         SET "unlock_reason" = 'LEGACY_STARTING_ITEM',
             "unlocked_at" = COALESCE("unlocked_at", "created_at")
       WHERE "quantity" > 0 OR "used_count" > 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_room_items"
        DROP CONSTRAINT "chk_game_room_items_active_count_nonnegative",
        DROP COLUMN "unlocked_at",
        DROP COLUMN "unlock_reason",
        DROP COLUMN "active_count"
    `);
  }
}
