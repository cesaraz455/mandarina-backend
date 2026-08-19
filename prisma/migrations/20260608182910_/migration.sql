/*
  Warnings:

  - Made the column `created_at` on table `user_otps` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user_auth_accounts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_otps" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;
