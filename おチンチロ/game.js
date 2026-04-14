const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDpjdhoWn-corTpUMhS4q0bWei5ho8ja-Q",
  authDomain: "ochinchiro.firebaseapp.com",
  databaseURL: "https://ochinchiro-default-rtdb.firebaseio.com",
  projectId: "ochinchiro",
  storageBucket: "ochinchiro.firebasestorage.app",
  messagingSenderId: "114346085898",
  appId: "1:114346085898:web:c43f2def62b858803399f3",
};

const ROOM_WORD_KEY = "ochinchiro_room_word";
const PLAYER_NAME_KEY = "ochinchiro_player_name";
const PLAYER_ID_KEY = "ochinchiro_player_id";
const APP_ID = "ochinchiro";

const style = document.createElement("style");
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
          <div class="ochi-label">名前</div>
          <div class="ochi-value" id="myName">-</div>
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

const els = {
  myName: document.getElementById("myName"),
  roomWord: document.getElementById("roomWord"),
  connectionState: document.getElementById("connectionState"),
  joinBtn: document.getElementById("joinBtn"),
  leaveBtn: document.getElementById("leaveBtn"),
  statusText: document.getElementById("statusText"),
  roomBadge: document.getElementById("roomBadge"),
  playerList: document.getElementById("playerList"),
};

const state = {
  app: null,
  db: null,
  roomWord: (localStorage.getItem(ROOM_WORD_KEY) || "").trim(),
  playerName: (localStorage.getItem(PLAYER_NAME_KEY) || "").trim(),
  playerId: getOrCreatePlayerId(),
  roomId: "",
  roomRef: null,
  playersRef: null,
  myPlayerRef: null,
  unsubscribePlayers: null,
  joined: false,
};

function getOrCreatePlayerId() {
  const saved = localStorage.getItem(PLAYER_ID_KEY);
  if (saved) return saved;
  const created = `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(PLAYER_ID_KEY, created);
  return created;
}

function setStatus(text) {
  els.statusText.textContent = text || "";
}

function setConnection(text) {
  els.connectionState.textContent = text;
}

function normalizeRoomWord(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-ぁ-んァ-ヶ一-龠ー]/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBaseInfo() {
  els.myName.textContent = state.playerName || "未入力";
  els.roomWord.textContent = state.roomWord || "未入力";
  els.roomBadge.textContent = state.joined ? `参加中: ${state.roomId}` : "未参加";
  els.leaveBtn.disabled = !state.joined;
  els.joinBtn.disabled = state.joined;
}

function renderPlayers(playersMap = {}) {
  const players = Object.entries(playersMap)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

  if (!players.length) {
    els.playerList.innerHTML = '<div class="ochi-empty">まだ参加者がいません</div>';
    return;
  }

  els.playerList.innerHTML = players.map((player) => {
    const isMe = player.id === state.playerId;
    return `
      <div class="ochi-player-item">
        <div class="ochi-player-main">
          <div class="ochi-player-name">${escapeHtml(player.name || "名前なし")}</div>
          <div class="ochi-player-meta">入室順 ${escapeHtml(String(player.order ?? "-"))}</div>
        </div>
        ${isMe ? '<div class="ochi-you">あなた</div>' : ""}
      </div>
    `;
  }).join("");
}

async function initFirebase() {
  if (!window.firebase) {
    throw new Error("firebase本体が読み込まれていません");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }

  state.app = firebase.app();
  state.db = firebase.database();
}

async function joinLobby() {
  if (!state.playerName) {
    setStatus("先にホームで名前を入れてください。");
    return;
  }

  if (!state.roomWord) {
    setStatus("先にホームで合言葉を入れてください。");
    return;
  }

  state.roomId = normalizeRoomWord(state.roomWord);
  if (!state.roomId) {
    setStatus("使える合言葉がありません。");
    return;
  }

  try {
    setStatus("ロビー参加中...");
    setConnection("Firebase接続中");

    const roomBaseRef = state.db.ref(`apps/${APP_ID}/lobbies/${state.roomId}`);
    const metaRef = roomBaseRef.child("meta");
    const playersRef = roomBaseRef.child("players");
    const myPlayerRef = playersRef.child(state.playerId);

    const joinedAt = Date.now();
    const snapshot = await playersRef.once("value");
    const players = snapshot.val() || {};
    const order = Object.keys(players).length + 1;

    await metaRef.update({
      roomWord: state.roomWord,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      createdAt: players && Object.keys(players).length ? undefined : firebase.database.ServerValue.TIMESTAMP,
    });

    await myPlayerRef.set({
      id: state.playerId,
      name: state.playerName,
      joinedAt,
      order,
    });

    myPlayerRef.onDisconnect().remove();
    roomBaseRef.child("meta/updatedAt").onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

    if (state.unsubscribePlayers) {
      state.playersRef.off("value", state.unsubscribePlayers);
    }

    const handlePlayers = (snap) => {
      renderPlayers(snap.val() || {});
    };

    playersRef.on("value", handlePlayers);

    state.playersRef = playersRef;
    state.myPlayerRef = myPlayerRef;
    state.unsubscribePlayers = handlePlayers;
    state.joined = true;

    renderBaseInfo();
    setConnection("Firebase接続済み");
    setStatus("ロビーに入りました。");
  } catch (error) {
    console.error(error);
    setConnection("Firebaseエラー");
    setStatus(`参加失敗: ${error.message}`);
  }
}

async function leaveLobby() {
  try {
    if (state.playersRef && state.unsubscribePlayers) {
      state.playersRef.off("value", state.unsubscribePlayers);
    }

    if (state.myPlayerRef) {
      await state.myPlayerRef.remove();
    }

    state.playersRef = null;
    state.myPlayerRef = null;
    state.unsubscribePlayers = null;
    state.joined = false;
    renderPlayers({});
    renderBaseInfo();
    setStatus("ロビーから出ました。");
  } catch (error) {
    console.error(error);
    setStatus(`退出失敗: ${error.message}`);
  }
}

async function boot() {
  renderBaseInfo();
  renderPlayers({});

  try {
    await initFirebase();
    setConnection("Firebase準備完了");
    setStatus("ロビーを作る / 入る を押してください。");
  } catch (error) {
    console.error(error);
    setConnection("Firebase未接続");
    setStatus("Firebase設定が未完了です。configとSDK読込を入れてください。");
  }
}

els.joinBtn.addEventListener("click", joinLobby);
els.leaveBtn.addEventListener("click", leaveLobby);
window.addEventListener("beforeunload", () => {
  if (state.myPlayerRef) {
    state.myPlayerRef.onDisconnect().remove();
  }
});

boot();
