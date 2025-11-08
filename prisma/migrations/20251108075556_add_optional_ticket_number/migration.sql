/*
  Warnings:

  - A unique constraint covering the columns `[ticketNumber]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "ticketNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "public"."tickets"("ticketNumber");
