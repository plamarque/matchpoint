<script setup lang="ts">
import { computed } from "vue";
import { OVERLAY_LABELS } from "@/constants/match";
import type { OverlayKey } from "@/types/match";

const props = defineProps<{
  overlay: OverlayKey | null;
  customOverlayText?: string | null;
}>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

const label = computed(() => {
  if (!props.overlay) return "";
  if (props.overlay === "overlay_custom") return props.customOverlayText?.trim() || "ANNONCE";
  return OVERLAY_LABELS[props.overlay];
});
</script>

<template>
  <transition name="fade-scale">
    <section
      v-if="overlay"
      class="overlay-panel"
      role="status"
      aria-live="polite"
      @click="emit('close')"
    >
      <p class="overlay-title">{{ label }}</p>
    </section>
  </transition>
</template>
