import { describe, expect, it } from "vitest";
import { isLogoImageFile } from "@/utils/logoImageFile";

function file(name: string, type: string): File {
  return new File([""], name, { type });
}

describe("isLogoImageFile", () => {
  it("accepte les MIME image/* classiques", () => {
    expect(isLogoImageFile(file("x.png", "image/png"))).toBe(true);
    expect(isLogoImageFile(file("x.svg", "image/svg+xml"))).toBe(true);
  });

  it("accepte les .svg avec type MIME vide ou ambigu (souvent le cas sur le disque)", () => {
    expect(isLogoImageFile(file("logo.svg", ""))).toBe(true);
    expect(isLogoImageFile(file("logo.svg", "application/octet-stream"))).toBe(true);
    expect(isLogoImageFile(file("logo.svg", "text/plain"))).toBe(true);
    expect(isLogoImageFile(file("logo.svg", "text/xml"))).toBe(true);
  });

  it("refuse un .svg avec un type manifestement non image", () => {
    expect(isLogoImageFile(file("logo.svg", "video/mp4"))).toBe(false);
  });
});
