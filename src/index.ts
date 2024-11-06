import express, { Request } from "express";
import { Server } from "socket.io";
import http from "http";
import App from "./routes/index";
import { socket } from "./socket";
import passport from "passport";

const { PORT = 5500 } = process.env;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", allowedHeaders: ["*"] }
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
})

app.use(express.json());
app.use(passport.initialize());

async function runServer() {
  socket(io)
  await App(app);
  server.listen(PORT, async () => {
    console.log(`The server is Running on port ${PORT}`);
  });
}

runServer();

export default app;
