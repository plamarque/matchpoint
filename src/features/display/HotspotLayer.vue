<script setup lang="ts">
import type { HotspotDefinition } from "@/types/match";

defineProps<{
  hotspots: HotspotDefinition[];
  idleOpacity: number;
  hoverOpacity: number;
  hotspotScale: number;
}>();

const emit = defineEmits<{
  (e: "action", value: string): void;
}>();

const hotspotSymbol = (action: string): string => {
  if (action.includes("score_up")) return "+";
  if (action.includes("score_down")) return "-";
  if (action.includes("color_cycle")) return "🎨";
  if (action === "period_prev") return "←";
  if (action === "period_next") return "→";
  if (action.includes("penalty_up")) return "+";
  if (action.includes("penalty_down")) return "-";
  return "";
};
</script>

<template>
  <div
    class="hotspot-layer"
    :style="{
      '--ghost-idle-opacity': String(idleOpacity),
      '--ghost-hover-opacity': String(hoverOpacity),
      '--hotspot-scale': String(hotspotScale)
    }"
  >
    <button
      v-for="spot in hotspots"
      :key="spot.id"
      class="ghost-hotspot"
      :class="{
        circle: spot.shape === 'circle',
        'score-control': String(spot.action).startsWith('score_'),
        'center-y': spot.centerY
      }"
      :style="{
        left: `${spot.x}%`,
        top: spot.centerY ? '50%' : `${spot.y}%`,
        width: `${spot.width}%`,
        height: `${spot.height}%`
      }"
      :aria-label="spot.label"
      :title="spot.label"
      @click="emit('action', String(spot.action))"
    >
      <span class="ghost-label">
        {{ hotspotSymbol(String(spot.action)) || spot.label }}
      </span>
    </button>

  </div>
</template>
