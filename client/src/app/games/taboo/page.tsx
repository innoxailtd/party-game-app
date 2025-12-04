"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Crown,
  Loader2,
  Lock,
  Sparkles,
  Users,
  UserCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

// ... all type definitions remain unchanged

type ConnectionState = "connecting" | "connected" | "error";
type Phase = "login" | "lobby" | "game";

type RoomPlayer = {
  socketId: string;
  username: string;
  isHost: boolean;
  keyword?: string;
  status: "alive" | "eliminated";
};

type RoomData = {
  roomId: string;
  players: RoomPlayer[];
  status: "waiting" | "playing";
  winner: string | null;
};

type ServerToClientEvents = {
  update_room: (room: RoomData) => void;
  game_started: (room: RoomData) => void;
  game_over: (room: RoomData) => void;
};

type ClientToServerEvents = {
  create_room: (
    payload: { username: string },
    callback: (response: { roomId?: string; error?: string }) => void
  ) => void;
  join_room: (
    payload: { username: string; roomId: string },
    callback: (response: { roomId?: string; error?: string }) => void
  ) => void;
  start_game: (
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  eliminate_player: (
    payload: { roomId: string; playerId: string },
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
  restart_game: (
    callback: (response: { success?: boolean; error?: string }) => void
  ) => void;
};

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

export default function TabooGame() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionState>("connecting");
  const [phase, setPhase] = useState<Phase>("login");
  const [nickname, setNickname] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [roomStatus, setRoomStatus] = useState<RoomData["status"] | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isEliminating, setIsEliminating] = useState(false);
  const [selfSocketId, setSelfSocketId] = useState<string | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setSelfSocketId(socket.id);
    });

    socket.on("connect_error", () => {
      setConnectionStatus("error");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("connecting");
      setPhase("login");
      setActiveRoomId(null);
      setPlayers([]);
      setRoomStatus(null);
      setIsProcessing(false);
      setIsStartingGame(false);
      setIsRestarting(false);
      setIsEliminating(false);
      setWinner(null);
      setSelfSocketId(null);
    });

    socket.on("update_room", (room) => {
      setActiveRoomId(room.roomId);
      setPlayers(room.players);
      setRoomStatus(room.status);
      setPhase(room.status === "playing" ? "game" : "lobby");
      setErrorMessage(null);
      setIsProcessing(false);
      setIsStartingGame(false);
      setIsRestarting(false);
      setIsEliminating(false);
      setWinner(room.winner);
    });

    socket.on("game_started", (room) => {
      setActiveRoomId(room.roomId);
      setPlayers(room.players);
      setRoomStatus(room.status);
      setPhase("game");
      setErrorMessage(null);
      setIsStartingGame(false);
      setIsRestarting(false);
      setIsEliminating(false);
      setWinner(null);
    });

    socket.on("game_over", (room) => {
      setActiveRoomId(room.roomId);
      setPlayers(room.players);
      setRoomStatus(room.status);
      setPhase("game");
      setWinner(room.winner);
      setIsStartingGame(false);
      setIsRestarting(false);
      setIsEliminating(false);
      setErrorMessage(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const statusLabel: Record<ConnectionState, string> = {
    connecting: "連線中...",
    connected: "✅ 已連線",
    error: "⚠️ 連線失敗",
  };

  const handleCreateRoom = () => {
    if (!socketRef.current) return;
    const trimmedName = nickname.trim();

    if (!trimmedName) {
      setErrorMessage("請先輸入暱稱");
      return;
    }

    setIsProcessing(true);
    socketRef.current.emit("create_room", { username: trimmedName }, (response) => {
      if (response.error) {
        setErrorMessage(response.error);
        setIsProcessing(false);
        return;
      }
      setErrorMessage(null);
      setActiveRoomId(response.roomId ?? null);
    });
  };

  const handleJoinRoom = () => {
    if (!socketRef.current) return;

    const trimmedName = nickname.trim();
    const trimmedRoomId = roomCodeInput.trim();

    if (!trimmedName || !trimmedRoomId) {
      setErrorMessage("請輸入暱稱與房號");
      return;
    }

    setIsProcessing(true);
    socketRef.current.emit(
      "join_room",
      { username: trimmedName, roomId: trimmedRoomId },
      (response) => {
        if (response.error) {
          setErrorMessage(response.error);
          setIsProcessing(false);
          return;
        }

        setErrorMessage(null);
        setActiveRoomId(response.roomId ?? null);
      }
    );
  };

  const handleStartGame = () => {
    if (!socketRef.current || roomStatus !== "waiting") return;

    setIsStartingGame(true);
    socketRef.current.emit("start_game", (response) => {
      if (response.error) {
        setErrorMessage(response.error);
        setIsStartingGame(false);
        return;
      }

      setErrorMessage(null);
    });
  };

  const handleSelfEliminate = () => {
    if (!socketRef.current || !activeRoomId || !selfSocketId) return;

    setIsEliminating(true);
    socketRef.current.emit(
      "eliminate_player",
      { roomId: activeRoomId, playerId: selfSocketId },
      (response) => {
        if (response.error) {
          setErrorMessage(response.error);
          setIsEliminating(false);
          return;
        }

        setErrorMessage(null);
      }
    );
  };

  const handleRestartGame = () => {
    if (!socketRef.current || !activeRoomId || !isHost) return;

    setIsRestarting(true);
    socketRef.current.emit("restart_game", (response) => {
      if (response.error) {
        setErrorMessage(response.error);
        setIsRestarting(false);
        return;
      }

      setErrorMessage(null);
    });
  };

  const selfPlayer = players.find((player) => player.socketId === selfSocketId);
  const isHost = Boolean(selfPlayer?.isHost);
  const hasWinner = Boolean(winner);

  const lobbySubtitle = hasWinner
    ? `遊戲已結束，勝者：${winner ?? "未決定"}`
    : roomStatus === "playing"
    ? "遊戲已開始"
    : "等待所有玩家加入";
  const showSelfEliminateButton =
    phase === "game" && selfPlayer?.status === "alive" && !hasWinner;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-4xl rounded-[2.5rem] bg-white p-10 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold text-indigo-400">
            狀態：{statusLabel[connectionStatus]}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-800">害人在心口難開 Lobby</h1>
          <p className="mt-2 text-slate-500">建立或加入房間，準備好一場超嗨的派對回合</p>
        </header>

        {phase === "login" && (
          <section className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500">暱稱</label>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="輸入暱稱"
                className="w-full rounded-2xl border border-slate-100 bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-inner shadow-slate-100 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleCreateRoom}
                disabled={isProcessing || connectionStatus !== "connected"}
                className="flex-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-fuchsia-200 transition hover:translate-y-[-2px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? "建立中..." : "創建房間"}
              </button>
              <div className="flex flex-1 gap-3">
                <input
                  value={roomCodeInput}
                  onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                  placeholder="房號 4 位數"
                  maxLength={4}
                  className="w-full rounded-full border border-slate-100 bg-white px-6 py-4 text-base font-semibold tracking-[0.3em] text-slate-700 shadow-inner shadow-slate-100 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={isProcessing || connectionStatus !== "connected"}
                  className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-amber-200 transition hover:translate-y-[-2px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  加入
                </button>
              </div>
            </div>
            {errorMessage && (
              <p className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-500">
                <AlertTriangle className="h-4 w-4" />
                {errorMessage}
              </p>
            )}
          </section>
        )}

        {phase === "lobby" && (
          <section className="space-y-8">
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-50 to-sky-50 px-6 py-5 shadow-inner shadow-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  房間 ID
                </p>
                <p className="mt-1 text-3xl font-extrabold tracking-[0.4em] text-slate-800">
                  {activeRoomId ?? "----"}
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-500 shadow">
                <Users className="h-4 w-4" />
                {players.length} 位玩家
              </span>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
                玩家列表
              </p>
              <ul className="space-y-3">
                {players.map((player) => (
                  <li
                    key={player.socketId}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 font-semibold text-slate-700">
                      <span className="text-2xl">{player.isHost ? "👑" : "😀"}</span>
                      {player.username}
                    </div>
                    {player.isHost && (
                      <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                        HOST
                      </span>
                    )}
                  </li>
                ))}
                {players.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-400">
                    等待玩家加入...
                  </li>
                )}
              </ul>
            </div>

            {isHost && roomStatus === "waiting" && (
              <button
                onClick={handleStartGame}
                disabled={isStartingGame || connectionStatus !== "connected"}
                className="w-full rounded-[2rem] bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-5 text-lg font-semibold text-white shadow-[0_20px_40px_rgba(16,185,129,0.35)] transition hover:translate-y-[-2px] hover:shadow-[0_30px_45px_rgba(16,185,129,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStartingGame ? "開始中..." : "開始遊戲"}
              </button>
            )}

            <p className="text-center text-sm text-slate-400">{lobbySubtitle}</p>
          </section>
        )}

        {phase === "game" && (
          <section className="space-y-8">
            <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                房間 ID
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[0.4em] text-slate-800">
                {activeRoomId ?? "----"}
              </p>
              <p className="mt-2 text-sm text-slate-500">觀看其他人的提示，猜出自己的挑戰</p>
            </div>

            {hasWinner && (
              <div className="rounded-[2rem] border border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-5 text-center shadow-inner shadow-amber-100">
                <p className="text-xl font-bold text-amber-600">
                  🏆 獲勝者：{winner ?? "未決定"}
                </p>
                {isHost && (
                  <button
                    onClick={handleRestartGame}
                    disabled={isRestarting}
                    className="mt-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-60"
                  >
                    {isRestarting ? "重新配對中..." : "再來一局"}
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {players.map((player) => {
                const isSelf = player.socketId === selfSocketId;
                const isEliminated = player.status === "eliminated";
                const keywordDisplay = isSelf ? "???" : player.keyword ?? "尚未分配";
                const badgeLabel = isSelf ? "YOU" : player.isHost ? "HOST" : "";

                return (
                  <div
                    key={player.socketId}
                    className={`relative rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_15px_45px_rgba(15,23,42,0.08)] transition ${
                      isEliminated ? "opacity-50 grayscale" : ""
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
                          {player.isHost ? "👑" : "😀"}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">{player.username}</p>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            {badgeLabel || "player"}
                          </p>
                        </div>
                      </div>
                      {isEliminated && (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                          已淘汰
                        </span>
                      )}
                    </div>

                    <div
                      className={`relative rounded-2xl px-4 py-6 text-center text-2xl font-black ${
                        isSelf
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {!isSelf && (
                        <span className="absolute -left-3 -top-3 rotate-[-6deg] rounded-md bg-yellow-300 px-2 py-1 text-xs font-bold text-yellow-800 shadow">
                          KEYWORD
                        </span>
                      )}
                      {keywordDisplay}
                    </div>

                    {isSelf && !hasWinner && (
                      <div className="mt-5">
                        <button
                          onClick={handleSelfEliminate}
                          disabled={!showSelfEliminateButton || isEliminating}
                          className="w-full rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isEliminating ? "送出中..." : "我說錯了 / 自爆"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
