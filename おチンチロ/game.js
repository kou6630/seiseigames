import { onUserChanged, db, ref, onValue, off, update, remove, get, set } from "../shared/firebase.js";
import { getUserData, getAvatarImageById, normalizeAvatarId } from "../shared/userDate.js";
import {
  evaluateChinchiro,
  createCpuPlayers,
  createHumanPlayer,
  applyRoundResult,
  rankRoundResults,
  chooseRandomParent,
  orderPlayersForRound,
  createTurnResult,
  getMaxPlayerRolls,
  getMaxCpuCount,
} from "./playlogic.js";
import {
  injectEffectStyle,
  animateDiceDrop,
  startWaitingDiceSpin,
  showFlashMessage,
  showResultPop,
} from "./effect.js";
import {
  createGameScreen,
  injectUiStyle,
  setStatus,
  setRoomWord,
  setTimer,
  setRollDisabled,
  clearDiceLayer,
  clearWaitingDiceLayer,
  renderPlayers,
} from "./ui.js";

const ROOM_WORD_KEY = "ochinchiro_room_word";
const ROOM_ID_KEY = "ochinchiro_room_id";
const PLAYER_ID_KEY = "ochinchiro_player_id";
const ROUND_TIME_LIMIT = 10;
const CPU_THINK_MS = 900;
const RESULT_SHOW_MS = 2200;

const state = {
  initializedUserId: "",
  roomWord: (localStorage.getItem(ROOM_WORD_KEY) || "").trim(),
  roomId: (localStorage.getItem(ROOM_ID_KEY) || "").trim(),
  myPlayerId: getOrCreatePlayerId(),
  currentUser: null,
  myProfile: null,
  screenMode: "room",
  roomData: null,
  roomRef: null,
  roomListener: null,
  currentPlayers: [],
  gameEls: null,
  roundActive: false,
  secondsLeft: ROUND_TIME_LIMIT,
  timerId: null,
  cpuTimerId: null,
  finishingRound: false,
  waitingDiceSpin: null,
  waitingDicePlayerId: "",
  activeTurnKey: "",
};

