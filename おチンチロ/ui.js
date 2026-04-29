export function createGameScreen() {
  document.body.innerHTML = `
    <div class="ochi-bg-glow"></div>
    <div class="ochi-root">
      <div class="ochi-game-layout">
        <section class="ochi-stage-panel">
          <div class="ochi-stage-head">
            <div>
              <div class="ochi-sub">OCHINCHIRO BEST BODY</div>
              <h1 class="ochi-title">おチンチロ</h1>
            </div>
            <div class="ochi-room-chip" id="roomWord">-</div>
          </div>

          <div class="ochi-stage-board">
            <div class="ochi-timer-wrap">
              <div class="ochi-timer-label">制限時間</div>
              <div class="ochi-timer-value" id="timerText">10</div>
            </div>

            <div class="ochi-bowl-area">
              <div class="ochi-waiting-dice-layer" id="waitingDiceLayer"></div>
              <div class="ochi-dice-layer" id="diceLayer"></div>
            </div>

            <div class="ochi-turn-guide" id="turnGuideText">親から順番に、最大3回まで振れます。</div>
            <div class="ochi-stage-status" id="statusText">振るボタンで開始します。</div>

            <div class="ochi-stage-actions">
              <button class="ochi-btn" id="rollBtn" type="button">振る</button>
              <button class="ochi-btn ochi-btn-sub" id="backBtn" type="button">戻る</button>
            </div>
          </div>
        </section>

        <aside class="ochi-side-panel">
          <div class="ochi-side-head">
            <div class="ochi-side-title">参加プレイヤー</div>
            <div class="ochi-side-note">親から順番に振ります</div>
          </div>
          <div class="ochi-player-list" id="playerList"></div>
        </aside>
      </div>
    </div>
  `;

  return {
    roomWord: document.getElementById("roomWord"),
    timerText: document.getElementById("timerText"),
    turnGuideText: document.getElementById("turnGuideText"),
    statusText: document.getElementById("statusText"),
    rollBtn: document.getElementById("rollBtn"),
    backBtn: document.getElementById("backBtn"),
    bowl: document.getElementById("bowl"),
    waitingDiceLayer: document.getElementById("waitingDiceLayer"),
    diceLayer: document.getElementById("diceLayer"),
    playerList: document.getElementById("playerList"),
  };
}

