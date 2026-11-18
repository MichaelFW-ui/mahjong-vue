<template>
  <teleport to="body">
    <div
      class="score-dialog-backdrop"
      @mousedown.self="$emit('close')"
      @keydown.esc.stop="$emit('close')"
    >
      <section
        ref="panel"
        class="score-dialog"
        :class="{ sideways: rotation === 90 || rotation === -90 }"
        :style="{ transform: `rotate(${rotation}deg)` }"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        @keydown.tab="trapFocus"
      >
        <header>
          <div>
            <h2>{{ title }}</h2>
          </div>
          <button
            class="close-dialog"
            type="button"
            aria-label="关闭弹窗"
            @click="$emit('close')"
          >
            ×
          </button>
        </header>
        <div class="dialog-body"><slot /></div>
      </section>
    </div>
  </teleport>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
export default defineComponent({
  name: "ScoreDialog",
  props: { title: String, rotation: { type: Number, default: 0 } },
  emits: ["close"],
  setup(props) {
    const panel = ref<HTMLElement | null>(null);
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    onMounted(() => {
      document.body.style.overflow = "hidden";
      panel.value?.focus();
    });
    watch(
      () => props.title,
      async () => {
        await nextTick();
        panel.value?.focus();
      }
    );
    onUnmounted(() => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      const nodes = Array.from(
        panel.value?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]"
        ) || []
      ).filter((node) => node.offsetParent !== null);
      if (!nodes.length) {
        event.preventDefault();
        return;
      }
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.value)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panel.value)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    return { panel, trapFocus };
  },
});
</script>

<style scoped>
.score-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: #102b2699;
  backdrop-filter: blur(7px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}
.score-dialog {
  background: #faf9f4;
  color: #263f35;
  border-radius: 22px;
  width: 520px;
  max-width: 100%;
  max-height: calc(100dvh - 32px);
  overflow: auto;
  box-shadow: 0 25px 100px #041d3040;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    sans-serif;
  outline: none;
}
.score-dialog.sideways {
  width: min(520px, calc(100dvh - 32px));
  max-width: none;
  max-height: calc(100vw - 32px);
  flex-shrink: 0;
}
.score-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 28px 18px;
  gap: 16px;
}
.dialog-eyebrow {
  font-size: 10px;
  color: #8c9486;
  letter-spacing: 0.18em;
}
.score-dialog h2 {
  margin: 6px 0 0;
  font-size: 24px;
  letter-spacing: 0.02em;
  font-weight: 600;
}
.close-dialog {
  border: 1px solid #e4e5da;
  background: transparent;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  color: #617164;
  font-size: 24px;
  cursor: pointer;
}
.close-dialog:hover {
  background: #eee;
}
.dialog-body {
  padding: 0 28px 28px;
}
@media (max-width: 480px) {
  .score-dialog > header {
    padding: 22px 20px 16px;
  }
  .dialog-body {
    padding: 0 20px 22px;
  }
  .score-dialog h2 {
    font-size: 22px;
  }
}
</style>
