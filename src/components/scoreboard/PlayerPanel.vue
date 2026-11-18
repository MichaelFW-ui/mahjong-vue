<template>
  <article class="player-panel" :class="{ dealer: isDealer, declared: riichi }">
    <div class="player-content">
      <div class="player-heading">
        <span class="wind-tile" :class="{ 'dealer-wind': isDealer }">{{
          wind
        }}</span>
        <div class="player-identity">
          <strong class="player-name">{{ name }}</strong
          ><span class="player-caption">{{
            isDealer ? "庄家" : `第${rank}位`
          }}</span>
        </div>
        <span v-if="riichi" class="riichi-label">立直</span>
      </div>
      <div class="score-block">
        <strong class="points">{{ points.toLocaleString() }}</strong>
        <div class="point-detail">
          <span>距一位 {{ leaderGap ? leaderGap.toLocaleString() : "—" }}</span
          ><span v-if="delta" :class="{ negative: delta < 0 }"
            >{{ delta > 0 ? "+" : "" }}{{ delta.toLocaleString() }}</span
          >
        </div>
      </div>
      <div class="player-actions">
        <button
          type="button"
          :disabled="disabled || riichi || points < 1000"
          :aria-label="`${name}立直`"
          @click="$emit('riichi', seat)"
        >
          {{ riichi ? "已立直" : "立直" }}
        </button>
        <button
          type="button"
          :disabled="disabled"
          :aria-label="`${name}荣和`"
          @click="$emit('win', seat, 'ron')"
        >
          荣和
        </button>
        <button
          type="button"
          :disabled="disabled"
          :aria-label="`${name}自摸`"
          @click="$emit('win', seat, 'tsumo')"
        >
          自摸
        </button>
      </div>
    </div>
    <div class="stick-area">
      <span
        v-if="riichi"
        class="declaration-stick"
        role="img"
        :aria-label="`${name}面前的立直棒`"
        ><i></i
      ></span>
    </div>
  </article>
</template>
<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "PlayerPanel",
  props: {
    name: { type: String, required: true },
    seat: { type: Number, required: true },
    wind: String,
    points: { type: Number, required: true },
    rank: Number,
    leaderGap: Number,
    delta: Number,
    riichi: Boolean,
    isDealer: Boolean,
    disabled: Boolean,
  },
  emits: ["riichi", "win"],
});
</script>
<style scoped>
.player-panel {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  container-type: size;
  container-name: player;
  color: #f5f6ed;
  line-height: 1.2;
  position: relative;
  background: linear-gradient(135deg, #ffffff0c, #00000005);
  border: 1px solid #d9e9da24;
  border-radius: 10px;
  overflow: hidden;
}
.player-content {
  height: 100%;
  box-sizing: border-box;
  padding: 22px 16px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}
.player-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.wind-tile {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 36px;
  font-size: 25px;
  font-weight: 700;
  font-family: "Songti SC", serif;
  color: #f0f0d6;
  border: 1px solid #d6e5d03b;
  border-radius: 6px;
  background: #ffffff09;
}
.dealer-wind {
  background: #ffe9df;
  color: #c53436;
  border-color: #e8917b;
  box-shadow: 0 0 0 2px #bd403125;
}
.player-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.player-name {
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-caption {
  font-size: 11px;
  color: #bbd3c5;
}
.riichi-label {
  font-size: 11px;
  color: #ffbfb1;
}
.score-block {
  min-width: 0;
}
.points {
  display: block;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: clamp(28px, 11cqw, 58px);
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -1.5px;
}
.point-detail {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
  color: #c0d6c9;
  margin-top: 4px;
}
.point-detail .negative {
  color: #ffc0ae;
}
.player-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.player-actions button {
  font: inherit;
  font-size: 13px;
  min-height: 40px;
  border: 1px solid #e4eadd60;
  color: #253e33;
  background: #f4f3e9;
  border-radius: 6px;
  cursor: pointer;
  padding: 4px;
  white-space: nowrap;
}
.player-actions button:hover:not(:disabled) {
  background: #fff;
}
.player-actions button:disabled {
  opacity: 0.4;
  cursor: default;
}
.stick-area {
  position: absolute;
  left: 0;
  right: 0;
  top: 6px;
  height: 8px;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.declaration-stick {
  display: block;
  width: 80px;
  height: 6px;
  background: linear-gradient(#fffdf1, #dcd9c9);
  border: 1px solid #bebead;
  border-radius: 2px;
  box-shadow: 0 2px 3px #001e1a80;
  position: relative;
}
.declaration-stick i {
  position: absolute;
  width: 5px;
  height: 5px;
  background: #cc3436;
  border-radius: 50%;
  top: 0;
  left: calc(50% - 2.5px);
}
@container player (max-height:190px) and (min-width:321px) {
  .player-content {
    display: grid;
    grid-template-columns: minmax(90px, 1fr) minmax(100px, 1.1fr) minmax(
        145px,
        1.3fr
      );
    align-items: center;
    padding: 22px 12px 10px;
    gap: 12px;
  }
  .points {
    font-size: clamp(28px, 7cqw, 48px);
  }
  .player-actions {
    gap: 4px;
  }
  .player-actions button {
    min-height: 42px;
  }
  .point-detail {
    font-size: 10px;
  }
  .player-name {
    font-size: 14px;
  }
}
@container player (max-width:260px) {
  .player-content {
    padding: 22px 10px 9px;
    gap: 5px;
  }
  .wind-tile {
    width: 28px;
    height: 29px;
    font-size: 21px;
  }
  .player-name {
    font-size: 13px;
  }
  .points {
    font-size: 30px;
  }
  .player-actions button {
    font-size: 12px;
    min-height: 36px;
  }
  .player-caption {
    font-size: 10px;
  }
  .point-detail {
    font-size: 10px;
  }
}

@container player (max-width:320px) and (max-height:160px) {
  .player-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 18px 8px 7px;
    gap: 5px;
    align-items: center;
  }
  .player-heading {
    gap: 5px;
  }
  .player-caption,
  .point-detail {
    display: none;
  }
  .score-block {
    text-align: right;
  }
  .points {
    font-size: 27px;
  }
  .player-actions {
    grid-column: 1/-1;
  }
  .player-actions button {
    min-height: 32px;
    font-size: 12px;
  }
  .player-name {
    font-size: 12px;
  }
  .wind-tile {
    height: 26px;
    width: 23px;
    font-size: 20px;
  }
}

@container player (max-height:100px) and (min-width:281px) {
  .player-content {
    display: grid;
    grid-template-columns: minmax(60px, 1fr) minmax(72px, 1fr) minmax(
        114px,
        1.3fr
      );
    align-items: center;
    gap: 6px;
    padding: 18px 7px 5px;
  }
  .player-actions {
    grid-column: auto;
    gap: 3px;
  }
  .player-actions button {
    font-size: 11px;
    min-height: 32px;
    padding: 2px;
  }
  .points {
    font-size: 26px;
  }
  .player-name {
    font-size: 11px;
  }
  .player-heading {
    gap: 4px;
  }
  .wind-tile {
    width: 22px;
    height: 25px;
    font-size: 19px;
  }
  .point-detail,
  .player-caption {
    display: none;
  }
}
</style>
