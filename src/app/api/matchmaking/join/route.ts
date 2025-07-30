import { addToQueue, cleanupOldEntries } from "@/lib/matchmaking";
import { NextRequest, NextResponse } from "next/server";

type PlayerData = {
  playerName: string;
  skillLevel: number;
};

type ChatRequest = {
  playerId: string;
  playerData: PlayerData;
};
export async function POST(req: NextRequest) {
  try {
    const { playerId, playerData }: ChatRequest = await req.json();

    if (!playerId || !playerData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Clean up old entries before adding new ones
    await cleanupOldEntries();

    // Add player to queue
    const result = await addToQueue(playerId, playerData);

    return NextResponse.json(
      {
        success: true,
        message: "Added to matchmaking queue",
        playerId: result.playerId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining queue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
