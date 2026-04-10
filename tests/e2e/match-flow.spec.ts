import { test, expect } from "@playwright/test";

test("match flow inline interactions", async ({ page }) => {
  await page.goto("/");

  const scoreAUp = page.getByRole("button", { name: "Score A +" });
  const idleOpacity = await scoreAUp.evaluate((node) => getComputedStyle(node).opacity);
  expect(Number(idleOpacity)).toBeLessThanOrEqual(0.2);

  await scoreAUp.click();
  await expect(page.locator(".team-score").first()).toContainText("1");

  await page.getByRole("button", { name: "Titre de l'impro" }).click();
  await page.getByRole("textbox", { name: "Titre de l'impro" }).fill("Impro finale");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Titre de l'impro" })).toContainText("Impro finale");

  await page.getByRole("button", { name: "Début du match" }).click();
  await expect(page.locator(".overlay-title")).toContainText("Début du match");
  await page.keyboard.press("Escape");
  await expect(page.locator(".overlay-title")).toHaveCount(0);
});