export function injectUiStyle() {
  if (document.getElementById("ochinchiro-ui-style")) return;

  const style = document.createElement("style");
  style.id = "ochinchiro-ui-style";
  style.textContent = `
    * { box-sizing: border-box; }

    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      font-family: "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif;
      background:
        radial-gradient(circle at top, rgba(255, 215, 120, 0.14), transparent 32%),
        linear-gradient(180deg, #12070a 0%, #1f0d12 45%, #0b0507 100%);
      color: #fff7ef;
    }

    body {
      overflow: hidden;
    }

    .ochi-bg-glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 20% 20%, rgba(255, 170, 90, 0.12), transparent 20%),
        radial-gradient(circle at 80% 30%, rgba(255, 120, 120, 0.10), transparent 24%),
        radial-gradient(circle at 50% 85%, rgba(255, 220, 120, 0.08), transparent 28%);
      filter: blur(10px);
    }

    .ochi-root {
      position: relative;
      width: 100vw;
      height: 100vh;
      padding: 16px;
    }

    .ochi-game-layout {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 14px;
    }

    .ochi-stage-panel,
    .ochi-side-panel {
      background: rgba(20, 8, 12, 0.78);
      border: 1px solid rgba(255, 230, 200, 0.12);
      border-radius: 28px;
      box-shadow:
        0 24px 80px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
    }

    .ochi-stage-panel {
      padding: 18px;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 12px;
      min-width: 0;
      min-height: 0;
    }

    .ochi-side-panel {
      padding: 14px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }

    .ochi-stage-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .ochi-sub {
      font-size: 13px;
      letter-spacing: 0.28em;
      color: rgba(255, 235, 215, 0.7);
    }

    .ochi-title {
      margin: 4px 0 0;
      font-size: clamp(34px, 4vw, 46px);
      line-height: 1;
      letter-spacing: 0.08em;
      color: #ffe0b2;
      text-shadow:
        0 0 18px rgba(255, 185, 110, 0.25),
        0 6px 24px rgba(0, 0, 0, 0.45);
    }

    .ochi-room-chip {
      padding: 9px 12px;
      border-radius: 999px;
      background: rgba(255, 210, 143, 0.12);
      border: 1px solid rgba(255, 210, 143, 0.2);
      color: #ffe0b2;
      font-size: 12px;
      font-weight: 700;
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ochi-stage-board {
      min-height: 0;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 230, 200, 0.08);
      padding: 16px;
      display: grid;
      grid-template-rows: auto 1fr auto auto auto;
      gap: 12px;
    }

    .ochi-timer-wrap {
      width: fit-content;
      min-width: 104px;
      padding: 10px 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 230, 200, 0.10);
    }

    .ochi-timer-label {
      font-size: 12px;
      color: rgba(255, 233, 211, 0.64);
      letter-spacing: 0.08em;
    }

    .ochi-timer-value {
      margin-top: 6px;
      font-size: clamp(28px, 3vw, 34px);
      font-weight: 900;
      color: #ffd28f;
      line-height: 1;
    }

    .ochi-bowl-area {
      position: relative;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      perspective: 1800px;
      perspective-origin: 50% 34%;
    }


    .ochi-waiting-dice-layer,
    .ochi-dice-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .ochi-waiting-dice-layer {
      z-index: 1;
      pointer-events: none;
    }

    .ochi-dice-layer {
      z-index: 2;
    }

    .ochi-turn-guide {
      min-height: 22px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: #ffd28f;
      letter-spacing: 0.04em;
    }

    .ochi-stage-status {
      min-height: 24px;
      text-align: center;
      font-size: 14px;
      color: rgba(255, 240, 226, 0.84);
    }

    .ochi-stage-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .ochi-btn {
      min-width: 150px;
      height: 48px;
      border: 0;
      border-radius: 16px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #2c1209;
      background: linear-gradient(180deg, #ffd28f 0%, #ffb860 100%);
      box-shadow:
        0 10px 24px rgba(255, 157, 77, 0.24),
        inset 0 1px 0 rgba(255, 255, 255, 0.45);
    }

    .ochi-btn:disabled {
      cursor: default;
      filter: grayscale(0.3) brightness(0.85);
      opacity: 0.7;
    }

    .ochi-btn-sub {
      background: rgba(255, 255, 255, 0.08);
      color: #fff3e3;
      box-shadow: none;
      border: 1px solid rgba(255, 230, 200, 0.12);
    }

    .ochi-side-head {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
    }

    .ochi-side-title {
      font-size: 21px;
      font-weight: 700;
      color: #ffe0b2;
    }

    .ochi-side-note {
      font-size: 13px;
      color: rgba(255, 233, 211, 0.66);
    }

    .ochi-player-list {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 4px;
    }

    .ochi-player-item {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 11px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 230, 200, 0.08);
    }

    .ochi-player-avatar,
    .ochi-player-avatar-empty {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.10);
      flex-shrink: 0;
    }

    .ochi-player-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .ochi-player-avatar-empty {
      font-size: 12px;
      color: rgba(255, 233, 211, 0.68);
    }

    .ochi-player-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ochi-player-topline {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .ochi-player-name {
      font-size: 15px;
      font-weight: 700;
      color: #fff7ef;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ochi-player-badge {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(255, 184, 96, 0.16);
      border: 1px solid rgba(255, 184, 96, 0.26);
      font-size: 11px;
      color: #ffd28f;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .ochi-player-meta {
      font-size: 12px;
      color: rgba(255, 233, 211, 0.68);
      line-height: 1.5;
    }

    .ochi-player-hand {
      font-size: 12px;
      font-weight: 700;
      color: #fff3e3;
      text-align: right;
      white-space: nowrap;
    }

    .ochi-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      border-radius: 16px;
      border: 1px dashed rgba(255, 230, 200, 0.15);
      color: rgba(255, 233, 211, 0.6);
      font-size: 14px;
    }

    @media (max-height: 820px) {
      .ochi-root {
        padding: 12px;
      }

      .ochi-game-layout {
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 12px;
      }

      .ochi-stage-panel {
        padding: 14px;
        gap: 10px;
      }

      .ochi-side-panel {
        padding: 12px;
      }

      .ochi-stage-board {
        padding: 12px;
        gap: 10px;
      }


      .ochi-btn {
        min-width: 132px;
        height: 44px;
        font-size: 15px;
      }
    }

    @media (max-height: 720px) {
      .ochi-root {
        padding: 10px;
      }

      .ochi-title {
        font-size: 30px;
      }

      .ochi-sub {
        font-size: 11px;
      }

      .ochi-room-chip {
        font-size: 11px;
        max-width: 180px;
        padding: 8px 10px;
      }

      .ochi-stage-head {
        gap: 8px;
      }

      .ochi-stage-panel {
        padding: 12px;
        gap: 8px;
      }

      .ochi-side-panel {
        padding: 10px;
      }

      .ochi-stage-board {
        padding: 10px;
        gap: 8px;
      }

      .ochi-timer-wrap {
        min-width: 92px;
        padding: 8px 12px;
      }

      .ochi-timer-value {
        font-size: 24px;
      }


      .ochi-turn-guide {
        min-height: 18px;
        font-size: 12px;
      }

      .ochi-stage-status {
        min-height: 20px;
        font-size: 13px;
      }

      .ochi-btn {
        min-width: 120px;
        height: 40px;
        font-size: 14px;
        border-radius: 14px;
      }

      .ochi-side-title {
        font-size: 18px;
      }

      .ochi-side-note {
        font-size: 12px;
      }

      .ochi-player-item {
        grid-template-columns: 38px minmax(0, 1fr) auto;
        gap: 8px;
        padding: 9px 10px;
      }

      .ochi-player-avatar,
      .ochi-player-avatar-empty {
        width: 38px;
        height: 38px;
      }

      .ochi-player-name {
        font-size: 14px;
      }

      .ochi-player-meta,
      .ochi-player-hand,
      .ochi-player-badge {
        font-size: 11px;
      }
    }
  `;

  document.head.appendChild(style);
}

