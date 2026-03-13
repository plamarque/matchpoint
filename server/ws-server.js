/**
 * Serveur WebSocket pour le contrôle à distance de l'affichage Matchpoint.
 * Envoie server_info (host, port) à chaque client à la connexion.
 * Relaie les messages entre clients (contrôle -> affichage).
 *
 * Usage: node server/ws-server.js [port]
 * Port par défaut: 8765
 */

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { networkInterfaces } from "os";

const PORT = parseInt(process.argv[2] || "8765", 10);

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

const server = createServer();
const wss = new WebSocketServer({ server });

const serverInfo = {
  type: "server_info",
  host: getLocalIP(),
  port: PORT
};

wss.on("connection", (ws, req) => {
  const remote = req.socket.remoteAddress;
  ws.send(JSON.stringify(serverInfo));

  ws.on("message", (data) => {
    const raw = data.toString();
    if (!raw || raw.trim() === "") return;
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(raw);
      }
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Matchpoint WS: ws://${serverInfo.host}:${PORT}`);
});
