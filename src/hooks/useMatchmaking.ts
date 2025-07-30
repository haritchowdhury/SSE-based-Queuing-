"use client";
import { useState, useEffect, useRef } from "react";
type PlayerData = {
  playerName: string;
  skillLevel: number;
};

type MatchData = {
  matchId: string;
  opponent: any;
};
export const useMatchmaking = () => {
  const [status, setStatus] = useState("idle"); // idle, searching, matched, error
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [queueInfo, setQueueInfo] = useState({
    position: 0,
    total: 0,
    waitTime: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const startMatchmaking = async (playerData: PlayerData) => {
    try {
      setStatus("searching");
      setError("");
      setMatchData(null);

      // Generate unique player ID
      const playerId = `player_${Date.now()}_${Math.random().toString(36)}`;
      playerIdRef.current = playerId;

      // Join matchmaking queue
      const response = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId,
          playerData: {
            playerName: playerData.playerName || "Anonymous",
            skillLevel: playerData.skillLevel || 1000,
          },
        }),
      });
      console.log(JSON.stringify(response));
      if (!response.ok) {
        throw new Error("Failed to join matchmaking queue");
      }

      // Start SSE connection
      const eventSource = new EventSource(
        `/api/matchmaking/events?playerId=${playerId}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            console.log("Connected to matchmaking server");
            break;

          case "searching":
            setQueueInfo({
              position: data.position,
              total: data.total,
              waitTime: data.waitTime,
            });
            break;

          case "match_found":
            setStatus("matched");
            setMatchData({
              matchId: data.matchId,
              opponent: data.opponent,
            });
            eventSource.close();
            break;

          case "error":
            setError(data.message);
            setStatus("error");
            eventSource.close();
            break;
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        setError("Connection lost");
        setStatus("error");
        eventSource.close();
      };
    } catch (error) {
      console.error("Error starting matchmaking:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      setStatus("error");
    }
  };

  const cancelMatchmaking = async () => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (playerIdRef.current) {
        await fetch("/api/matchmaking/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerId: playerIdRef.current,
          }),
        });
      }

      setStatus("idle");
      setMatchData(null);
      setQueueInfo({ position: 0, total: 0, waitTime: 0 });
      setError(null);
      playerIdRef.current = null;
    } catch (error) {
      console.error("Error canceling matchmaking:", error);
      setError("Failed to cancel matchmaking");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    status,
    matchData,
    queueInfo,
    error,
    startMatchmaking,
    cancelMatchmaking,
  };
};
