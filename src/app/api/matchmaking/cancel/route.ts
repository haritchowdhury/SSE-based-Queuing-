import { removeFromQueue } from "@/lib/matchmaking";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { playerId } = await req.json();

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    await removeFromQueue(playerId);

    return NextResponse.json(
      {
        success: true,
        message: "Removed from matchmaking queue",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error canceling matchmaking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
