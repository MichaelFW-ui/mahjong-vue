<template>
  <svg
    viewBox="0 0 60 60"
    class="dice-face"
    role="img"
    :aria-label="`${value} 点骰子`"
  >
    <rect
      x="1"
      y="1"
      width="58"
      height="58"
      rx="10"
      fill="#fffdf5"
      stroke="#d3cdbb"
      stroke-width="2"
    />
    <rect
      x="5"
      y="5"
      width="50"
      height="50"
      rx="7"
      fill="none"
      stroke="#ffffff"
    />
    <circle
      v-for="(pip, index) in dots"
      :key="index"
      :cx="pip[0]"
      :cy="pip[1]"
      :r="value === 1 ? 6 : 4.2"
      :fill="value === 1 || value === 4 ? '#b73535' : '#29493c'"
    />
  </svg>
</template>
<script lang="ts">
import { computed, defineComponent } from "vue";
const patterns: [number, number][][] = [
  [],
  [[30, 30]],
  [
    [16, 16],
    [44, 44],
  ],
  [
    [16, 16],
    [30, 30],
    [44, 44],
  ],
  [
    [16, 16],
    [44, 16],
    [16, 44],
    [44, 44],
  ],
  [
    [16, 16],
    [44, 16],
    [30, 30],
    [16, 44],
    [44, 44],
  ],
  [
    [16, 14],
    [44, 14],
    [16, 30],
    [44, 30],
    [16, 46],
    [44, 46],
  ],
];
export default defineComponent({
  name: "DiceFace",
  props: { value: { type: Number, required: true } },
  setup(props) {
    const dots = computed(() => patterns[props.value] || []);
    return { dots };
  },
});
</script>
<style scoped>
.dice-face {
  display: block;
  width: 76px;
  height: 76px;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 3px #254b3020);
}
</style>
