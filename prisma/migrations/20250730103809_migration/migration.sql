-- CreateTable
CREATE TABLE "public"."MatchmakingQueue" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "skillLevel" INTEGER NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'searching',
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedAt" TIMESTAMP(3),

    CONSTRAINT "MatchmakingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchmakingQueue_playerId_key" ON "public"."MatchmakingQueue"("playerId");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_status_skillLevel_createdAt_idx" ON "public"."MatchmakingQueue"("status", "skillLevel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchId_key" ON "public"."Match"("matchId");

-- CreateIndex
CREATE INDEX "Match_matchId_idx" ON "public"."Match"("matchId");
