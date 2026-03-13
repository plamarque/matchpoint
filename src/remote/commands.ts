import type { OverlayKey, PeriodLabel, TeamKey } from "@/types/match";

export interface ServerInfoMessage {
  type: "server_info";
  host: string;
  port: number;
}

/** Messages du protocole session (backend distant) */
export interface SessionCreatedMessage {
  type: "session:created";
  sessionId: string;
  joinCode: string;
}

export interface SessionJoinMessage {
  type: "session:join";
  joinCode: string;
}

export interface SessionJoinedMessage {
  type: "session:joined";
}

export interface SessionErrorMessage {
  type: "session:error";
  message: string;
}

export interface RemoteConnectedMessage {
  type: "remote:connected";
}

export interface RemoteDisconnectedMessage {
  type: "remote:disconnected";
}

export interface CommandMessage {
  type: "command";
  payload: RemoteCommand;
}

export interface CommandAckMessage {
  type: "command:ack";
}

export type RemoteCommand =
  | { type: "score_up"; team: TeamKey }
  | { type: "score_down"; team: TeamKey }
  | { type: "penalty_up"; team: TeamKey }
  | { type: "penalty_down"; team: TeamKey }
  | { type: "penalty_set"; team: TeamKey; level: number }
  | { type: "set_team_name"; team: TeamKey; value: string }
  | { type: "cycle_team_color"; team: TeamKey }
  | { type: "set_palette"; palette: string }
  | { type: "set_theme"; value: string }
  | { type: "set_category"; value: string }
  | { type: "set_impro_type"; value: "mixte" | "comparee" | "none" }
  | { type: "toggle_impro_type" }
  | { type: "impro_preset"; value: number }
  | { type: "impro_minutes"; value: number }
  | { type: "impro_seconds_step"; value: number }
  | { type: "nudge_impro_preset"; direction: 1 | -1 }
  | { type: "nudge_impro_minutes"; direction: 1 | -1 }
  | { type: "nudge_impro_seconds"; direction: 1 | -1 }
  | { type: "impro_start" }
  | { type: "impro_pause" }
  | { type: "impro_toggle" }
  | { type: "impro_reset" }
  | { type: "impro_set_remaining"; seconds: number }
  | { type: "set_period_label"; value: PeriodLabel }
  | { type: "period_next" }
  | { type: "period_prev" }
  | { type: "period_preset"; value: number }
  | { type: "nudge_period_preset"; direction: 1 | -1 }
  | { type: "period_start" }
  | { type: "period_pause" }
  | { type: "period_toggle" }
  | { type: "period_reset" }
  | { type: "period_set_remaining"; seconds: number }
  | { type: "nudge_period_seconds"; direction: 1 | -1 }
  | { type: "overlay"; key: OverlayKey }
  | { type: "overlay_custom"; text: string }
  | { type: "overlay_clear" }
  | { type: "contrast_toggle" }
  | { type: "qr_toggle" }
  | { type: "fullscreen_preference"; value: boolean }
  | { type: "fullscreen_toggle" }
  | { type: "reset_match" };

export function isServerInfo(msg: unknown): msg is ServerInfoMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as ServerInfoMessage).type === "server_info" &&
    typeof (msg as ServerInfoMessage).host === "string" &&
    typeof (msg as ServerInfoMessage).port === "number"
  );
}

export function isRemoteCommand(msg: unknown): msg is RemoteCommand {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) return false;
  const t = (msg as RemoteCommand).type;
  return typeof t === "string" && t.length > 0;
}

export function isSessionCreated(msg: unknown): msg is SessionCreatedMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as SessionCreatedMessage).type === "session:created" &&
    typeof (msg as SessionCreatedMessage).sessionId === "string" &&
    typeof (msg as SessionCreatedMessage).joinCode === "string"
  );
}

export function isSessionError(msg: unknown): msg is SessionErrorMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as SessionErrorMessage).type === "session:error" &&
    typeof (msg as SessionErrorMessage).message === "string"
  );
}

export function isSessionJoinedMessage(msg: unknown): msg is SessionJoinedMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as SessionJoinedMessage).type === "session:joined"
  );
}

export function isCommandMessage(msg: unknown): msg is CommandMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as CommandMessage).type === "command" &&
    "payload" in msg
  );
}
