<template>
  <main class="scoreboard-page">
    <div class="workspace-toolbar">
      <h1>面麻记分</h1>
      <select v-model="preference" aria-label="记分布局">
        <option
          v-for="option in layoutOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <div class="workspace-actions">
        <button type="button" :disabled="!ready || saving" @click="openPlayers">
          玩家</button
        ><button
          type="button"
          :disabled="!ready || saving"
          @click="openLibrary"
        >
          历史对局</button
        ><button
          class="new-game"
          type="button"
          :disabled="!ready || saving"
          @click="openSetup"
        >
          新对局
        </button>
      </div>
    </div>
    <div v-if="error" class="error-banner" role="alert">
      <span>{{ error }}</span
      ><button type="button" @click="reload">重新载入</button
      ><button type="button" aria-label="关闭提示" @click="error = ''">
        ×
      </button>
    </div>
    <section v-if="!game" class="empty-board" aria-label="未开局">
      <p>{{ ready ? "暂无进行中的对局" : "正在载入" }}</p>
      <button
        v-if="ready"
        type="button"
        class="primary-button"
        @click="openSetup"
      >
        新对局
      </button>
    </section>
    <section
      v-else
      ref="boardElement"
      class="board-workspace"
      :class="resolved"
      aria-label="四家记分牌桌"
    >
      <div class="board-center" :style="centerStyle">
        <div class="round-info">
          <h2>{{ roundTitle(game.state) }}</h2>
          <span>{{ game.state.honba }} 本场</span
          ><span class="pool-count"><i></i> × {{ game.state.sticks }}</span
          ><span v-if="game.state.finished" class="finished-status"
            >已结束</span
          >
        </div>
        <div class="table-controls" aria-label="公共操作">
          <button type="button" :disabled="!ready || saving" @click="rollDice">
            骰子
          </button>
          <button type="button" :disabled="!canPlay" @click="openDraw">
            流局
          </button>
          <button type="button" :disabled="!canPlay" @click="openPao">
            包牌
          </button>
          <button type="button" :disabled="!canPlay" @click="openAdjust">
            调整
          </button>
          <button
            type="button"
            :disabled="saving || !game.events.length"
            @click="showModal('undo')"
          >
            撤销
          </button>
          <button type="button" @click="showModal('rules')">规则</button>
          <button
            type="button"
            :disabled="saving"
            @click="showModal('history')"
          >
            记录
          </button>
          <button
            type="button"
            :disabled="saving"
            @click="downloadBackup([game])"
          >
            导出
          </button>
          <button type="button" :disabled="!canPlay" @click="showModal('end')">
            结束
          </button>
        </div>
      </div>
      <div
        v-for="(name, seat) in game.names"
        :key="seat"
        class="player-position"
        :class="`seat-${seat}`"
        :style="positionStyle(seat)"
      >
        <div class="player-rotation" :style="rotationStyle(seat)">
          <PlayerPanel
            :name="name"
            :seat="seat"
            :wind="seatWind(game.state, seat)"
            :points="game.state.scores[seat]"
            :is-dealer="game.state.dealer === seat"
            :rank="ranking.indexOf(seat) + 1"
            :leader-gap="
              game.state.scores[ranking[0]] - game.state.scores[seat]
            "
            :riichi="game.state.riichi[seat]"
            :delta="lastEvent?.deltas[seat] || 0"
            :disabled="!canPlay"
            @riichi="openRiichi"
            @win="openWin"
          />
        </div>
      </div>
      <div v-if="resolved === 'flat'" class="live-history">
        <span v-if="lastEvent">{{ lastEvent.label }}</span
        ><span v-else
          >{{ game.rules.length === "south" ? "半庄战" : "东风战" }} ·
          {{ game.rules.startingPoints.toLocaleString() }} 点起</span
        ><span class="save-state">{{ saving ? "保存中" : "已保存" }}</span>
      </div>
    </section>
    <ScoreDialog
      v-if="modal"
      :title="dialogTitle"
      :rotation="dialogRotation"
      @close="closeModal"
    >
      <p v-if="dialogError" class="form-error" role="alert">
        {{ dialogError }}
      </p>

      <template v-if="modal === 'dice'">
        <div class="dice-result" :aria-busy="diceRolling">
          <div class="dice-pair" :class="{ rolling: diceRolling }">
            <template v-if="diceResult"
              ><DiceFace :value="diceResult[0]" /><DiceFace
                :value="diceResult[1]"
            /></template>
            <template v-else
              ><span class="die-placeholder" aria-hidden="true">···</span
              ><span class="die-placeholder" aria-hidden="true"
                >···</span
              ></template
            >
          </div>
          <p class="dice-total" role="status" aria-live="polite">
            {{
              diceRolling
                ? "投掷中…"
                : diceResult
                ? `合计 ${diceResult[0] + diceResult[1]} 点`
                : ""
            }}
          </p>
        </div>
        <div class="dialog-actions">
          <button type="button" class="soft-button" @click="closeModal">
            关闭</button
          ><button
            type="button"
            class="primary-button"
            :disabled="diceRolling"
            @click="rollDice"
          >
            再投一次
          </button>
        </div>
      </template>
      <form v-else-if="modal === 'setup'" @submit.prevent="startGame">
        <div class="name-grid">
          <label v-for="(wind, seat) in WINDS" :key="wind"
            ><span :class="{ 'east-label': seat === 0 }">起始{{ wind }}家</span>
            <select
              v-model="setupNames[seat]"
              :aria-label="`起始${wind}家玩家`"
              required
            >
              <option value="" disabled>选择玩家</option>
              <option
                v-for="name in players"
                :key="name"
                :value="name"
                :disabled="
                  setupNames.includes(name) && setupNames[seat] !== name
                "
              >
                {{ name }}
              </option>
            </select>
          </label>
        </div>
        <div class="random-dealer-control">
          <button
            class="soft-button"
            type="button"
            :disabled="saving || !canRandomizeDealer"
            @click="randomizeDealer"
          >
            随机东家
          </button>
          <span v-if="dealerRandomized && setupNames[0]" role="status"
            >起始东家：{{ setupNames[0] }}</span
          >
        </div>
        <div class="add-player">
          <input
            v-model="newPlayerName"
            aria-label="新增玩家姓名"
            placeholder="新增玩家姓名"
            maxlength="24"
            @keydown.enter.prevent="addPlayer"
          /><button
            type="button"
            class="soft-button"
            :disabled="saving || !newPlayerName.trim()"
            @click="addPlayer"
          >
            添加玩家
          </button>
        </div>
        <details class="setup-options">
          <summary>对局规则</summary>
          <div class="form-grid">
            <label
              >对局长度<select v-model="setupRules.length">
                <option value="south">半庄战 · 东南</option>
                <option value="east">东风战 · 东场</option>
              </select></label
            ><label
              >起始点数<input
                v-model.number="setupRules.startingPoints"
                type="number"
                min="1000"
                max="100000"
                step="100"
                required /></label
            ><label
              >返还点数<input
                v-model.number="setupRules.returnPoints"
                type="number"
                min="1000"
                max="100000"
                step="100"
                required /></label
            ><label
              >多家和<select v-model.number="setupRules.maxWinners">
                <option :value="1">单家和</option>
                <option :value="2">最多两家和</option>
                <option :value="3">最多三家和</option>
              </select></label
            >
          </div>
          <fieldset class="uma-field">
            <legend>马点 · 一至四位</legend>
            <div>
              <label v-for="(_, index) in setupRules.uma" :key="index"
                ><span>{{ index + 1 }} 位</span
                ><input
                  v-model.number="setupRules.uma[index]"
                  :aria-label="`${index + 1}位马点`"
                  type="number"
                  min="-1000"
                  max="1000"
                  step="1"
                  required
              /></label>
            </div>
          </fieldset>
          <div class="rule-toggles">
            <label
              ><input
                v-model="setupRules.bankruptcy"
                type="checkbox"
              />负点终局</label
            ><label
              ><input
                v-model="setupRules.dealerFinish"
                type="checkbox"
              />末亲一位和了止</label
            ><label
              ><input
                v-model="setupRules.extension"
                type="checkbox"
              />未达返还点时延长一场</label
            ><label
              ><input
                v-model="setupRules.kiriage"
                type="checkbox"
              />切上满贯</label
            ><label
              ><input
                v-model="setupRules.kazoeYakuman"
                type="checkbox"
              />累计役满</label
            >
          </div>
        </details>
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            取消</button
          ><button
            class="primary-button"
            type="submit"
            :disabled="
              saving ||
              setupNames.some((name) => !name) ||
              new Set(setupNames).size !== 4
            "
          >
            开始对局<ArrowForwardRound class="icon" />
          </button>
        </div>
      </form>

      <form v-else-if="modal === 'win' && game" @submit.prevent="confirmWin">
        <div class="method-tabs" role="group" aria-label="和牌方式">
          <button
            type="button"
            :class="{ active: winMethod === 'ron' }"
            @click="changeMethod('ron')"
          >
            荣和</button
          ><button
            type="button"
            :class="{ active: winMethod === 'tsumo' }"
            @click="changeMethod('tsumo')"
          >
            自摸
          </button>
        </div>
        <label v-if="winMethod === 'ron'" class="full-label"
          >放铳玩家<select v-model.number="discarder">
            <option
              v-for="(name, seat) in game.names"
              :key="seat"
              :value="seat"
              :disabled="winnerSeats.includes(seat)"
            >
              {{ name }} · {{ seatWind(game.state, seat) }}家
            </option>
          </select></label
        >
        <div v-for="seat in winnerSeats" :key="seat" class="winner-input">
          <div class="winner-heading">
            <strong
              >{{ game.names[seat]
              }}<span
                >{{ seatWind(game.state, seat) }}家{{
                  seat === game.state.dealer ? " · 庄家" : ""
                }}</span
              ></strong
            ><button
              v-if="winnerSeats.length > 1"
              type="button"
              @click="removeWinner(seat)"
            >
              移除
            </button>
          </div>
          <label class="full-label"
            >计分方式<select v-model.number="handValues[seat].yakuman">
              <option :value="0">按翻符计算</option>
              <option v-for="count in 6" :key="count" :value="count">
                {{ count === 1 ? "役满" : `${count} 倍役满` }}
              </option>
            </select></label
          >
          <div v-if="handValues[seat].yakuman === 0" class="form-grid">
            <label
              >翻数<select
                v-model.number="handValues[seat].han"
                aria-label="翻数"
              >
                <option v-for="han in 13" :key="han" :value="han">
                  {{ han }} 翻
                </option>
              </select></label
            ><label
              >符数<select
                aria-label="符数"
                v-model.number="handValues[seat].fu"
                :disabled="handValues[seat].han >= 5"
              >
                <option v-for="fu in fuOptions" :key="fu" :value="fu">
                  {{ fu }} 符
                </option>
              </select></label
            >
          </div>
          <div class="form-grid pao-input">
            <label
              >包牌者<select
                v-model.number="handValues[seat].paoSeat"
                :aria-label="`${game.names[seat]}的包牌者`"
              >
                <option :value="-1">无包牌</option>
                <option
                  v-for="(name, payer) in game.names"
                  :key="payer"
                  :value="payer"
                  :disabled="payer === seat"
                >
                  {{ name }}
                </option>
              </select></label
            >
            <label v-if="handValues[seat].paoSeat !== -1"
              >包牌役满倍数<select
                v-model.number="handValues[seat].paoYakuman"
                :aria-label="`${game.names[seat]}的包牌倍数`"
              >
                <option v-for="count in 6" :key="count" :value="count">
                  {{ count }} 倍役满
                </option>
              </select></label
            >
          </div>
          <label
            v-if="handValues[seat].paoSeat !== -1 && winMethod === 'ron'"
            class="full-label"
            >本场支付<select v-model="handValues[seat].paoHonba">
              <option value="liable">包牌者支付全部本场</option>
              <option value="discarder">放铳者支付全部本场</option>
            </select></label
          >
        </div>
        <div
          v-if="
            winMethod === 'ron' && winnerSeats.length < game.rules.maxWinners
          "
          class="additional-winners"
        >
          <span>增加和牌玩家</span
          ><button
            v-for="seat in additionalSeats"
            :key="seat"
            type="button"
            @click="winnerSeats.push(seat)"
          >
            ＋ {{ game.names[seat] }}
          </button>
        </div>
        <div v-if="winPreview.game" class="settlement-preview">
          <div class="preview-heading">
            <span>结算预览</span
            ><span
              >{{ game.state.honba }} 本场 · {{ game.state.sticks }} 供托</span
            >
          </div>
          <div
            v-for="(name, seat) in game.names"
            :key="seat"
            class="preview-row"
          >
            <span>{{ name }}</span
            ><strong
              :class="{
                positive: previewDelta(seat) > 0,
                negative: previewDelta(seat) < 0,
              }"
              >{{ previewDelta(seat) > 0 ? "+" : ""
              }}{{ previewDelta(seat).toLocaleString() }}</strong
            ><span>{{
              winPreview.game.state.scores[seat].toLocaleString()
            }}</span>
          </div>
          <p v-if="winnerSeats.length > 1">
            供托归放铳者下家方向最近的和牌者，本场分别支付。
          </p>
        </div>
        <p v-else class="form-error">{{ winPreview.error }}</p>
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            取消</button
          ><button
            class="primary-button"
            type="submit"
            :disabled="saving || !winPreview.game"
          >
            确认记分<CheckRound class="icon" />
          </button>
        </div>
      </form>

      <form v-else-if="modal === 'draw' && game" @submit.prevent="confirmDraw">
        <div class="method-tabs" role="group" aria-label="流局方式">
          <button
            type="button"
            :class="{ active: !abortive }"
            @click="abortive = false"
          >
            普通流局</button
          ><button
            type="button"
            :class="{ active: abortive }"
            @click="abortive = true"
          >
            途中流局
          </button>
        </div>
        <template v-if="!abortive"
          ><p class="form-intro">选择本局听牌的玩家。</p>
          <div class="tenpai-grid">
            <label
              v-for="(name, seat) in game.names"
              :key="seat"
              :class="{ checked: tenpaiSeats.includes(seat) }"
              ><input
                v-model="tenpaiSeats"
                type="checkbox"
                :value="seat"
              /><span>{{ seatWind(game.state, seat) }}</span
              ><strong>{{ name }}</strong
              ><small>{{
                tenpaiSeats.includes(seat) ? "听牌" : "未听"
              }}</small></label
            >
          </div>
          <p class="form-hint">
            {{
              tenpaiSeats.length === 0 || tenpaiSeats.length === 4
                ? "四家状态一致，点数不移动。"
                : "不听罚符合计 3000 点，按听牌人数分配。"
            }}庄家听牌则连庄。
          </p></template
        ><template v-else
          ><label class="full-label"
            >流局原因<select v-model="abortReason">
              <option>九种九牌</option>
              <option>四风连打</option>
              <option>四杠散了</option>
              <option>四家立直</option>
              <option>其他途中流局</option>
            </select></label
          >
          <p class="form-hint">
            途中流局保留供托，庄家连庄，本场加一。
          </p></template
        >
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            取消</button
          ><button class="primary-button" type="submit" :disabled="saving">
            确认流局
          </button>
        </div>
      </form>

      <form
        v-else-if="modal === 'adjust' && game"
        @submit.prevent="confirmAdjust"
      >
        <p class="form-intro">填写各家增加或减少的点数，合计保持为 0。</p>
        <div class="adjust-rows">
          <label v-for="(name, seat) in game.names" :key="seat"
            ><span>{{ name }}</span
            ><input
              v-model.number="adjustments[seat]"
              :aria-label="`${name}调整点数`"
              type="number"
              step="100"
              required
          /></label>
        </div>
        <label class="full-label"
          >调整原因<input
            v-model="adjustReason"
            placeholder="例如：误记修正、罚点"
            maxlength="100"
            required
        /></label>
        <p class="adjust-total" :class="{ negative: adjustmentTotal !== 0 }">
          合计 {{ adjustmentTotal > 0 ? "+" : ""
          }}{{ adjustmentTotal.toLocaleString() }} 点
        </p>
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            取消</button
          ><button
            class="primary-button"
            type="submit"
            :disabled="saving || adjustmentTotal !== 0"
          >
            保存调整
          </button>
        </div>
      </form>

      <template v-else-if="modal === 'riichi' && game"
        ><p class="confirm-message">
          <strong>{{ game.names[activeSeat] }}</strong> 宣告立直
        </p>
        <p class="form-intro">支付 1000 点作为供托，本局记录立直状态。</p>
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            取消</button
          ><button
            class="primary-button"
            type="button"
            :disabled="saving"
            @click="commit({ type: 'riichi', seat: activeSeat })"
          >
            确认立直
          </button>
        </div></template
      >
      <template v-else-if="modal === 'undo' && game"
        ><p class="confirm-message">撤销最近一条操作？</p>
        <p class="form-intro">{{ lastEvent?.label }}</p>
        <p class="form-hint">分数、供托、场次和立直状态将一同恢复。</p>
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            保留记录</button
          ><button
            class="primary-button"
            type="button"
            :disabled="saving"
            @click="undo"
          >
            确认撤销
          </button>
        </div></template
      >
      <template v-else-if="modal === 'end' && game"
        ><p class="confirm-message">确认结束对局？</p>
        <p class="form-intro">按当前点数计算排名和马点，剩余供托交给一位。</p>
        <div class="dialog-actions">
          <button class="soft-button" type="button" @click="closeModal">
            继续打牌</button
          ><button
            class="primary-button"
            type="button"
            :disabled="saving"
            @click="commit({ type: 'end' })"
          >
            结束并结算
          </button>
        </div></template
      >

      <template v-else-if="modal === 'rules' && game"
        ><div class="rules-summary">
          <div>
            <span>对局</span
            ><strong>{{
              game.rules.length === "south" ? "半庄战" : "东风战"
            }}</strong>
          </div>
          <div>
            <span>起始 / 返还</span
            ><strong
              >{{ game.rules.startingPoints }} /
              {{ game.rules.returnPoints }}</strong
            >
          </div>
          <div>
            <span>马点</span
            ><strong>{{ game.rules.uma.map(signed).join(" / ") }}</strong>
          </div>
          <div>
            <span>多家和</span
            ><strong>最多 {{ game.rules.maxWinners }} 家</strong>
          </div>
          <div v-for="rule in ruleDescriptions" :key="rule.label">
            <span>{{ rule.label }}</span
            ><strong>{{ rule.value ? "开启" : "关闭" }}</strong>
          </div>
        </div>
        <p class="form-hint">同分按起始座位排序。</p>
        <div class="dialog-actions">
          <button class="primary-button" type="button" @click="closeModal">
            知道了
          </button>
        </div></template
      >

      <template v-else-if="modal === 'players'">
        <form class="add-player" @submit.prevent="addPlayer">
          <input
            v-model="newPlayerName"
            aria-label="新增玩家姓名"
            placeholder="玩家姓名"
            maxlength="24"
            required
          /><button class="primary-button" type="submit" :disabled="saving">
            添加
          </button>
        </form>
        <p v-if="!players.length" class="empty-library">暂无玩家</p>
        <div class="roster-list">
          <div v-for="name in players" :key="name">
            <span>{{ name }}</span
            ><button
              class="delete-record"
              type="button"
              :aria-label="`移除玩家${name}`"
              :disabled="saving"
              @click="removePlayer(name)"
            >
              移除
            </button>
          </div>
        </div>
      </template>
      <form v-else-if="modal === 'pao' && game" @submit.prevent="confirmPao">
        <div v-for="(name, seat) in game.names" :key="seat" class="pao-row">
          <strong>{{ name }}</strong
          ><label
            >包牌者<select
              v-model.number="paoSeats[seat]"
              :aria-label="`${name}的责任玩家`"
            >
              <option :value="-1">无包牌</option>
              <option
                v-for="(payerName, payer) in game.names"
                :key="payer"
                :value="payer"
                :disabled="payer === seat"
              >
                {{ payerName }}
              </option>
            </select></label
          ><label v-if="paoSeats[seat] !== -1"
            >役满倍数<select
              v-model.number="paoCounts[seat]"
              :aria-label="`${name}责任役满倍数`"
            >
              <option v-for="count in 6" :key="count" :value="count">
                {{ count }} 倍
              </option>
            </select></label
          >
        </div>
        <div class="dialog-actions">
          <button type="button" class="soft-button" @click="closeModal">
            取消</button
          ><button type="submit" class="primary-button" :disabled="saving">
            保存包牌
          </button>
        </div>
      </form>
      <template v-else-if="modal === 'history' && game">
        <section class="timeline-panel" aria-label="本场记录">
          <div class="section-title">
            <h2>本场记录</h2>
            <span v-if="game.events.length" class="muted"
              >共 {{ game.events.length }} 条 · 最近在前</span
            >
          </div>
          <div v-if="!game.events.length" class="empty-timeline">
            <span>暂无操作记录</span>
          </div>
          <ol v-else class="timeline">
            <li v-for="event in visibleEvents" :key="event.id">
              <span class="event-dot" :class="event.type"></span>
              <div class="event-content">
                <div class="event-meta">
                  <span
                    >{{ roundTitle(event.before) }} ·
                    {{ event.before.honba }} 本场</span
                  ><time>{{ time(event.createdAt) }}</time>
                </div>
                <p>{{ event.label }}</p>
                <div class="event-deltas">
                  <span
                    v-for="(delta, seat) in event.deltas"
                    v-show="delta"
                    :key="seat"
                    :class="{ negative: delta < 0 }"
                    >{{ game.names[seat] }} {{ delta > 0 ? "+" : ""
                    }}{{ delta.toLocaleString() }}</span
                  >
                </div>
              </div>
            </li>
          </ol>
          <button
            v-if="game.events.length > historyLimit"
            class="show-more"
            type="button"
            @click="historyLimit += 20"
          >
            查看更多记录
          </button>
        </section>
        <section
          v-if="game.state.finished"
          class="result-card"
          aria-label="终局成绩"
        >
          <div class="section-title">
            <div>
              <h2>终局成绩</h2>
            </div>
            <span class="muted">{{ game.state.finishReason }}</span>
          </div>
          <div class="result-grid">
            <div v-for="row in results" :key="row.seat" class="result-player">
              <span class="result-rank">0{{ row.rank }}</span
              ><span>{{ row.name }}</span
              ><strong>{{ row.score.toLocaleString() }}</strong
              ><span class="final-score" :class="{ negative: row.final < 0 }"
                >{{ row.final > 0 ? "+" : "" }}{{ row.final.toFixed(1) }}</span
              >
            </div>
          </div>
          <p class="rules-note">
            最终成绩包含返还点、马点和头名奖励；同分按起始座位顺序。
          </p>
        </section>
      </template>
      <template v-else-if="modal === 'delete' && deletingGame">
        <p class="confirm-message">删除这场对局？</p>
        <p class="form-intro">
          {{ deletingGame.names.join(" · ") }}<br />{{
            date(deletingGame.createdAt)
          }}
          · {{ deletingGame.events.length }} 条记录
        </p>
        <p class="form-hint">删除后无法恢复。</p>
        <div class="dialog-actions">
          <button
            type="button"
            class="soft-button"
            :disabled="saving"
            @click="showModal('library')"
          >
            取消
          </button>
          <button
            type="button"
            class="danger-button"
            :disabled="saving"
            @click="confirmDelete"
          >
            确认删除
          </button>
        </div>
      </template>
      <template v-else-if="modal === 'library'">
        <div class="library-tools">
          <button
            class="soft-button"
            type="button"
            :disabled="saving || !ready || !games.length"
            @click="downloadBackup(games)"
          >
            <FileDownloadRound class="small-icon" />全部导出
          </button>
          <button
            class="soft-button"
            type="button"
            :disabled="saving || !ready"
            @click="importInput?.click()"
          >
            <FileUploadRound class="small-icon" />导入备份
          </button>
          <input
            ref="importInput"
            type="file"
            accept="application/json,.json"
            hidden
            @change="importBackup"
          />
        </div>
        <p v-if="notice" class="success-note" role="status">{{ notice }}</p>
        <div class="game-library">
          <div
            v-for="record in games"
            :key="record.id"
            class="library-item"
            :class="{ current: record.id === game?.id }"
          >
            <button
              class="library-select"
              type="button"
              :disabled="saving"
              @click="selectGame(record)"
            >
              <span class="library-summary">
                <span class="library-date">{{ date(record.createdAt) }}</span>
                <strong>{{ record.names.join(" · ") }}</strong>
                <span
                  >{{ roundTitle(record.state) }} ·
                  {{ record.events.length }} 条记录</span
                >
              </span>
              <span class="record-state"
                >{{
                  record.id === game?.id
                    ? "当前"
                    : record.state.finished
                    ? "已结束"
                    : "继续对局"
                }}<ChevronRightRound class="small-icon"
              /></span>
            </button>
            <button
              type="button"
              class="delete-record"
              :aria-label="`删除${record.names.join('、')}的对局`"
              :disabled="saving"
              @click="openDelete(record)"
            >
              <DeleteOutlineRound class="small-icon" />删除
            </button>
          </div>
        </div>
        <p v-if="!games.length" class="empty-library">暂无历史对局</p>
      </template>
    </ScoreDialog>
    <div v-if="toast" class="score-toast" role="status">
      <CheckRound class="small-icon" />{{ toast }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  CheckRound,
  ChevronRightRound,
  FileDownloadRound,
  FileUploadRound,
  ArrowForwardRound,
  DeleteOutlineRound,
} from "@vicons/material";
import DiceFace from "../components/scoreboard/DiceFace.vue";
import { rollDicePair, randomStartingSeats } from "../scoreboard/random";
import PlayerPanel from "../components/scoreboard/PlayerPanel.vue";
import ScoreDialog from "../components/scoreboard/ScoreDialog.vue";
import { useScoreboardLayout } from "../composables/useScoreboardLayout";
import {
  applyAction,
  clone,
  createGame,
  DEFAULT_RULES,
  rankedSeats,
  roundTitle,
  seatWind,
  standings,
  undoAction,
  validateRules,
  WINDS,
} from "../scoreboard/game";
import type {
  Four,
  Game,
  GameAction,
  LayoutPreference,
  Winner,
} from "../scoreboard/game";
import {
  exportGames,
  importGames,
  loadGames,
  MAX_BACKUP_BYTES,
  parseBackup,
  saveGame,
  deleteGame,
  loadPlayers,
  savePlayers,
} from "../scoreboard/storage";
import { tableBoxes } from "../scoreboard/layout";

