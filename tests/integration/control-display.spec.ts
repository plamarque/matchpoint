import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import DisplayInline from "@/features/display/DisplayInline.vue";

describe("inline display integration", () => {
  it("updates score with ghost hotspots", async () => {
    render(DisplayInline, {
      global: {
        plugins: [createPinia()]
      }
    });

    await fireEvent.click(screen.getByRole("button", { name: "Score A +" }));
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });
});
