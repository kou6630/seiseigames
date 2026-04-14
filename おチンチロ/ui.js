export function createLobbyScreen() {
  document.body.innerHTML = `
    <div class="ochi-bg-glow"></div>
    <div class="ochi-root">
      <div class="ochi-panel">
        <section class="ochi-left">
          <div>
            <div class="ochi-sub">OCHINCHIRO BEST BODY</div>
            <h1 class="ochi-title">おチンチロ</h1>
          </div>

          <div class="ochi-card">
            <div class="ochi-label">合言葉</div>
            <div class="ochi-value" id="roomWord">-</div>
          </div>

          <div class="ochi-card">
            <div class="ochi-label">接続状態</div>
            <div class="ochi-small" id="connectionState">Firebase待機中</div>
          </div>

          <div class="ochi-actions">
            <button class="ochi-btn" id="joinBtn">ロビーを作る / 入る</button>
            <button class="ochi-btn ochi-btn-sub" id="leaveBtn" disabled>ロビーから出る</button>
            <div class="ochi-status" id="statusText"></div>
          </div>
        </section>

        <section class="ochi-right">
          <div class="ochi-room-head">
            <div class="ochi-room-title">ロビー</div>
            <div class="ochi-room-badge" id="roomBadge">未参加</div>
          </div>

          <div class="ochi-player-list" id="playerList">
            <div class="ochi-empty">まだ参加者がいません</div>
          </div>
        </section>
      </div>
    </div>
  `;

  return {
    roomWord: document.getElementById("roomWord"),
    connectionState: document.getElementById("connectionState"),
    joinBtn: document.getElementById("joinBtn"),
    leaveBtn: document.getElementById("leaveBtn"),
    statusText: document.getElementById("statusText"),
    roomBadge: document.getElementById("roomBadge"),
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
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      padding: 24px;
    }

    .ochi-panel {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      border-radius: 28px;
      background: rgba(20, 8, 12, 0.78);
      border: 1px solid rgba(255, 230, 200, 0.12);
      box-shadow:
        0 24px 80px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 20px;
      padding: 20px;
      overflow: hidden;
    }

    .ochi-left,
    .ochi-right {
      min-height: 0;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 230, 200, 0.08);
      border-radius: 24px;
      padding: 20px;
    }

    .ochi-left {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .ochi-right {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .ochi-sub {
      font-size: 13px;
      letter-spacing: 0.28em;
      color: rgba(255, 235, 215, 0.7);
    }

    .ochi-title {
      margin: 4px 0 0;
      font-size: 46px;
      line-height: 1;
      letter-spacing: 0.08em;
      color: #ffe0b2;
      text-shadow:
        0 0 18px rgba(255, 185, 110, 0.25),
        0 6px 24px rgba(0, 0, 0, 0.45);
    }

    .ochi-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 230, 200, 0.08);
      border-radius: 18px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ochi-label {
      font-size: 12px;
      color: rgba(255, 233, 211, 0.6);
      letter-spacing: 0.08em;
    }

    .ochi-value {
      font-size: 24px;
      font-weight: 700;
      color: #fff7ef;
      word-break: break-all;
    }

    .ochi-small {
      font-size: 14px;
      color: rgba(255, 233, 211, 0.78);
    }

    .ochi-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: auto;
    }

    .ochi-btn {
      width: 100%;
      height: 50px;
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

    .ochi-status {
      min-height: 22px;
      font-size: 14px;
      color: rgba(255, 233, 211, 0.84);
    }

    .ochi-room-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .ochi-room-title {
      font-size: 24px;
      font-weight: 700;
      color: #ffe0b2;
    }

    .ochi-room-badge {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 210, 143, 0.12);
      border: 1px solid rgba(255, 210, 143, 0.2);
      font-size: 13px;
      color: #ffe0b2;
      white-space: nowrap;
    }

    .ochi-player-list {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-right: 4px;
    }

    .ochi-player-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 230, 200, 0.08);
    }

    .ochi-player-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .ochi-player-name {
      font-size: 18px;
      font-weight: 700;
      color: #fff7ef;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ochi-player-meta {
      font-size: 13px;
      color: rgba(255, 233, 211, 0.65);
    }

    .ochi-you {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 184, 96, 0.16);
      border: 1px solid rgba(255, 184, 96, 0.26);
      font-size: 12px;
      color: #ffd28f;
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
      font-size: 15px;
    }

    @media (max-width: 980px) {
      .ochi-panel {
        grid-template-columns: 1fr;
      }

      .ochi-root {
        padding: 14px;
      }
    }
  `;

  document.head.appendChild(style);
}

export function setStatus(els, text) {
  els.statusText.textContent = text || "";
}

export function setConnection(els, text) {
  els.connectionState.textContent = text || "";
}

export function renderBaseInfo(els, state) {
  els.roomWord.textContent = state.roomWord || "未入力";
  els.roomBadge.textContent = state.joined ? `参加中: ${state.roomId}` : "未参加";
  els.leaveBtn.disabled = !state.joined;
  els.joinBtn.disabled = state.joined;
}

export function renderPlayers(els, playersMap = {}, myPlayerId = "") {
  const players = Object.entries(playersMap)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

  if (!players.length) {
    els.playerList.innerHTML = '<div class="ochi-empty">まだ参加者がいません</div>';
    return;
  }

  els.playerList.innerHTML = players.map((player) => {
    const isMe = player.id === myPlayerId;
    return `
      <div class="ochi-player-item">
        <div class="ochi-player-main">
          <div class="ochi-player-name">${escapeHtml(`参加者 ${String(player.order ?? "-")}`)}</div>
          <div class="ochi-player-meta">入室順 ${escapeHtml(String(player.order ?? "-"))}</div>
        </div>
        ${isMe ? '<div class="ochi-you">あなた</div>' : ""}
      </div>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

