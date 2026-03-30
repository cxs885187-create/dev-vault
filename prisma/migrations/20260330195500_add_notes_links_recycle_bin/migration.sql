-- CreateEnum
CREATE TYPE "NoteLinkTargetType" AS ENUM ('NOTE', 'TERM', 'SNIPPET', 'PROJECT', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Term" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Snippet" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectAnalysis" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteLink" (
    "id" TEXT NOT NULL,
    "sourceNoteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetType" "NoteLinkTargetType" NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_userId_deletedAt_createdAt_idx" ON "Note"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Note_userId_title_idx" ON "Note"("userId", "title");

-- CreateIndex
CREATE INDEX "NoteLink_sourceNoteId_idx" ON "NoteLink"("sourceNoteId");

-- CreateIndex
CREATE INDEX "NoteLink_targetType_targetId_idx" ON "NoteLink"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Term_userId_deletedAt_createdAt_idx" ON "Term"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Snippet_userId_deletedAt_createdAt_idx" ON "Snippet"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectAnalysis_userId_deletedAt_createdAt_idx" ON "ProjectAnalysis"("userId", "deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