type Modal =
  | ""
  | "setup"
  | "win"
  | "draw"
  | "adjust"
  | "riichi"
  | "undo"
  | "end"
  | "rules"
  | "delete"
  | "library"
  | "players"
  | "pao"
  | "history"
  | "dice";
const ACTIVE_KEY = "mahjong.scoreboard.active.v1";
const DEFAULT_KEY = "mahjong.scoreboard.defaults.v1";
const { preference, resolved } = useScoreboardLayout();
const game = ref<Game | null>(null);
const games = ref<Game[]>([]);
const players = ref<string[]>([]);
const newPlayerName = ref("");
const deletingGame = ref<Game | null>(null);
const ready = ref(false),
  saving = ref(false),
  error = ref(""),
  dialogError = ref(""),
  modal = ref<Modal>("");
const activeSeat = ref(0),
  historyLimit = ref(20),
  toast = ref(""),
  notice = ref("");
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const setupNames = ref<string[]>(["", "", "", ""]);
const setupRules = ref(clone(DEFAULT_RULES));
const dealerRandomized = ref(false);
const canRandomizeDealer = computed(
  () =>
    setupNames.value.length === 4 &&
    setupNames.value.every((name) => name.trim()) &&
    new Set(setupNames.value).size === 4
);
function randomizeDealer() {
  if (saving.value || !canRandomizeDealer.value) return;
  try {
    setupNames.value = randomStartingSeats(setupNames.value);
    dealerRandomized.value = true;
    dialogError.value = "";
  } catch (cause) {
    dialogError.value = errorText(cause);
  }
}
const diceResult = ref<[number, number] | null>(null);
const diceRolling = ref(false);
let diceTimer: ReturnType<typeof setTimeout> | undefined;
function stopDice() {
  if (diceTimer) clearTimeout(diceTimer);
  diceTimer = undefined;
  diceRolling.value = false;
}
function rollDice() {
  if (!game.value || !ready.value || saving.value || diceRolling.value) return;
  showModal("dice");
  diceResult.value = null;
  diceRolling.value = true;
  diceTimer = setTimeout(() => {
    try {
      diceResult.value = rollDicePair();
    } catch (cause) {
      dialogError.value = errorText(cause);
    } finally {
      diceRolling.value = false;
      diceTimer = undefined;
    }
  }, 480);
}
const winMethod = ref<"ron" | "tsumo">("ron"),
  discarder = ref(1),
  winnerSeats = ref<number[]>([0]);
