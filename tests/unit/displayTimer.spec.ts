import { describe, expect, it } from "vitest";
import { isPrimaryChronoImpro } from "@/services/displayTimer";

describe("displayTimer", () => {
  it("affiche le chrono impro en principal pour live et pause", () => {
    expect(isPrimaryChronoImpro("live")).toBe(true);
    expect(isPrimaryChronoImpro("pause")).toBe(true);
  });

  it("affiche le chrono période en principal pour les autres statuts", () => {
    expect(isPrimaryChronoImpro("idle")).toBe(false);
    expect(isPrimaryChronoImpro("intermission")).toBe(false);
    expect(isPrimaryChronoImpro("vote")).toBe(false);
    expect(isPrimaryChronoImpro("ended")).toBe(false);
  });
});
