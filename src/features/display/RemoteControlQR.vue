<script setup lang="ts">
import { ref, watch, computed } from "vue";
import QRCode from "qrcode";
import { buildControlAppUrl } from "@/remote/controlAppUrl";

const props = withDefaults(
  defineProps<{
    sessionInfo: { joinCode: string } | null;
    /** Quand fourni, la modale est pilotée par le parent (ex. télécommande distante). */
    modelValue?: boolean;
    idleOpacity?: number;
    hoverOpacity?: number;
    hotspotScale?: number;
  }>(),
  { idleOpacity: 0.1, hoverOpacity: 0.26, hotspotScale: 1 }
);

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const showModalLocal = ref(false);
const qrDataUrl = ref<string | null>(null);

const showModal = computed(() =>
  props.modelValue !== undefined ? props.modelValue : showModalLocal.value
);

const controlUrl = computed(() => {
  if (!props.sessionInfo) return null;
  return buildControlAppUrl(props.sessionInfo.joinCode);
});

watch(
  () => props.sessionInfo,
  async (info) => {
    if (!info) {
      qrDataUrl.value = null;
      return;
    }
    const url = buildControlAppUrl(info.joinCode);
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, { width: 280, margin: 2 });
    } catch {
      qrDataUrl.value = null;
    }
  },
  { immediate: true }
);

function openModal() {
  if (props.modelValue !== undefined) {
    emit("update:modelValue", true);
  } else {
    showModalLocal.value = true;
  }
}

function closeModal() {
  if (props.modelValue !== undefined) {
    emit("update:modelValue", false);
  } else {
    showModalLocal.value = false;
  }
}
</script>

<template>
  <div
    class="hotspot-layer remote-control-layer"
    :style="{
      '--ghost-idle-opacity': String(idleOpacity),
      '--ghost-hover-opacity': String(hoverOpacity),
      '--hotspot-scale': String(hotspotScale)
    }"
  >
    <button
      type="button"
      class="ghost-hotspot"
      :aria-label="sessionInfo ? 'Contrôle par smartphone' : 'Télécommande indisponible'"
      :title="sessionInfo ? 'Scannez pour piloter depuis votre téléphone' : 'La télécommande n’est pas disponible sans connexion Internet'"
      @click="openModal"
    >
      <span class="ghost-label">QR</span>
    </button>
  </div>

  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showModal" class="remote-modal-backdrop" @click.self="closeModal">
        <div class="remote-modal" role="dialog" aria-labelledby="remote-modal-title" aria-modal="true">
          <h2 id="remote-modal-title" class="remote-modal-title">Contrôle par smartphone</h2>
          <p v-if="sessionInfo" class="remote-modal-hint">Scannez pour ouvrir l’appli de contrôle sur votre téléphone.</p>
          <p v-else class="remote-modal-hint remote-modal-warn">
            La télécommande n’est pas disponible sans connexion Internet.
          </p>
          <div v-if="qrDataUrl" class="remote-modal-qr">
            <img :src="qrDataUrl" alt="QR code de connexion" width="280" height="280" />
          </div>
          <p v-if="controlUrl" class="remote-modal-url">
            <a :href="controlUrl" target="_blank" rel="noopener">{{ controlUrl }}</a>
          </p>
          <button type="button" class="remote-modal-close" aria-label="Fermer" @click="closeModal">
            Fermer
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Même couche que les hotspots Contraste / Plein écran, bouton en bas à droite (angle) */
.remote-control-layer {
  pointer-events: none;
}

.remote-control-layer :deep(.ghost-hotspot) {
  left: 93%;
  top: 91%;
  width: 6%;
  height: 7%;
}

.remote-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.remote-modal {
  background: var(--bg-layer, #0c2234);
  border-radius: var(--radius, 18px);
  padding: 1.5rem;
  max-width: 100%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.remote-modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-family: var(--font-display);
}

.remote-modal-hint {
  margin: 0 0 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.remote-modal-warn {
  color: var(--accent);
}

.remote-modal-warn code {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.remote-modal-qr {
  margin: 0 auto 1rem;
  padding: 0.5rem;
  background: #fff;
  border-radius: 8px;
  display: inline-block;
}

.remote-modal-qr img {
  display: block;
}

.remote-modal-url {
  margin: 0 0 1rem;
  font-size: 0.75rem;
  word-break: break-all;
}

.remote-modal-url a {
  color: var(--accent);
}

.remote-modal-close {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  font: inherit;
}

.remote-modal-close:hover {
  background: rgba(255, 255, 255, 0.08);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .remote-modal,
.modal-leave-active .remote-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from .remote-modal,
.modal-leave-to .remote-modal {
  transform: scale(0.95);
}
</style>
