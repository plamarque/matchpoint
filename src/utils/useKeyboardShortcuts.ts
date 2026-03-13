import { onMounted, onUnmounted } from "vue";

export const useKeyboardShortcuts = (handler: (event: KeyboardEvent) => void) => {
  const onKeydown = (event: KeyboardEvent) => handler(event);

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onUnmounted(() => window.removeEventListener("keydown", onKeydown));
};
