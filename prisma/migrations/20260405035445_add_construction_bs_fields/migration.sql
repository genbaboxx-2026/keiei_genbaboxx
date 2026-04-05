-- AlterTable
ALTER TABLE "balance_sheets" ADD COLUMN     "advances_received" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "allowance_for_bad_debt" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "building_equipment" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "wip_construction" BIGINT NOT NULL DEFAULT 0;