export function setStatus(els, text) {
  els.statusText.textContent = text || "";
  if (els.turnGuideText) {
    els.turnGuideText.textContent = buildTurnGuideText(text);
  }
}

export function setRoomWord(els, text) {
  els.roomWord.textContent = text || "-";
}

export function setTimer(els, seconds) {
  els.timerText.textContent = String(seconds);
}

export function setRollDisabled(els, disabled) {
  els.rollBtn.disabled = Boolean(disabled);
}

export function clearDiceLayer(els) {
  els.diceLayer.innerHTML = "";
}

export function clearWaitingDiceLayer(els) {
  if (!els || !els.waitingDiceLayer) return;
  els.waitingDiceLayer.innerHTML = "";
}

export function renderPlayers(els, players = [], myPlayerId = "") {
  if (!Array.isArray(players) || !players.length) {
    els.playerList.innerHTML = '<div class="ochi-empty">まだ参加者がいません</div>';
    return;
  }

  els.playerList.innerHTML = players.map((player) => {
    const isMe = player.id === myPlayerId;
    const avatar = player.avatarUrl
      ? `<div class="ochi-player-avatar"><img src="${escapeHtml(player.avatarUrl)}" alt="${escapeHtml(player.name || "avatar")}"></div>`
      : '<div class="ochi-player-avatar-empty">CPU</div>';
    const badges = [
      isMe ? '<span class="ochi-player-badge">あなた</span>' : "",
      player.isParent ? '<span class="ochi-player-badge">親</span>' : "",
      player.isCpu ? '<span class="ochi-player-badge">CPU</span>' : "",
    ].join("");

    return `
      <div class="ochi-player-item">
        ${avatar}
        <div class="ochi-player-main">
          <div class="ochi-player-topline">
            <div class="ochi-player-name">${escapeHtml(player.name || "参加者")}</div>
            ${badges}
          </div>
          <div class="ochi-player-meta">コイン ${escapeHtml(String(player.coin ?? 0))} 枚</div>
        </div>
        <div class="ochi-player-hand">${escapeHtml(player.finalHandName || "未確定")}${player.order ? `<br><span style="font-size:10px;opacity:0.72;">${escapeHtml(String(player.order))}番目</span>` : ""}</div>
      </div>
    `;
  }).join("");
}

function buildTurnGuideText(text) {
  const raw = String(text || "");
  const matched = raw.match(/の([1-3])回目です/);
  if (matched) {
    return `${matched[1]}回目 / 最大3回`;
  }
  if (raw.includes("もう一度")) {
    return "目なしなので、もう一度振れます。";
  }
  if (raw.includes("確定")) {
    return "役が確定しました。次の人へ進みます。";
  }
  if (raw.includes("集計")) {
    return "全員の役を確認中です。";
  }
  return "親から順番に、最大3回まで振れます。";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}



