import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/vue";
import InlineEditableText from "@/components/InlineEditableText.vue";

describe("InlineEditableText", () => {
  it("edits and commits on Enter", async () => {
    const updates: string[] = [];
    render(InlineEditableText, {
      props: {
        modelValue: "Titre",
        ariaLabel: "Titre",
        "onUpdate:modelValue": (value: string) => updates.push(value)
      }
    });

    await fireEvent.click(screen.getByRole("button", { name: "Titre" }));
    const input = screen.getByRole("textbox", { name: "Titre" });
    await fireEvent.update(input, "Nouveau titre");
    await fireEvent.keyDown(input, { key: "Enter" });

    expect(updates.at(-1)).toBe("Nouveau titre");
  });
});
