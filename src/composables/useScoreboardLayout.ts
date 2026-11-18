import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { LayoutPreference } from '../scoreboard/game';

const KEY = 'mahjong.scoreboard.layout.v1';
export function useScoreboardLayout() {
  let initial: LayoutPreference = 'auto';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'flat' || saved === 'table') initial = saved;
  } catch {
    /* 界面偏好不影响记分。 */
  }
  const preference = ref<LayoutPreference>(initial);
  const touch = ref(false);
  const resolved = computed(() =>
    preference.value === 'auto' ? (touch.value ? 'table' : 'flat') : preference.value
  );
  let query: MediaQueryList | undefined;
  const update = () => {
    touch.value = query?.matches || false;
  };
  onMounted(() => {
    query = window.matchMedia('(pointer: coarse) and (hover: none)');
    update();
    query.addEventListener('change', update);
  });
  onUnmounted(() => query?.removeEventListener('change', update));
  watch(preference, (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* 存储被禁用时保留当前选择。 */
    }
  });
  return { preference, resolved };
}
