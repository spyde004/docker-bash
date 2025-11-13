import express from "express";
import { WebSocketServer } from "ws";
import Docker from "dockerode";
import cors from "cors";
import http from "http";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Keep track of user containers
const userContainers = new Map();

wss.on("connection", async (ws) => {
  const sessionId = randomUUID();
  console.log("🟢 New client connected:", sessionId);

  // Create isolated container for each user
  const container = await docker.createContainer({
    Image: "alpine-bash", // we’ll build this image below
    Tty: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: true,
    StdinOnce: false,
  });

  userContainers.set(sessionId, container);
  await container.start();

  const execStream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
  });

  execStream.on("data", (chunk) => ws.send(chunk.toString()));
  execStream.on("error", (err) => ws.send("Error: " + err.message));

  ws.on("message", (msg) => {
    execStream.write(msg.toString());
  });

  ws.on("close", async () => {
    console.log("🔴 Client disconnected:", sessionId);
    execStream.end();
    try {
      await container.stop({ t: 0 });
      await container.remove();
      userContainers.delete(sessionId);
    } catch (err) {
      console.error("Error cleaning container:", err);
    }
  });
});

server.listen(3001, () => console.log("✅ Server running on port 3001"));



// docker build -t alpine-bash .