const handValues = ref<Winner[]>(
  [0, 1, 2, 3].map(() => ({
    seat: 0,
    han: 1,
    fu: 30,
    yakuman: 0,
    paoSeat: -1,
    paoYakuman: 1,
    paoHonba: "liable",
  }))
);
const tenpaiSeats = ref<number[]>([]),
  abortive = ref(false),
  abortReason = ref("九种九牌");
const adjustments = ref<Four<number>>([0, 0, 0, 0]),
  adjustReason = ref("");
const importInput = ref<HTMLInputElement | null>(null);
const layoutOptions: { value: LayoutPreference; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "table", label: "四向牌桌" },
  { value: "flat", label: "平铺记分" },
];
const ranking = computed(() =>
  game.value ? rankedSeats(game.value.state) : []
);
const results = computed(() => (game.value ? standings(game.value) : []));
const lastEvent = computed(
  () => game.value?.events[game.value.events.length - 1]
);
const visibleEvents = computed(
  () => game.value?.events.slice(-historyLimit.value).reverse() || []
);
const canPlay = computed(
  () =>
    ready.value && !saving.value && !!game.value && !game.value.state.finished
);
const additionalSeats = computed(() =>
  [0, 1, 2, 3].filter(
    (seat) => seat !== discarder.value && !winnerSeats.value.includes(seat)
  )
);
const adjustmentTotal = computed(() =>
  adjustments.value.reduce((a, b) => a + (Number(b) || 0), 0)
);
const dialogTitle = computed(
  () =>
    ({
      setup: "新对局",
      players: "玩家名单",
      pao: "包牌设置",
      history: "本场记录",
      win: "和牌结算",
      draw: "本局流局",
      adjust: "调整点数",
      riichi: "确认立直",
      undo: "撤销操作",
      end: "结束对局",
      rules: "本场规则",
      library: "历史对局",
      dice: "投掷骰子",
      delete: "删除对局",
      "": "",
    }[modal.value])
);
const dialogRotation = computed(() =>
  resolved.value === "table" && ["win", "riichi"].includes(modal.value)
    ? [0, -90, 180, 90][activeSeat.value]
    : 0
);
const ruleDescriptions = computed(() => [
  { label: "负点终局", value: game.value?.rules.bankruptcy },
  { label: "末亲一位和了止", value: game.value?.rules.dealerFinish },
  { label: "未达返还点时延长一场", value: game.value?.rules.extension },
  { label: "切上满贯", value: game.value?.rules.kiriage },
  { label: "累计役满", value: game.value?.rules.kazoeYakuman },
]);
const fuOptions = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const winAction = (): GameAction => ({
  type: "win",
  method: winMethod.value,
  from: discarder.value,
  winners: winnerSeats.value.map((seat) => ({
    seat,
    ...handValues.value[seat],
  })) as Winner[],
});
const winPreview = computed<{ game: Game | null; error: string }>(() => {
  if (modal.value !== "win" || !game.value) return { game: null, error: "" };
  try {
    return { game: applyAction(game.value, winAction()), error: "" };
  } catch (cause) {
    return { game: null, error: errorText(cause) };
  }
});
const previewDelta = (seat: number) =>
  winPreview.value.game && game.value
    ? winPreview.value.game.state.scores[seat] - game.value.state.scores[seat]
    : 0;
