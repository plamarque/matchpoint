import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useMatchStore } from "@/stores/matchStore";
import { runRemoteCommand } from "@/remote/commandRunner";

vi.stubGlobal("crypto", { randomUUID: () => "test-id" });

describe("runRemoteCommand", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("applies set_team_logo", () => {
    const store = useMatchStore();
    runRemoteCommand(
      { type: "set_team_logo", team: "A", dataUrl: "data:image/png;base64,xx" },
      store
    );
    expect(store.match.teamA.logoDataUrl).toBe("data:image/png;base64,xx");
    runRemoteCommand({ type: "set_team_logo", team: "A", dataUrl: null }, store);
    expect(store.match.teamA.logoDataUrl).toBeNull();
  });
});