function getOrCreatePlayerId() {
  const saved = localStorage.getItem(PLAYER_ID_KEY);
  if (saved) return saved;
  const created = `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(PLAYER_ID_KEY, created);
  return created;
}

function getDisplayName(profile, user) {
  const nickname = String((profile && profile.nickname) || "").trim();
  if (nickname) return nickname;
  const name = String((profile && profile.name) || "").trim();
  if (name) return name;
  return String((user && user.displayName) || "参加者").trim() || "参加者";
}

function getAvatarUrl(profile) {
  const selectedAvatar = normalizeAvatarId(profile && profile.selectedAvatar ? profile.selectedAvatar : "");
  return String(getAvatarImageById(selectedAvatar) || "").trim();
}

function getCoin(profile) {
  const value = Number(profile && profile.coin);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function getRoomElements() {
  return {
    roomWord: document.getElementById("roomWord"),
    roomPlayerList: document.getElementById("roomPlayerList"),
    cpuCountText: document.getElementById("cpuCountText"),
    addCpuBtn: document.getElementById("addCpuBtn"),
    startGameBtn: document.getElementById("startGameBtn"),
    leaveRoomBtn: document.getElementById("leaveRoomBtn"),
    roomStatusText: document.getElementById("roomStatusText"),
  };
}

function setRoomStatus(text) {
  const els = getRoomElements();
  if (els.roomStatusText) {
    els.roomStatusText.textContent = String(text || "");
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHumanPlayers(rawPlayers = {}) {
  return Object.values(rawPlayers || {})
    .filter((player) => player && !player.isCpu)
    .map((player, index) => createHumanPlayer({
      id: String(player.playerId || player.id || `player_${index + 1}`),
      name: String(player.name || "参加者").trim() || "参加者",
      avatarUrl: String(player.avatarUrl || "").trim(),
      coin: Number(player.coin || 0),
      joinedAt: Number(player.joinedAt || Date.now()),
    }, index + 1))
    .sort((a, b) => Number(a.joinedAt || 0) - Number(b.joinedAt || 0));
}

function buildCurrentPlayers(roomData) {
  const humans = buildHumanPlayers(roomData && roomData.players ? roomData.players : {});
  const cpus = createCpuPlayers(Number((roomData && roomData.cpuCount) || 0), humans.length + 1, humans.length || 1);
  const all = [...humans, ...cpus];
  const parentId = String((roomData && roomData.parentPlayerId) || "");

  return all.map((player, index) => ({
    ...player,
    order: index + 1,
    isParent: parentId ? player.id === parentId : false,
    finalHandName: "未確定",
  }));
}

function renderRoomPlayers(roomData) {
  const els = getRoomElements();
  if (!els.roomPlayerList) return;

  const players = buildCurrentPlayers(roomData);
  state.currentPlayers = players;

  if (!players.length) {
    els.roomPlayerList.innerHTML = '<div class="room-empty">まだ参加者がいません</div>';
    return;
  }

  els.roomPlayerList.innerHTML = players.map((player) => {
    const isMe = player.id === state.myPlayerId;
    const isMaster = String((roomData && roomData.masterPlayerId) || "") === player.id;
    const avatar = player.avatarUrl
      ? `<div class="room-player-avatar"><img src="${escapeHtml(player.avatarUrl)}" alt="${escapeHtml(player.name || "avatar")}"></div>`
      : '<div class="room-player-avatar-empty">CPU</div>';
    const badges = [
      isMe ? '<span class="room-player-badge">あなた</span>' : "",
      isMaster ? '<span class="room-player-badge">主</span>' : "",
      player.isParent ? '<span class="room-player-badge">親</span>' : "",
      player.isCpu ? '<span class="room-player-badge">CPU</span>' : "",
    ].join("");

    return `
      <div class="room-player-item">
        ${avatar}
        <div class="room-player-main">
          <div class="room-player-topline">
            <div class="room-player-name">${escapeHtml(player.name || "参加者")}</div>
            ${badges}
          </div>
          <div class="room-player-meta">コイン ${escapeHtml(String(player.coin || 0))} 枚</div>
        </div>
        <div class="room-player-right">${player.isCpu ? "CPU" : "参加中"}</div>
      </div>
    `;
  }).join("");
}

function updateRoomControls(roomData) {
  const els = getRoomElements();
  const humanCount = buildHumanPlayers(roomData && roomData.players ? roomData.players : {}).length;
  const cpuCount = Number((roomData && roomData.cpuCount) || 0);
  const maxCpuCount = getMaxCpuCount(humanCount || 1);
  const isMaster = String((roomData && roomData.masterPlayerId) || "") === state.myPlayerId;
  const isPlaying = String((roomData && roomData.status) || "waiting") === "playing";

  if (els.roomWord) {
    els.roomWord.textContent = state.roomWord || "-";
  }
  if (els.cpuCountText) {
    els.cpuCountText.textContent = String(cpuCount);
  }
  if (els.addCpuBtn) {
    els.addCpuBtn.disabled = !isMaster || isPlaying || cpuCount >= maxCpuCount;
  }
  if (els.startGameBtn) {
    els.startGameBtn.disabled = !isMaster || isPlaying || (humanCount + cpuCount) <= 0;
  }

  if (isPlaying) {
    setRoomStatus("ルームマスターが開始しました。");
    return;
  }

  if (!isMaster) {
    setRoomStatus("待機中です。ルームマスターの開始を待っています。");
    return;
  }

  if (cpuCount >= maxCpuCount) {
    setRoomStatus("これ以上CPUは追加できません。");
    return;
  }

  setRoomStatus("待機中です。CPU追加か開始ができます。");
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function clearCpuAutoTurn() {
  if (state.cpuTimerId) {
    window.clearTimeout(state.cpuTimerId);
    state.cpuTimerId = null;
  }
}

function startTimer() {
  stopTimer();
  state.secondsLeft = ROUND_TIME_LIMIT;
  if (state.gameEls) {
    setTimer(state.gameEls, state.secondsLeft);
  }

  state.timerId = window.setInterval(() => {
    state.secondsLeft -= 1;
    if (state.gameEls) {
      setTimer(state.gameEls, Math.max(0, state.secondsLeft));
    }

    if (state.secondsLeft > 0) return;

    stopTimer();
    if (!state.roundActive || !state.roomRef || !state.roomData) return;
    if (!isMyTurn(state.roomData)) return;
    forceTimeoutRoll();
  }, 1000);
}

function stopRoundLocally() {
  state.roundActive = false;
  state.activeTurnKey = "";
  stopWaitingDiceSpin();
  stopTimer();
  clearCpuAutoTurn();
  if (state.gameEls) {
    setRollDisabled(state.gameEls, true);
  }
}

function stopWaitingDiceSpin() {
  if (state.waitingDiceSpin && typeof state.waitingDiceSpin.stop === "function") {
    state.waitingDiceSpin.stop();
  }
  state.waitingDiceSpin = null;
  state.waitingDicePlayerId = "";
  if (state.gameEls) {
    clearWaitingDiceLayer(state.gameEls);
  }
}

async function ensureWaitingDiceSpin(roomData = state.roomData) {
  if (!state.gameEls || !roomData || !state.roundActive) return;
  const currentTurnPlayer = getCurrentTurnPlayer(roomData);
  const playerId = currentTurnPlayer ? String(currentTurnPlayer.id || "") : "";
  if (!playerId) {
    stopWaitingDiceSpin();
    return;
  }
  const spinKey = `${playerId}:${getPlayerRollCount(roomData, playerId)}`;
  if (state.waitingDiceSpin && state.waitingDicePlayerId === spinKey) return;
  stopWaitingDiceSpin();
  state.waitingDicePlayerId = spinKey;
  state.waitingDiceSpin = await startWaitingDiceSpin(state.gameEls.waitingDiceLayer, 3);
}

function isMaster(roomData = state.roomData) {
  return String((roomData && roomData.masterPlayerId) || "") === state.myPlayerId;
}

function getOrderedPlayers(roomData = state.roomData) {
  const currentPlayers = buildCurrentPlayers(roomData);
  return orderPlayersForRound(currentPlayers);
}

function getCurrentTurnPlayer(roomData = state.roomData) {
  const ordered = getOrderedPlayers(roomData);
  const index = Math.max(0, Number((roomData && roomData.currentTurnIndex) || 0));
  return ordered[index] || null;
}

function isMyTurn(roomData = state.roomData) {
  const player = getCurrentTurnPlayer(roomData);
  return Boolean(player && !player.isCpu && player.id === state.myPlayerId);
}

function getResultMap(roomData = state.roomData) {
  return roomData && roomData.roundResults && typeof roomData.roundResults === "object" ? roomData.roundResults : {};
}

function getPlayerResultEntry(roomData, playerId) {
  const results = getResultMap(roomData);
  const entry = results[String(playerId || "")];
  return entry && typeof entry === "object" ? entry : null;
}

function getPlayerRolls(roomData, playerId) {
  const entry = getPlayerResultEntry(roomData, playerId);
  return entry && Array.isArray(entry.rolls) ? entry.rolls : [];
}

function getPlayerRollCount(roomData, playerId) {
  return getPlayerRolls(roomData, playerId).length;
}

function isPlayerFinished(roomData, playerId) {
  const entry = getPlayerResultEntry(roomData, playerId);
  return Boolean(entry && entry.finalResult);
}

function buildTurnKey(roomData) {
  const currentTurnPlayer = getCurrentTurnPlayer(roomData);
  if (!currentTurnPlayer) return "";
  return `${currentTurnPlayer.id}:${getPlayerRollCount(roomData, currentTurnPlayer.id)}`;
}

function resolveRoundResultFromAnimation(animationResult) {
  if (!animationResult || typeof animationResult !== "object") {
    return null;
  }

  if (Array.isArray(animationResult.dice) && animationResult.dice.length === 3) {
    return evaluateChinchiro(animationResult.dice);
  }

  if (Array.isArray(animationResult.values) && animationResult.values.length === 3) {
    return evaluateChinchiro(animationResult.values);
  }

  return null;
}

function applyGameView(roomData) {
  if (!roomData) return;
  if (state.screenMode !== "game") {
    injectUiStyle();
    injectEffectStyle();
    state.gameEls = createGameScreen();
    state.screenMode = "game";
    state.gameEls.rollBtn.addEventListener("click", handleRollButton);
    state.gameEls.backBtn.addEventListener("click", handleBack);
  }

  const isPlaying = String(roomData.status || "") === "playing";
  if (!state.roundActive && isPlaying) {
    state.roundActive = true;
  }

  const orderedPlayers = getOrderedPlayers(roomData);
  const resultMap = getResultMap(roomData);
  const playersWithResults = applyRoundResult(orderedPlayers, resultMap);
  state.currentPlayers = playersWithResults;
  state.roomData = roomData;

  setRoomWord(state.gameEls, state.roomWord);
  renderPlayers(state.gameEls, playersWithResults, state.myPlayerId);

  const currentTurnPlayer = getCurrentTurnPlayer(roomData);
  if (currentTurnPlayer) {
    const nextRollNumber = getPlayerRollCount(roomData, currentTurnPlayer.id) + 1;
    setStatus(state.gameEls, `${currentTurnPlayer.name} の${nextRollNumber}回目です。`);
  } else {
    setStatus(state.gameEls, "結果を集計しています。");
  }

  const turnKey = buildTurnKey(roomData);
  if (turnKey && state.activeTurnKey !== turnKey) {
    state.activeTurnKey = turnKey;
    startTimer();
  }

  const canRoll = isMyTurn(roomData) && state.roundActive;
  setRollDisabled(state.gameEls, !canRoll);

  ensureWaitingDiceSpin(roomData);
  scheduleCpuTurn(roomData);
  maybeFinishRound(roomData);
}

function updateResultsOnScreen(roomData) {
  if (state.screenMode !== "game" || !state.gameEls) return;
  const orderedPlayers = getOrderedPlayers(roomData);
  const playersWithResults = applyRoundResult(orderedPlayers, getResultMap(roomData));
  state.currentPlayers = playersWithResults;
  renderPlayers(state.gameEls, playersWithResults, state.myPlayerId);
}

function renderRoomView(roomData) {
  state.screenMode = "room";
  state.roomData = roomData;
  renderRoomPlayers(roomData);
  updateRoomControls(roomData);
}

async function rebuildRoomIfNeeded() {
  if (!state.roomRef) return;
  const snapshot = await get(state.roomRef);
  const roomData = snapshot.exists() ? (snapshot.val() || {}) : {};
  const humanPlayers = buildHumanPlayers(roomData.players || {});
  const myJoinedAt = Date.now();
  const shouldRebuild = !roomData.roomId || humanPlayers.length === 0;

  const nextBase = shouldRebuild
    ? {
        roomId: state.roomId,
        roomWord: state.roomWord,
        status: "waiting",
        masterPlayerId: state.myPlayerId,
        cpuCount: 0,
        currentTurnIndex: 0,
        parentPlayerId: "",
        turnOrder: [],
        roundResults: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    : {
        roomId: state.roomId,
        roomWord: state.roomWord,
        updatedAt: Date.now(),
      };

  await update(state.roomRef, nextBase);
  await update(ref(db, `ochinchiroRooms/${state.roomId}/players/${state.myPlayerId}`), {
    playerId: state.myPlayerId,
    uid: String((state.currentUser && state.currentUser.uid) || ""),
    name: getDisplayName(state.myProfile, state.currentUser),
    avatarUrl: getAvatarUrl(state.myProfile),
    coin: getCoin(state.myProfile),
    isCpu: false,
    joinedAt: shouldRebuild ? myJoinedAt : (roomData.players && roomData.players[state.myPlayerId] && roomData.players[state.myPlayerId].joinedAt) || myJoinedAt,
    updatedAt: Date.now(),
  });
}

async function addCpu() {
  if (!state.roomData || !isMaster()) return;
  const humanCount = buildHumanPlayers(state.roomData.players || {}).length;
  const cpuCount = Number(state.roomData.cpuCount || 0);
  const maxCpuCount = getMaxCpuCount(humanCount || 1);
  if (cpuCount >= maxCpuCount) return;

  await update(state.roomRef, {
    cpuCount: cpuCount + 1,
    updatedAt: Date.now(),
  });
}

async function startGameFromRoom() {
  if (!state.roomData || !isMaster()) return;

  const players = buildCurrentPlayers(state.roomData);
  if (!players.length) return;

  const chosen = chooseRandomParent(players);
  const ordered = orderPlayersForRound(chosen.players);

  await update(state.roomRef, {
    status: "playing",
    parentPlayerId: chosen.parentId,
    turnOrder: ordered.map((player) => player.id),
    currentTurnIndex: 0,
    roundResults: {},
    updatedAt: Date.now(),
  });
}

async function advanceTurn(result) {
  if (!state.roomRef || !state.roomData) return;
  const roomData = state.roomData;
  const ordered = getOrderedPlayers(roomData);
  const currentIndex = Math.max(0, Number(roomData.currentTurnIndex || 0));
  const currentPlayer = ordered[currentIndex];
  if (!currentPlayer) return;

  const previousRolls = getPlayerRolls(roomData, currentPlayer.id);
  const nextTurn = previousRolls.length + 1;
  const turnResult = createTurnResult(result && result.dice ? result.dice : [], nextTurn, getMaxPlayerRolls());
  const nextRolls = [...previousRolls, turnResult];
  const nextEntry = {
    rolls: nextRolls,
    rollCount: nextRolls.length,
    currentResult: turnResult,
    finalResult: turnResult.finished ? turnResult : null,
  };

  const nextResults = {
    ...getResultMap(roomData),
    [currentPlayer.id]: nextEntry,
  };

  await update(state.roomRef, {
    roundResults: nextResults,
    currentTurnIndex: turnResult.finished ? currentIndex + 1 : currentIndex,
    updatedAt: Date.now(),
  });
}

async function handleRollButton() {
  if (!state.roundActive || !state.gameEls || !isMyTurn()) return;

  setRollDisabled(state.gameEls, true);
  stopTimer();
  clearDiceLayer(state.gameEls);
  const initialQuaternions = state.waitingDiceSpin && typeof state.waitingDiceSpin.getQuaternions === "function"
    ? state.waitingDiceSpin.getQuaternions()
    : [];
  stopWaitingDiceSpin();
  setStatus(state.gameEls, "お椀にサイコロを落としています。");

  try {
    const animationResult = await animateDiceDrop(state.gameEls.diceLayer, [], { duration: 2800, initialQuaternions });
    const result = resolveRoundResultFromAnimation(animationResult);

    if (!result) {
      throw new Error("サイコロ結果の取得に失敗しました");
    }

    const currentPlayer = getCurrentTurnPlayer(state.roomData);
    const nextTurn = getPlayerRollCount(state.roomData, currentPlayer.id) + 1;
    const turnResult = createTurnResult(result.dice, nextTurn, getMaxPlayerRolls());
    setStatus(state.gameEls, turnResult.finished ? `${turnResult.handName} で確定です。` : `${turnResult.handName} です。もう一度振れます。`);
    await advanceTurn(result);
  } catch (error) {
    console.error(error);
    setStatus(state.gameEls, "振る処理に失敗しました。");
  }
}

async function forceTimeoutRoll() {
  if (!state.roundActive || !isMyTurn() || !state.gameEls) return;

  clearDiceLayer(state.gameEls);
  const initialQuaternions = state.waitingDiceSpin && typeof state.waitingDiceSpin.getQuaternions === "function"
    ? state.waitingDiceSpin.getQuaternions()
    : [];
  stopWaitingDiceSpin();

  try {
    const animationResult = await animateDiceDrop(state.gameEls.diceLayer, [], { duration: 2200, initialQuaternions });
    const result = resolveRoundResultFromAnimation(animationResult);

    if (!result) {
      throw new Error("サイコロ結果の取得に失敗しました");
    }

    const currentPlayer = getCurrentTurnPlayer(state.roomData);
    const nextTurn = getPlayerRollCount(state.roomData, currentPlayer.id) + 1;
    const turnResult = createTurnResult(result.dice, nextTurn, getMaxPlayerRolls());
    showResultPop("時間切れ");
    setStatus(state.gameEls, turnResult.finished ? `${turnResult.handName} で確定です。` : `${turnResult.handName} です。もう一度振れます。`);
    await advanceTurn(result);
  } catch (error) {
    console.error(error);
    setStatus(state.gameEls, "時間切れ処理に失敗しました。");
  }
}

function scheduleCpuTurn(roomData) {
  clearCpuAutoTurn();
  if (!state.roundActive || !roomData || !isMaster(roomData)) return;

  const currentTurnPlayer = getCurrentTurnPlayer(roomData);
  if (!currentTurnPlayer || !currentTurnPlayer.isCpu) return;

  state.cpuTimerId = window.setTimeout(async () => {
    try {
      if (!state.roomData || String(state.roomData.status || "") !== "playing" || !state.gameEls) return;
      clearDiceLayer(state.gameEls);
      const initialQuaternions = state.waitingDiceSpin && typeof state.waitingDiceSpin.getQuaternions === "function"
        ? state.waitingDiceSpin.getQuaternions()
        : [];
      stopWaitingDiceSpin();
      const animationResult = await animateDiceDrop(state.gameEls.diceLayer, [], { duration: 2200, initialQuaternions });
      const result = resolveRoundResultFromAnimation(animationResult);
      if (!result) {
        throw new Error("CPUサイコロ結果の取得に失敗しました");
      }
      const nextTurn = getPlayerRollCount(state.roomData, currentTurnPlayer.id) + 1;
      const turnResult = createTurnResult(result.dice, nextTurn, getMaxPlayerRolls());
      setStatus(state.gameEls, turnResult.finished ? `${currentTurnPlayer.name} は ${turnResult.handName} で確定です。` : `${currentTurnPlayer.name} は ${turnResult.handName} です。もう一度振ります。`);
      await advanceTurn(result);
    } catch (error) {
      console.error(error);
    }
  }, CPU_THINK_MS);
}

function maybeFinishRound(roomData) {
  if (!roomData || state.finishingRound) return;
  const ordered = getOrderedPlayers(roomData);
  const results = getResultMap(roomData);
  if (!ordered.length || ordered.some((player) => !isPlayerFinished(roomData, player.id))) return;

  state.finishingRound = true;
  stopTimer();
  clearCpuAutoTurn();
  updateResultsOnScreen(roomData);

  const ranking = rankRoundResults(results);
  if (!ranking.winnerIds.length) {
    setStatus(state.gameEls, "結果を出せませんでした。");
  } else if (ranking.winnerIds.length > 1) {
    setStatus(state.gameEls, "引き分けです。");
    showResultPop("引き分け");
  } else {
    const winnerId = ranking.winnerIds[0];
    const winner = ordered.find((player) => player.id === winnerId);
    const winnerName = winner ? winner.name : "勝者";
    setStatus(state.gameEls, `${winnerName} の勝ちです。`);
    showFlashMessage(`${winnerName} の勝ち`);
  }

  if (!isMaster(roomData)) {
    window.setTimeout(() => {
      state.finishingRound = false;
    }, RESULT_SHOW_MS);
    return;
  }

  window.setTimeout(async () => {
    try {
      await update(state.roomRef, {
        status: "waiting",
        parentPlayerId: "",
        currentTurnIndex: 0,
        turnOrder: [],
        roundResults: {},
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error(error);
    } finally {
      state.finishingRound = false;
    }
  }, RESULT_SHOW_MS);
}

function detachRoomListener() {
  if (state.roomRef && state.roomListener) {
    off(state.roomRef, "value", state.roomListener);
  }
  state.roomListener = null;
}

async function leaveRoom() {
  detachRoomListener();
  stopRoundLocally();

  if (!state.roomId) return;

  try {
    await remove(ref(db, `ochinchiroRooms/${state.roomId}/players/${state.myPlayerId}`));
  } catch (error) {
    console.error(error);
  }
}

async function handleBack() {
  await leaveRoom();
  window.location.href = "./lobby.html";
}

function bindRoomButtons() {
  const els = getRoomElements();
  if (els.addCpuBtn) {
    els.addCpuBtn.addEventListener("click", addCpu);
  }
  if (els.startGameBtn) {
    els.startGameBtn.addEventListener("click", startGameFromRoom);
  }
  if (els.leaveRoomBtn) {
    els.leaveRoomBtn.addEventListener("click", handleBack);
  }
}

async function initialize(user) {
  if (state.initializedUserId === String(user.uid || "")) {
    return;
  }

  state.initializedUserId = String(user.uid || "");
  state.currentUser = user;
  state.myProfile = await getUserData(user);
  state.roomId = (localStorage.getItem(ROOM_ID_KEY) || "").trim();
  state.roomWord = (localStorage.getItem(ROOM_WORD_KEY) || "").trim();

  if (!state.roomId || !state.roomWord) {
    window.location.href = "./lobby.html";
    return;
  }

  bindRoomButtons();
  state.roomRef = ref(db, `ochinchiroRooms/${state.roomId}`);
  await rebuildRoomIfNeeded();

  state.roomListener = (snapshot) => {
    const roomData = snapshot && snapshot.exists && snapshot.exists() ? (snapshot.val() || {}) : {};
    state.roomData = roomData;

    if (String(roomData.status || "waiting") === "playing") {
      applyGameView(roomData);
      return;
    }

    stopRoundLocally();
    if (state.screenMode === "game") {
      window.location.reload();
      return;
    }
    renderRoomView(roomData);
  };

  onValue(state.roomRef, state.roomListener);
  window.addEventListener("beforeunload", leaveRoom);
}

onUserChanged(async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  try {
    await initialize(user);
  } catch (error) {
    console.error(error);
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;color:#fff7ef;background:#12070a;">ゲーム画面の準備に失敗しました。</div>';
  }
});