function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : "操作暂时未完成，请重试";
}
function rememberActive() {
  try {
    if (game.value) localStorage.setItem(ACTIVE_KEY, game.value.id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* 对局本身仍保存在数据库。 */
  }
}
function notify(message: string) {
  toast.value = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 2800);
}
function updateList(record: Game) {
  games.value = [
    record,
    ...games.value.filter((item) => item.id !== record.id),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
async function reload() {
  if (saving.value) return;
  ready.value = false;
  error.value = "";
  try {
    games.value = await loadGames();
    players.value = await loadPlayers();
    let selected: string | null = null;
    try {
      selected = localStorage.getItem(ACTIVE_KEY);
    } catch {
      /* 默认打开最近对局。 */
    }
    const record =
      games.value.find((item) => item.id === selected) || games.value[0];
    game.value = record || null;
    rememberActive();
    ready.value = true;
  } catch (cause) {
    error.value = errorText(cause);
  }
}
onMounted(() => {
  reload();
});
onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
  stopDice();
});
function closeModal() {
  if (saving.value) return;
  if (modal.value === "dice") stopDice();
  if (modal.value === "delete") {
    showModal("library");
    return;
  }
  modal.value = "";
  dialogError.value = "";
}
function showModal(value: Modal) {
  dialogError.value = "";
  modal.value = value;
}
async function persist(next: Game) {
  if (saving.value || !ready.value || !game.value) return;
  saving.value = true;
  dialogError.value = "";
  error.value = "";
  try {
    await saveGame(next, game.value.revision);
    game.value = next;
    updateList(next);
    rememberActive();
    modal.value = "";
    notify("已保存");
  } catch (cause) {
    dialogError.value = errorText(cause);
    error.value = errorText(cause);
  } finally {
    saving.value = false;
  }
}
async function commit(action: GameAction) {
  if (!game.value) return;
  try {
    await persist(applyAction(game.value, action));
  } catch (cause) {
    dialogError.value = errorText(cause);
  }
}
async function undo() {
  if (!game.value) return;
  try {
    await persist(undoAction(game.value));
  } catch (cause) {
    dialogError.value = errorText(cause);
  }
}
function openSetup() {
  dealerRandomized.value = false;
  setupNames.value = ["", "", "", ""];
  setupRules.value = clone(game.value?.rules || DEFAULT_RULES);
  try {
    const saved = localStorage.getItem(DEFAULT_KEY);
    if (saved) {
      const rules = JSON.parse(saved).rules;
      validateRules(rules);
      setupRules.value = clone(rules);
    }
  } catch {
    /* 使用默认规则。 */
  }
  newPlayerName.value = "";
  showModal("setup");
}
async function startGame() {
  if (saving.value) return;
  try {
    const next = createGame(setupNames.value, setupRules.value);
    saving.value = true;
    await saveGame(next, null);
    game.value = next;
    updateList(next);
    rememberActive();
    historyLimit.value = 20;
    try {
      localStorage.setItem(DEFAULT_KEY, JSON.stringify({ rules: next.rules }));
    } catch {
      /* 偏好保存不影响新对局。 */
    }
    modal.value = "";
    notify("对局已创建");
  } catch (cause) {
    dialogError.value = errorText(cause);
  } finally {
    saving.value = false;
  }
}
function openRiichi(seat: number) {
  activeSeat.value = seat;
  showModal("riichi");
}
function openWin(seat: number, method: "ron" | "tsumo") {
  if (!game.value) return;
  activeSeat.value = seat;
  winnerSeats.value = [seat];
  winMethod.value = method;
  discarder.value = (seat + 1) % 4;
  handValues.value = [0, 1, 2, 3].map((player) => ({
    seat: player,
    han: 1,
    fu: 30,
    yakuman:
      (game.value!.state.pao?.[player] ?? -1) >= 0
        ? game.value!.state.paoYakuman?.[player] || 1
        : 0,
    paoSeat: game.value!.state.pao?.[player] ?? -1,
    paoYakuman: game.value!.state.paoYakuman?.[player] || 1,
    paoHonba: "liable",
  }));
  showModal("win");
}
function changeMethod(method: "ron" | "tsumo") {
  winMethod.value = method;
  if (method === "tsumo") winnerSeats.value = [activeSeat.value];
}
function removeWinner(seat: number) {
  winnerSeats.value = winnerSeats.value.filter((item) => item !== seat);
}
function confirmWin() {
  if (winPreview.value.game) persist(winPreview.value.game);
}
function openDraw() {
  tenpaiSeats.value = [];
  abortive.value = false;
  showModal("draw");
}
function confirmDraw() {
  commit(
    abortive.value
      ? { type: "abort", description: abortReason.value }
      : { type: "draw", tenpai: [...tenpaiSeats.value] }
  );
}
function openAdjust() {
  adjustments.value = [0, 0, 0, 0];
  adjustReason.value = "";
  showModal("adjust");
}
function confirmAdjust() {
  commit({
    type: "adjust",
    deltas: adjustments.value,
    reason: adjustReason.value,
  });
}
async function openLibrary() {
  notice.value = "";
  showModal("library");
  try {
    games.value = await loadGames();
  } catch (cause) {
    dialogError.value = errorText(cause);
  }
}
async function selectGame(record: Game) {
  try {
    const latest = await loadGames();
    const selected = latest.find((item) => item.id === record.id);
    if (!selected) throw new Error("这场记录暂时无法读取");
    games.value = latest;
    game.value = selected;
    rememberActive();
    modal.value = "";
    historyLimit.value = 20;
    error.value = "";
  } catch (cause) {
    dialogError.value = errorText(cause);
  }
}
function openDelete(record: Game) {
  deletingGame.value = record;
  showModal("delete");
}
async function confirmDelete() {
  if (saving.value || !deletingGame.value) return;
  saving.value = true;
  dialogError.value = "";
  try {
    const removedId = deletingGame.value.id;
    await deleteGame(removedId, deletingGame.value.revision);
    games.value = games.value.filter((record) => record.id !== removedId);
    if (game.value?.id === removedId) {
      game.value = games.value[0] || null;
      historyLimit.value = 20;
      rememberActive();
    }
    deletingGame.value = null;
    notice.value = "对局已删除";
    showModal("library");
  } catch (cause) {
    dialogError.value = errorText(cause);
  } finally {
    saving.value = false;
  }
}
function openPlayers() {
  newPlayerName.value = "";
  showModal("players");
}
async function addPlayer() {
  const name = newPlayerName.value.trim();
  if (!name || saving.value) return;
  if (players.value.includes(name)) {
    dialogError.value = "玩家名单中已有这个姓名";
    return;
  }
  saving.value = true;
  try {
    const next = [...players.value, name];
    await savePlayers(next);
    players.value = next.sort((a, b) => a.localeCompare(b, "zh-CN"));
    newPlayerName.value = "";
    dialogError.value = "";
    const empty = setupNames.value.indexOf("");
    if (modal.value === "setup" && empty >= 0) setupNames.value[empty] = name;
  } catch (cause) {
    dialogError.value = errorText(cause);
  } finally {
    saving.value = false;
  }
}
async function removePlayer(name: string) {
  if (saving.value) return;
  saving.value = true;
  try {
    const next = players.value.filter((player) => player !== name);
    await savePlayers(next);
    players.value = next;
    setupNames.value = setupNames.value.map((player) =>
      player === name ? "" : player
    );
  } catch (cause) {
    dialogError.value = errorText(cause);
  } finally {
    saving.value = false;
  }
}
const paoSeats = ref<Four<number>>([-1, -1, -1, -1]);
const paoCounts = ref<Four<number>>([1, 1, 1, 1]);
function openPao() {
  if (!game.value) return;
  paoSeats.value = clone(game.value.state.pao || [-1, -1, -1, -1]);
  paoCounts.value = clone(game.value.state.paoYakuman || [1, 1, 1, 1]);
  showModal("pao");
}
function confirmPao() {
  commit({
    type: "pao",
    liabilities: paoSeats.value,
    yakuman: paoCounts.value,
  });
}
const boardElement = ref<HTMLElement | null>(null);
const boardSize = ref({ width: 0, height: 0 });
let boardObserver: ResizeObserver | undefined;
watch(
  boardElement,
  (element) => {
    boardObserver?.disconnect();
    if (!element) return;
    boardObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      boardSize.value = { width: rect.width, height: rect.height };
    });
    boardObserver.observe(element);
  },
  { flush: "post" }
);
onUnmounted(() => boardObserver?.disconnect());
const boxes = computed(() =>
  tableBoxes(boardSize.value.width, boardSize.value.height)
);
const boxStyle = (box: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  left: `${box.x}px`,
  top: `${box.y}px`,
  width: `${box.width}px`,
  height: `${box.height}px`,
});
const centerStyle = computed(() =>
  resolved.value === "table" ? boxStyle(boxes.value.center) : {}
);
const positionStyle = (seat: number) =>
  resolved.value === "table" ? boxStyle(boxes.value.players[seat]) : {};
