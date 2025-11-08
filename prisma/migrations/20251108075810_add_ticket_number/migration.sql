/*
  Warnings:

  - You are about to drop the column `ticketNumber` on the `tickets` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tickets_ticketNumber_key";

-- AlterTable
ALTER TABLE "public"."tickets" DROP COLUMN "ticketNumber";
