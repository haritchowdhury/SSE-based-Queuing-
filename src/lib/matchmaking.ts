import db from "@/lib/db/db";

type PlayerData = {
  playerName: string;
  skillLevel: number;
};

export const addToQueue = async (playerId: string, playerData: PlayerData) => {
  try {
    // Remove any existing entries for this player first
    await db.matchmakingQueue.deleteMany({
      where: { playerId },
    });

    // Add player to queue
    return await db.matchmakingQueue.create({
      data: {
        playerId,
        playerName: playerData.playerName,
        skillLevel: playerData.skillLevel || 1000,
        status: "searching",
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error adding to queue:", error);
    throw error;
  }
};

export const findMatch = async (playerId: string) => {
  try {
    const player = await db.matchmakingQueue.findUnique({
      where: { playerId },
    });

    if (!player) {
      return { matched: false, status: "not_found" };
    }

    // If player is already matched, find and return the existing match
    if (player.status === "matched" && player.matchId) {
      const existingMatch = await db.match.findUnique({
        where: { matchId: player.matchId },
      });

      if (existingMatch) {
        // Determine which player is the opponent
        const opponentId = existingMatch.player1Id === playerId 
          ? existingMatch.player2Id 
          : existingMatch.player1Id;
        
        const opponent = await db.matchmakingQueue.findUnique({
          where: { playerId: opponentId },
        });

        return {
          matched: true,
          matchId: existingMatch.id,
          opponent: opponent ? {
            playerId: opponent.playerId,
            playerName: opponent.playerName,
            skillLevel: opponent.skillLevel,
          } : null,
        };
      }
    }

    if (player.status !== "searching") {
      return { matched: false, status: player.status };
    }

    // Use transaction to atomically create matches
    const result = await db.$transaction(async (tx) => {
      // Look for opponent within skill range and within last 2 minutes
      const skillRange = 200;
      const timeLimit = new Date(Date.now() - 2 * 60 * 1000);

      const opponent = await tx.matchmakingQueue.findFirst({
        where: {
          playerId: { not: playerId },
          status: "searching",
          skillLevel: {
            gte: player.skillLevel - skillRange,
            lte: player.skillLevel + skillRange,
          },
          createdAt: { gte: timeLimit },
        },
        orderBy: {
          createdAt: "asc", // FIFO matching
        },
      });

      if (!opponent) {
        return { matched: false, status: "searching" };
      }

      // Use deterministic ordering to prevent race conditions
      // Only the player with lexicographically smaller ID creates the match
      const shouldCreateMatch = playerId < opponent.playerId;
      
      if (!shouldCreateMatch) {
        // This player shouldn't create the match, just return searching
        // The other player will create it and this player will find it on next poll
        return { matched: false, status: "searching" };
      }

      // Create match ID deterministically based on both player IDs
      const sortedIds = [playerId, opponent.playerId].sort();
      const matchId = `match_${sortedIds[0]}_${sortedIds[1]}_${Date.now()}`;

      // Atomically update both players and create match
      const updateResult = await tx.matchmakingQueue.updateMany({
        where: {
          playerId: { in: [playerId, opponent.playerId] },
          status: "searching", // Only update if still searching
        },
        data: {
          status: "matched",
          matchId,
          matchedAt: new Date(),
        },
      });

      // If we couldn't update both players, another transaction beat us
      if (updateResult.count !== 2) {
        return { matched: false, status: "searching" };
      }

      // Create the match record
      const duel = await tx.match.create({
        data: {
          matchId,
          player1Id: sortedIds[0], // Consistent ordering
          player2Id: sortedIds[1],
          status: "active",
          startedAt: new Date(),
        },
      });

      return {
        matched: true,
        matchId: duel.id,
        opponent: {
          playerId: opponent.playerId,
          playerName: opponent.playerName,
          skillLevel: opponent.skillLevel,
        },
      };
    });

    return result;
  } catch (error) {
    console.error("Error finding match:", error);
    throw error;
  }
};

export const removeFromQueue = async (playerId: string) => {
  try {
    return await db.matchmakingQueue.deleteMany({
      where: { playerId },
    });
  } catch (error) {
    console.error("Error removing from queue:", error);
    throw error;
  }
};

export const getQueuePosition = async (playerId: string) => {
  try {
    const player = await db.matchmakingQueue.findUnique({
      where: { playerId },
    });

    if (!player) return { position: 0, total: 0 };

    const playersAhead = await db.matchmakingQueue.count({
      where: {
        status: "searching",
        createdAt: { lt: player.createdAt },
      },
    });

    const totalSearching = await db.matchmakingQueue.count({
      where: { status: "searching" },
    });

    return {
      position: playersAhead + 1,
      total: totalSearching,
      waitTime: Date.now() - player.createdAt.getTime(),
    };
  } catch (error) {
    console.error("Error getting queue position:", error);
    return { position: 0, total: 0, waitTime: 0 };
  }
};

// Clean up old entries (call this periodically)
export const cleanupOldEntries = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  try {
    await db.matchmakingQueue.deleteMany({
      where: {
        createdAt: { lt: fiveMinutesAgo },
        status: "searching",
      },
    });
  } catch (error) {
    console.error("Error cleaning up old entries:", error);
  }
};