const rotationStyle = (seat: number) => {
  if (resolved.value !== "table") return {};
  const box = boxes.value.players[seat];
  const sideways = Math.abs(box.rotation) === 90;
  return {
    width: `${sideways ? box.height : box.width}px`,
    height: `${sideways ? box.width : box.height}px`,
    transform: `translate(-50%,-50%) rotate(${box.rotation}deg)`,
  };
};
function downloadBackup(records: Game[]) {
  const blob = new Blob([exportGames(records)], { type: "application/json" });
  if (blob.size > MAX_BACKUP_BYTES) {
    error.value = "记录较多，请分别导出单场对局";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `面麻记分-${new Date().toLocaleDateString("sv-SE")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("备份已准备好");
}
async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) {
    dialogError.value = "备份文件请控制在 25 MB 以内";
    input.value = "";
    return;
  }
  saving.value = true;
  dialogError.value = "";
  try {
    const imported = parseBackup(await file.text());
    const added = await importGames(imported);
    games.value = await loadGames();
    players.value = await loadPlayers();
    notice.value = `已导入 ${added} 场，跳过 ${
      imported.length - added
    } 场已有记录。`;
  } catch (cause) {
    dialogError.value = errorText(cause);
  } finally {
    saving.value = false;
    input.value = "";
  }
}
const time = (value: string) =>
  new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
const date = (value: string) =>
  new Date(value).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const signed = (value: number) => (value > 0 ? `+${value}` : String(value));
</script>
<style scoped>
/* 弹窗内容由本视图持有，随传送门继续使用同一组局部样式。 */
.form-intro {
  font-size: 12px;
  color: #7c8877;
  line-height: 1.8;
  margin: 0 0 20px;
}
.form-hint {
  font-size: 11px;
  color: #8f967f;
  line-height: 1.8;
  margin: 18px 0 0;
}
.form-error {
  font-size: 12px;
  line-height: 1.7;
  color: #b16347;
  background: #f7ece3;
  padding: 10px 12px;
  border-radius: 7px;
  margin: 0 0 16px;
}
.name-grid,
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.name-grid {
  margin-bottom: 22px;
}
.name-grid label,
.form-grid label,
.full-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  color: #75836c;
}
.name-grid label > span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.name-grid i {
  font-family: "Songti SC", serif;
  font-style: normal;
  color: #466b4b;
}
.name-grid input,
.form-grid input,
.form-grid select,
.full-label input,
.full-label select,
.uma-field input,
.adjust-rows input {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  height: 42px;
  border: 1px solid #dfe3d4;
  background: #fffef9;
  border-radius: 7px;
  padding: 0 11px;
  color: #334e3b;
  font-family: inherit;
  font-size: 13px;
  outline-offset: 2px;
}
.full-label {
  margin-bottom: 16px;
}
.name-grid input:focus,
.form-grid input:focus,
select:focus,
.full-label input:focus,
.uma-field input:focus,
.adjust-rows input:focus {
  outline: 2px solid #69865f80;
  outline-offset: 1px;
}
.uma-field {
  border: 0;
  padding: 0;
  margin: 22px 0;
}
.uma-field legend {
  font-size: 11px;
  color: #75836c;
  padding: 0;
  margin-bottom: 10px;
}
.uma-field > div {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.uma-field label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 10px;
  color: #9a9f8d;
}
.rule-toggles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  font-size: 11px;
  color: #687b5f;
}
.rule-toggles label {
  display: flex;
  align-items: center;
  gap: 7px;
}
.rule-toggles input {
  accent-color: #346444;
  width: 15px;
  height: 15px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 26px;
}
.method-tabs {
  display: flex;
  background: #e9ece1;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 24px;
  gap: 4px;
}
.method-tabs button {
  width: 50%;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #849078;
  font-size: 12px;
  padding: 10px;
  cursor: pointer;
}
.method-tabs button.active {
  background: #fffdf6;
  color: #315b3b;
  box-shadow: 0 1px 3px #1c3d2210;
}
.winner-input {
  border-top: 1px solid #e2e6d8;
  padding-top: 16px;
  margin-top: 18px;
}
.winner-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}
.winner-heading strong {
  font-size: 14px;
  font-weight: 500;
}
.winner-heading strong span {
  font-size: 10px;
  color: #8d967f;
  margin-left: 8px;
}
.winner-heading button {
  font-size: 11px;
  background: transparent;
  border: 0;
  color: #ad795a;
  cursor: pointer;
}
.additional-winners {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 18px 0;
  font-size: 10px;
  color: #8b957c;
}
.additional-winners button {
  border: 1px dashed #cad5bd;
  background: transparent;
  color: #64805a;
  font-size: 11px;
  padding: 6px 9px;
  border-radius: 6px;
  cursor: pointer;
}
.settlement-preview {
  background: #f0f2e9;
  border: 1px solid #e2e6d7;
  border-radius: 10px;
  padding: 15px;
  margin-top: 22px;
}
.preview-heading {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #879376;
  margin-bottom: 12px;
  gap: 8px;
}
.preview-heading > span:first-child {
  color: #4c6a43;
}
.preview-row {
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 12px;
  padding: 7px 0;
  align-items: center;
  font-size: 12px;
}
.preview-row > strong {
  text-align: right;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.preview-row > span:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #8f9c7f;
}
.settlement-preview p {
  font-size: 10px;
  color: #929b82;
  line-height: 1.7;
  margin: 12px 0 0;
}
.tenpai-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.tenpai-grid label {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e0e4d6;
  border-radius: 9px;
  padding: 15px 10px;
  font-size: 12px;
  cursor: pointer;
  min-width: 0;
}
.tenpai-grid label.checked {
  background: #eef3e7;
  border-color: #a5bd91;
}
.tenpai-grid input {
  accent-color: #456d3d;
}
.tenpai-grid label > span {
  font-family: "Songti SC", serif;
  color: #7a8f68;
}
.tenpai-grid strong {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tenpai-grid small {
  font-size: 10px;
  color: #98a088;
}
.adjust-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.adjust-rows label {
  display: grid;
  grid-template-columns: 1fr 140px;
  align-items: center;
  gap: 14px;
  font-size: 12px;
}
.adjust-total {
  text-align: right;
  font-size: 12px;
  color: #6c825e;
  margin: 0;
}
.confirm-message {
  font-size: 18px;
  color: #35573c;
  line-height: 1.7;
  margin: 8px 0 14px;
}
.confirm-message strong {
  font-weight: 600;
}
.rules-summary > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #e8eadf;
}
.rules-summary > div > span {
  color: #8d967f;
}
.rules-summary strong {
  font-weight: 500;
  text-align: right;
}
.library-tools {
  display: flex;
  gap: 8px;
  margin: 4px 0 23px;
}
.game-library {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.library-item {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  text-align: left;
  border: 1px solid #e3e7d9;
  background: #fffdf7;
  border-radius: 10px;
  padding: 0;
  color: #46603e;
}
.library-item.current {
  background: #eef2e5;
  border-color: #cbd8bc;
}
.library-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.library-date {
  font-size: 9px;
  color: #99a08d;
}
.library-item strong {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.library-summary > span:last-child {
  font-size: 10px;
  color: #8d987f;
}
.record-state {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  white-space: nowrap;
}
.success-note {
  font-size: 12px;
  color: #517944;
  line-height: 1.7;
}
.library-select {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 14px 15px;
  border: 0;
  background: transparent;
  text-align: left;
  color: inherit;
  cursor: pointer;
}
.delete-record {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 10px 12px;
  margin-right: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #a65d4c;
  font-size: 11px;
  cursor: pointer;
}
.delete-record:hover:not(:disabled) {
  background: #f5e8e1;
}
.danger-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 17px;
  border: 1px solid #a75243;
  border-radius: 9px;
  background: #a75243;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
.danger-button:hover:not(:disabled) {
  background: #8e4438;
}
.empty-library {
  padding: 20px 0;
  text-align: center;
  color: #8b9583;
  font-size: 12px;
}

@media (max-width: 480px) {
  .library-select {
    padding: 12px 10px;
    gap: 6px;
  }
  .library-item {
    gap: 0;
  }
  .delete-record {
    padding: 10px 8px;
  }
  .record-state {
    font-size: 9px;
  }
}
</style>
<style scoped src="../scoreboard/workspace.css"></style>
