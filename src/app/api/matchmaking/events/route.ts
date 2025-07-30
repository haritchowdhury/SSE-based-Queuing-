import { NextRequest } from "next/server";
import {
  findMatch,
  getQueuePosition,
  removeFromQueue,
} from "@/lib/matchmaking";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  console.log("player id", playerId);

  if (!playerId) {
    return new Response(JSON.stringify({ error: "Missing playerId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(
        `data: ${JSON.stringify({ type: "connected", playerId })}\n\n`
      );

      let matchFound = false;
      let intervalId: NodeJS.Timeout;
      let heartbeatInterval: NodeJS.Timeout;
      let isClosed = false;

      const safeEnqueue = (data: string) => {
        if (!isClosed) {
          try {
            controller.enqueue(data);
          } catch (error) {
            console.warn("Controller already closed, stopping operations");
            isClosed = true;
            clearInterval(intervalId);
            clearInterval(heartbeatInterval);
          }
        }
      };

      const closeStream = () => {
        if (!isClosed) {
          isClosed = true;
          clearInterval(intervalId);
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch (error) {
            // Controller might already be closed
          }
        }
      };

      const checkForMatch = async () => {
        if (isClosed) return;
        
        try {
          const matchResult = await findMatch(playerId);

          if (matchResult.matched) {
            matchFound = true;
            safeEnqueue(
              `data: ${JSON.stringify({
                type: "match_found",
                matchId: matchResult.matchId,
                opponent: matchResult.opponent,
              })}\n\n`
            );
            closeStream();
          } else if (matchResult.status === "not_found") {
            // Player not in queue anymore
            safeEnqueue(
              `data: ${JSON.stringify({
                type: "error",
                message: "Player not found in queue",
              })}\n\n`
            );
            closeStream();
          } else {
            // Still searching - send queue position update
            const queueInfo = await getQueuePosition(playerId);
            safeEnqueue(
              `data: ${JSON.stringify({
                type: "searching",
                position: queueInfo.position,
                total: queueInfo.total,
                waitTime: queueInfo.waitTime,
              })}\n\n`
            );
          }
        } catch (error) {
          console.error("Error checking for match:", error);
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "error",
              message: "Server error",
            })}\n\n`
          );
          closeStream();
        }
      };

      // Check for matches every 2 seconds
      intervalId = setInterval(checkForMatch, 2000);

      // Initial check
      checkForMatch();

      // Keep connection alive with heartbeat
      heartbeatInterval = setInterval(() => {
        safeEnqueue(`: heartbeat\n\n`);
      }, 30000); // Every 30 seconds
    },

    cancel() {
      // Cleanup when client disconnects
      // Note: We can't access intervalId here, so cleanup is handled in start()
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
