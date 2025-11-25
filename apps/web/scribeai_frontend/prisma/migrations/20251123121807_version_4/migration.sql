/*
  Warnings:

  - You are about to drop the column `startedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `stoppedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `transcriptUrl` on the `Session` table. All the data in the column will be lost.
  - The primary key for the `TranscriptSegment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `endMs` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `isFinal` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `seq` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `speaker` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `startMs` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `TranscriptSegment` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionId]` on the table `TranscriptSegment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "TranscriptSegment" DROP CONSTRAINT "TranscriptSegment_sessionId_fkey";

-- DropIndex
DROP INDEX "TranscriptSegment_sessionId_seq_idx";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "startedAt",
DROP COLUMN "state",
DROP COLUMN "stoppedAt",
DROP COLUMN "summary",
DROP COLUMN "title",
DROP COLUMN "transcriptUrl",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "token" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "createdAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TranscriptSegment" DROP CONSTRAINT "TranscriptSegment_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "endMs",
DROP COLUMN "id",
DROP COLUMN "isFinal",
DROP COLUMN "seq",
DROP COLUMN "speaker",
DROP COLUMN "startMs",
DROP COLUMN "text";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ALTER COLUMN "name" DROP NOT NULL;

-- DropEnum
DROP TYPE "SessionState";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RecordingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptSegment_sessionId_key" ON "TranscriptSegment"("sessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingSession" ADD CONSTRAINT "RecordingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RecordingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
