/**
 * Backend WebSocket pour la télécommande Matchpoint (affichage ↔ remote).
 * Gère des sessions temporaires : le display crée une session, le remote rejoint avec un code.
 * Déployable sur Google Cloud Run.
 *
 * Usage: node server.js
 * Env: PORT (défaut 8080), SESSION_TIMEOUT_MS (défaut 30 min)
 */

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { randomBytes } from "crypto";
import { networkInterfaces } from "os";

const PORT = parseInt(process.env.PORT || "8080", 10);

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || "1800000", 10); // 30 min

function generateId() {
  return randomBytes(8).toString("hex");
}

function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

const sessionsById = new Map();
const joinCodeToSessionId = new Map();
const wsToSession = new Map();

function touchSession(sessionId) {
  const session = sessionsById.get(sessionId);
  if (session) session.lastActivity = Date.now();
}

function removeSession(sessionId) {
  const session = sessionsById.get(sessionId);
  if (!session) return;
  joinCodeToSessionId.delete(session.joinCode);
  sessionsById.delete(sessionId);
  try {
    if (session.displayWs && session.displayWs.readyState === 1) session.displayWs.close();
  } catch (_) {}
  try {
    if (session.remoteWs && session.remoteWs.readyState === 1) session.remoteWs.close();
  } catch (_) {}
}

function expireStaleSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessionsById.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      removeSession(sessionId);
    }
  }
}

setInterval(expireStaleSessions, 60000);

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  let role = null;
  let sessionId = null;

  ws.on("message", (data) => {
    const raw = data.toString();
    if (!raw || !raw.trim()) return;

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: "session:error", message: "Invalid JSON" });
      return;
    }

    if (role === null) {
      if (msg.type === "session:create") {
        role = "display";
        const id = generateId();
        const joinCode = generateJoinCode();
        sessionId = id;
        const session = {
          sessionId: id,
          joinCode,
          displayWs: ws,
          remoteWs: null,
          createdAt: Date.now(),
          lastActivity: Date.now()
        };
        sessionsById.set(id, session);
        joinCodeToSessionId.set(joinCode, id);
        wsToSession.set(ws, { sessionId: id, role: "display" });
        send(ws, { type: "session:created", sessionId: id, joinCode });
        return;
      }
      if (msg.type === "session:join" && typeof msg.joinCode === "string") {
        const code = String(msg.joinCode).trim().toUpperCase();
        const sid = joinCodeToSessionId.get(code);
        if (!sid) {
          send(ws, { type: "session:error", message: "Session introuvable ou expirée" });
          return;
        }
        const session = sessionsById.get(sid);
        if (!session || !session.displayWs || session.displayWs.readyState !== 1) {
          send(ws, { type: "session:error", message: "Session introuvable ou expirée" });
          return;
        }
        role = "remote";
        sessionId = sid;
        if (session.remoteWs && session.remoteWs.readyState === 1) {
          try {
            session.remoteWs.close();
          } catch (_) {}
        }
        session.remoteWs = ws;
        session.lastActivity = Date.now();
        wsToSession.set(ws, { sessionId: sid, role: "remote" });
        send(ws, { type: "session:joined" });
        send(session.displayWs, { type: "remote:connected" });
        return;
      }
      send(ws, { type: "session:error", message: "Envoyez session:create ou session:join en premier" });
      return;
    }

    if (role === "remote" && msg.type === "command" && msg.payload != null) {
      const session = sessionsById.get(sessionId);
      if (session && session.displayWs && session.displayWs.readyState === 1) {
        touchSession(sessionId);
        send(session.displayWs, { type: "command", payload: msg.payload });
        send(ws, { type: "command:ack" });
      }
    }
  });

  ws.on("close", () => {
    const info = wsToSession.get(ws);
    wsToSession.delete(ws);
    if (!info) return;
    const session = sessionsById.get(info.sessionId);
    if (!session) return;
    if (info.role === "display") {
      removeSession(info.sessionId);
    } else {
      session.remoteWs = null;
      if (session.displayWs && session.displayWs.readyState === 1) {
        send(session.displayWs, { type: "remote:disconnected" });
      }
    }
  });
});

function send(ws, obj) {
  if (ws && ws.readyState === 1) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (_) {}
  }
}

server.listen(PORT, "0.0.0.0", () => {
  const lan = getLocalIP();
  console.log(`Matchpoint remote backend: port ${PORT}`);
  if (lan !== "127.0.0.1") {
    console.log(`  → Réseau local : ws://${lan}:${PORT} (à mettre dans .env : VITE_REMOTE_BACKEND_WS_URL=ws://${lan}:${PORT})`);
  }
});
