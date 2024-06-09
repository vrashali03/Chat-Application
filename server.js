const path = require("path");
const http = require("http");
const cors = require("cors");
const express = require("express");
const socketio = require("socket.io");

const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  roomUsers,
} = require("./utils/users");

const app = express();
app.use(cors());
const PORT = 4000 || process.env.PORT;
const server = http.createServer(app);
const io = socketio(server);

const botName = "Bot";

//set static folder
app.use(express.static(path.join(__dirname, "public")));

//Run when a client connects
io.on("connection", (socket) => {
  console.log("New WS Connection....");

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    //Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to Chat Room"));

    //Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    //Send users room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: roomUsers(user.room),
    });
  });

  //Listen for chat message
  socket.on("chatMessage", (message) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, message));
  });

  //Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      //Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: roomUsers(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
