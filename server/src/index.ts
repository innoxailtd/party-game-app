import cors from "cors";
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_URL = process.env.CLIENT_URL;
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  CLIENT_URL,
].filter(Boolean) as string[];
const KEYWORDS = ["不知道", "喝水", "站起來", "摸頭髮", "說英文", "大笑"];

type RoomStatus = "waiting" | "playing";
type PlayerStatus = "alive" | "eliminated";

type Player = {
  socketId: string;
  username: string;
  isHost: boolean;
  keyword?: string;
  status: PlayerStatus;
};

type Room = {
  roomId: string;
  status: RoomStatus;
  winner: string | null;
  players: Player[];
};

type ServerToClientEvents = {
  update_room: (room: Room) => void;
  game_started: (room: Room) => void;
  game_over: (room: Room) => void;
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

type InterServerEvents = Record<string, never>;
type SocketData = {
  roomId?: string;
  username?: string;
};

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const httpServer = http.createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const rooms = new Map<string, Room>();

const generateRoomId = (): string => {
  let roomId: string;
  do {
    roomId = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(roomId));
  return roomId;
};

const getRandomKeyword = () =>
  KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];

const prepareRoomForGame = (room: Room) => {
  room.status = "playing";
  room.winner = null;
  room.players = room.players.map((player) => ({
    ...player,
    status: "alive",
    keyword: getRandomKeyword(),
  }));
};

const broadcastRoom = (roomId: string) => {
  const room = rooms.get(roomId);
  if (room) {
    io.to(roomId).emit("update_room", room);
  }
};

const emitGameOver = (room: Room) => {
  io.to(room.roomId).emit("game_over", room);
};

const resolveWinnerIfNeeded = (roomId: string): boolean => {
  const room = rooms.get(roomId);
  if (!room) {
    return false;
  }

  const alivePlayers = room.players.filter((player) => player.status === "alive");

  if (alivePlayers.length <= 1) {
    room.winner = alivePlayers[0]?.username ?? null;
    emitGameOver(room);
    return true;
  }

  return false;
};

const removePlayerFromRoom = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) => {
  const { roomId } = socket.data;
  if (!roomId) {
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    socket.leave(roomId);
    socket.data.roomId = undefined;
    return;
  }

  room.players = room.players.filter((player) => player.socketId !== socket.id);

  if (room.players.length === 0) {
    rooms.delete(roomId);
  } else {
    if (!room.players.some((player) => player.isHost)) {
      room.players[0].isHost = true;
    }

    if (room.status === "playing") {
      const hasWinner = resolveWinnerIfNeeded(roomId);
      if (!hasWinner) {
        broadcastRoom(roomId);
      }
    } else {
      broadcastRoom(roomId);
    }
  }

  socket.leave(roomId);
  socket.data.roomId = undefined;
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("create_room", ({ username }, callback) => {
    const trimmedName = username?.trim();

    if (!trimmedName) {
      callback({ error: "請輸入暱稱" });
      return;
    }

    removePlayerFromRoom(socket);

    const roomId = generateRoomId();
    const room: Room = {
      roomId,
      status: "waiting",
      winner: null,
      players: [
        {
          socketId: socket.id,
          username: trimmedName,
          isHost: true,
          status: "alive",
        },
      ],
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = trimmedName;

    callback({ roomId });
    broadcastRoom(roomId);
  });

  socket.on("join_room", ({ username, roomId }, callback) => {
    const trimmedName = username?.trim();
    const normalizedRoomId = roomId?.trim();

    if (!trimmedName || !normalizedRoomId) {
      callback({ error: "請輸入暱稱與房號" });
      return;
    }

    const room = rooms.get(normalizedRoomId);

    if (!room) {
      callback({ error: "房間不存在" });
      return;
    }

    removePlayerFromRoom(socket);

    const existingPlayer = room.players.find((player) => player.socketId === socket.id);
    if (!existingPlayer) {
      room.players.push({
        socketId: socket.id,
        username: trimmedName,
        isHost: room.players.length === 0,
        keyword: room.status === "playing" ? getRandomKeyword() : undefined,
        status: "alive",
      });
    }

    socket.join(normalizedRoomId);
    socket.data.roomId = normalizedRoomId;
    socket.data.username = trimmedName;

    callback({ roomId: normalizedRoomId });
    broadcastRoom(normalizedRoomId);
  });

  socket.on("start_game", (callback) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      callback({ error: "尚未加入房間" });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ error: "房間不存在" });
      return;
    }

    const hostPlayer = room.players.find((player) => player.socketId === socket.id);
    if (!hostPlayer || !hostPlayer.isHost) {
      callback({ error: "只有房主可以開始遊戲" });
      return;
    }

    prepareRoomForGame(room);

    callback({ success: true });
    io.to(roomId).emit("game_started", room);
  });

  socket.on("eliminate_player", ({ roomId, playerId }, callback) => {
    if (!roomId || !playerId) {
      callback({ error: "缺少必要參數" });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ error: "房間不存在" });
      return;
    }

    if (room.status !== "playing") {
      callback({ error: "遊戲尚未開始" });
      return;
    }

    if (playerId !== socket.id) {
      callback({ error: "只能淘汰自己" });
      return;
    }

    const targetPlayer = room.players.find((player) => player.socketId === playerId);
    if (!targetPlayer) {
      callback({ error: "玩家不存在" });
      return;
    }

    if (targetPlayer.status === "eliminated") {
      callback({ success: true });
      return;
    }

    targetPlayer.status = "eliminated";

    const hasWinner = resolveWinnerIfNeeded(roomId);
    if (!hasWinner) {
      broadcastRoom(roomId);
    }

    callback({ success: true });
  });

  socket.on("restart_game", (callback) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      callback({ error: "尚未加入房間" });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ error: "房間不存在" });
      return;
    }

    const hostPlayer = room.players.find((player) => player.socketId === socket.id);
    if (!hostPlayer || !hostPlayer.isHost) {
      callback({ error: "只有房主可以重新開始" });
      return;
    }

    prepareRoomForGame(room);

    callback({ success: true });
    io.to(roomId).emit("game_started", room);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    removePlayerFromRoom(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

