const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// ✅ Health check (for Render)
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 STORE USERS IN ROOMS
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ JOIN ROOM
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    rooms[roomId].push(socket.id);

    console.log(`User ${socket.id} joined room ${roomId}`);

    // 🔥 Send existing users to new user
    socket.emit(
      "all-users",
      rooms[roomId].filter((id) => id !== socket.id)
    );
  });

  // 💬 CHAT
  socket.on("chat-message", ({ roomId, message }) => {
    socket.to(roomId).emit("chat-message", message);
  });

  // 🎬 VIDEO SYNC
  socket.on("play", ({ roomId, time }) => {
    socket.to(roomId).emit("play", time);
  });

  socket.on("pause", (roomId) => {
    socket.to(roomId).emit("pause");
  });

  socket.on("seek", ({ roomId, time }) => {
    socket.to(roomId).emit("seek", time);
  });

  // ❌ REMOVE peer-id logic (NOT NEEDED NOW)

  // ❌ CLEANUP ON DISCONNECT
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (let roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
    }
  });
});

// ✅ PORT FIX
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
