"use client";
import React, { useState } from "react";
import { useMatchmaking } from "@/hooks/useMatchmaking";

const Matchmaking = () => {
  const [playerName, setPlayerName] = useState("");
  const [skillLevel, setSkillLevel] = useState(1000);

  const {
    status,
    matchData,
    queueInfo,
    error,
    startMatchmaking,
    cancelMatchmaking,
  } = useMatchmaking();

  const handleFindMatch = () => {
    startMatchmaking({
      playerName: playerName || "Anonymous Player",
      skillLevel: skillLevel,
    });
  };

  const formatWaitTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Matchmaking</h2>

      {status === "idle" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Skill Level
            </label>
            <input
              type="number"
              value={skillLevel}
              onChange={(e) => setSkillLevel(parseInt(e.target.value) || 1000)}
              min="100"
              max="3000"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <button
            onClick={handleFindMatch}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Find Match
          </button>
        </div>
      )}

      {status === "searching" && (
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <h3 className="text-lg font-semibold">Searching for opponent...</h3>

          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-sm text-gray-600">
              Queue Position: {queueInfo.position}
            </p>
            <p className="text-sm text-gray-600">
              Players in Queue: {queueInfo.total}
            </p>
            <p className="text-sm text-gray-600">
              Wait Time: {formatWaitTime(queueInfo.waitTime)}
            </p>
          </div>

          <button
            onClick={cancelMatchmaking}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Cancel Search
          </button>
        </div>
      )}

      {status === "matched" && matchData && (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-6xl">✓</div>
          <h3 className="text-xl font-bold text-green-600">Match Found!</h3>

          <div className="bg-green-50 p-4 rounded-md">
            <p className="font-semibold">
              Opponent: {matchData.opponent.playerName}
            </p>
            <p className="text-sm text-gray-600">
              Skill Level: {matchData.opponent.skillLevel}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Match ID: {matchData.matchId}
            </p>
          </div>

          <button
            onClick={() => {
              // Here you would redirect to the game or start the match
              console.log("Starting game with match:", matchData);
            }}
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Start Game
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="text-center space-y-4">
          <div className="text-red-600 text-4xl">⚠️</div>
          <h3 className="text-lg font-semibold text-red-600">Error</h3>
          <p className="text-red-600">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default Matchmaking;
