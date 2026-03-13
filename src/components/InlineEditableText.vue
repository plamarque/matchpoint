<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  multiline?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editing = ref(false);
const draft = ref(props.modelValue);
const previous = ref(props.modelValue);
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

watch(
  () => props.modelValue,
  (value) => {
    if (!editing.value) {
      draft.value = value;
      previous.value = value;
    }
  }
);

const start = async () => {
  editing.value = true;
  draft.value = props.modelValue;
  previous.value = props.modelValue;
  await Promise.resolve();
  inputRef.value?.focus();
  inputRef.value?.select();
};

const commit = () => {
  editing.value = false;
  emit("update:modelValue", draft.value.trim() || props.placeholder || "");
};

const rollback = () => {
  editing.value = false;
  draft.value = previous.value;
};

const onKeydown = (event: KeyboardEvent) => {
  if (props.multiline && event.key === "Enter" && event.shiftKey) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    commit();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    rollback();
  }
};
</script>

<template>
  <button
    v-if="!editing"
    class="inline-editable"
    :class="className"
    :aria-label="ariaLabel"
    @click="start"
  >
    {{ modelValue || placeholder }}
  </button>

  <input
    v-else-if="!multiline"
    ref="inputRef"
    v-model="draft"
    class="inline-input"
    :class="className"
    :aria-label="ariaLabel"
    @blur="commit"
    @keydown="onKeydown"
  >

  <textarea
    v-else
    ref="inputRef"
    v-model="draft"
    class="inline-input inline-input-multiline"
    :class="className"
    :aria-label="ariaLabel"
    rows="2"
    @blur="commit"
    @keydown="onKeydown"
  />
</template>
