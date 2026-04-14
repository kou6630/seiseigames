import { injectUiStyle, createLobbyScreen, setStatus, setConnection, renderBaseInfo, renderPlayers } from "./ui.js";
import { injectEffectStyle } from "./effect.js";
import { ref, child, onValue, off, get, set, update, remove, onDisconnect, runTransaction } from "./shared/firebase.js";

const ROOM_WORD_KEY = "ochinchiro_room_word";
const PLAYER_ID_KEY = "ochinchiro_player_id";
const APP_ID = "ochinchiro";

let els = null;

export function createLobbyState(db) {
  return {
    db,
    roomWord: (localStorage.getItem(ROOM_WORD_KEY) || "").trim(),
    playerId: getOrCreatePlayerId(),
    roomId: "",
    playersRef: null,
    myPlayerRef: null,
    unsubscribePlayers: null,
    joined: false,
    myPlayerDisconnect: null,
  };
}

export function mountLobbyScreen(state) {
  injectUiStyle();
  injectEffectStyle();
  els = createLobbyScreen();
  renderBaseInfo(els, state);
  renderPlayers(els, {}, state.playerId);
  bindLobbyEvents(state);
  return els;
}

export function bindLobbyEvents(state) {
  if (!els) return;
  els.joinBtn.addEventListener("click", () => joinLobby(state));
  els.leaveBtn.addEventListener("click", () => leaveLobby(state));

  window.addEventListener("beforeunload", () => {
    if (state.myPlayerRef && state.myPlayerDisconnect) {
      state.myPlayerDisconnect.remove();
    }
  });
}

export async function joinLobby(state) {
  if (!els) return;

  if (!state.roomWord) {
    setStatus(els, "先にホームで合言葉を入れてください。");
    return;
  }

  state.roomId = normalizeRoomWord(state.roomWord);
  if (!state.roomId) {
    setStatus(els, "使える合言葉がありません。");
    return;
  }

  try {
    setStatus(els, "ロビー参加中...");
    setConnection(els, "Firebase接続中");

    const roomBaseRef = ref(state.db, `apps/${APP_ID}/lobbies/${state.roomId}`);
    const metaRef = child(roomBaseRef, "meta");
    const playersRef = child(roomBaseRef, "players");
    const myPlayerRef = child(playersRef, state.playerId);

    const joinedAt = Date.now();
    const counterRef = child(metaRef, "nextOrder");
    const counterResult = await runTransaction(counterRef, (current) => {
      const safeCurrent = Number.isFinite(Number(current)) ? Number(current) : 0;
      return safeCurrent + 1;
    });
    const order = Number(counterResult && counterResult.snapshot && counterResult.snapshot.val()) || 1;

    const metaSnapshot = await get(metaRef);
    const metaValue = metaSnapshot.exists() ? (metaSnapshot.val() || {}) : {};

    await update(metaRef, {
      roomWord: state.roomWord,
      updatedAt: joinedAt,
      createdAt: Number.isFinite(Number(metaValue.createdAt)) ? Number(metaValue.createdAt) : joinedAt,
    });

    await set(myPlayerRef, {
      id: state.playerId,
      name: "参加者",
      joinedAt,
      order,
    });

    state.myPlayerDisconnect = onDisconnect(myPlayerRef);
    await state.myPlayerDisconnect.remove();

    if (state.unsubscribePlayers && state.playersRef) {
      off(state.playersRef, "value", state.unsubscribePlayers);
    }

    const handlePlayers = (snap) => {
      renderPlayers(els, snap.val() || {}, state.playerId);
    };

    onValue(playersRef, handlePlayers);

    state.playersRef = playersRef;
    state.myPlayerRef = myPlayerRef;
    state.unsubscribePlayers = handlePlayers;
    state.joined = true;

    renderBaseInfo(els, state);
    setConnection(els, "Firebase接続済み");
    setStatus(els, "ロビーに入りました。");
  } catch (error) {
    console.error(error);
    setConnection(els, "Firebaseエラー");
    setStatus(els, `参加失敗: ${error.message}`);
  }
}

export async function leaveLobby(state) {
  if (!els) return;

  try {
    if (state.playersRef && state.unsubscribePlayers) {
      off(state.playersRef, "value", state.unsubscribePlayers);
    }

    if (state.myPlayerRef) {
      if (state.myPlayerDisconnect) {
        await state.myPlayerDisconnect.cancel();
      }
      await remove(state.myPlayerRef);
    }

    state.playersRef = null;
    state.myPlayerRef = null;
    state.unsubscribePlayers = null;
    state.myPlayerDisconnect = null;
    state.joined = false;

    renderPlayers(els, {}, state.playerId);
    renderBaseInfo(els, state);
    setStatus(els, "ロビーから出ました。");
  } catch (error) {
    console.error(error);
    setStatus(els, `退出失敗: ${error.message}`);
  }
}

export function initializeLobbyScreen(state) {
  if (!els) return;
  renderBaseInfo(els, state);
  renderPlayers(els, {}, state.playerId);
  setConnection(els, "Firebase準備完了");
  setStatus(els, "ロビーを作る / 入る を押してください。");
}

function getOrCreatePlayerId() {
  const saved = localStorage.getItem(PLAYER_ID_KEY);
  if (saved) return saved;
  const created = `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(PLAYER_ID_KEY, created);
  return created;
}

function normalizeRoomWord(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-ぁ-んァ-ヶ一-龠ー]/g, "");
}

