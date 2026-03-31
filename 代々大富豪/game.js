import { createUI } from "./ui.js";
import { onUserChanged } from "../shared/firebase.js";
import {
  nowMs,
  normalizeRoomSettings,
  buildRulesText,
  getHostPlayerId,
  isCpuId,
  mergeMembersWithCpu,
  createDefaultGameState,
  createRoomManager
} from "./room.js";
import {
  buildDeck,
  shuffleDeck,
  getEffectiveRevolution,
  getRankLabelFromPower,
  sortHandCards,
  getCurrentHand,
  getTradeState,
  getTradePairForPlayer,
  getTradeRoleMap,
  getTradeOrderFromLastResult,
  getStrongestCardIds,
  getWeakestCardIds,
  createMutatePlay,
  validatePlaySelection,
  removeCardsByIds
} from "./playlogic.js";

const form = document.getElementById("entryForm");
const playerNameInput = document.getElementById("playerName");
const roomWordInput = document.getElementById("roomWord");
const joinButton = document.getElementById("joinButton");
const entryPanel = document.getElementById("entryPanel");
const roomPanel = document.getElementById("roomPanel");
const leaveButton = document.getElementById("leaveButton");
const settingsButton = document.getElementById("settingsButton");
const startGameButton = document.getElementById("startGameButton");
const playButton = document.getElementById("playButton");
const passButton = document.getElementById("passButton");
const transferButton = document.getElementById("transferButton");
const roomWordLabel = document.getElementById("roomWordLabel");
const memberCount = document.getElementById("memberCount");
const membersList = document.getElementById("membersList");
const gamePhaseLabel = document.getElementById("gamePhaseLabel");
const turnInfoLabel = document.getElementById("turnInfoLabel");
const actionHintMirror = document.getElementById("actionHintMirror");
const rulesText = document.getElementById("rulesText");
const settingsPanel = document.getElementById("settingsPanel");
const eightCutToggle = document.getElementById("eightCutToggle");
const ninetyNineCarToggle = document.getElementById("ninetyNineCarToggle");
const revolutionToggle = document.getElementById("revolutionToggle");
const stairsToggle = document.getElementById("stairsToggle");
const stairsRevolutionToggle = document.getElementById("stairsRevolutionToggle");
const lockToggle = document.getElementById("lockToggle");
const numberLockToggle = document.getElementById("numberLockToggle");
const skipFiveToggle = document.getElementById("skipFiveToggle");
const tenDumpToggle = document.getElementById("tenDumpToggle");
const jackBackToggle = document.getElementById("jackBackToggle");
const spadeThreeReturnToggle = document.getElementById("spadeThreeReturnToggle");
const sixReverseToggle = document.getElementById("sixReverseToggle");
const sevenPassToggle = document.getElementById("sevenPassToggle");
const miyakoOchiToggle = document.getElementById("miyakoOchiToggle");
const doubleDeckToggle = document.getElementById("doubleDeckToggle");
const foulAgariToggle = document.getElementById("foulAgariToggle");
const turnTime30 = document.getElementById("turnTime30");
const turnTime15 = document.getElementById("turnTime15");
const myHandCount = document.getElementById("myHandCount");
const myHandList = document.getElementById("myHandList");
const cpuAddButton = document.getElementById("cpuAddButton");
const cpuRemoveButton = document.getElementById("cpuRemoveButton");
const cpuCountLabel = document.getElementById("cpuCountLabel");
const entryMessage = document.getElementById("entryMessage");
const roomMessage = document.getElementById("roomMessage");
const countdownLabel = document.getElementById("countdownLabel");
const effectStatusLabel = document.getElementById("effectStatusLabel");
const lockStatusLabel = document.getElementById("lockStatusLabel");
const loginInfoPhoto = document.getElementById("loginInfoPhoto");
const loginInfoName = document.getElementById("loginInfoName");
const loginInfoSub = document.getElementById("loginInfoSub");
const roomLoginInfoPhoto = document.getElementById("roomLoginInfoPhoto");
const roomLoginInfoName = document.getElementById("roomLoginInfoName");
const roomLoginInfoSub = document.getElementById("roomLoginInfoSub");
const entrySettingsButton = document.getElementById("entrySettingsButton");
const roomSettingsGearButton = document.getElementById("roomSettingsGearButton");
const appSettingsOverlay = document.getElementById("appSettingsOverlay");
const appSettingsCloseButton = document.getElementById("appSettingsCloseButton");
const seVolumeSlider = document.getElementById("seVolumeSlider");
const bgmVolumeSlider = document.getElementById("bgmVolumeSlider");
const seVolumeValue = document.getElementById("seVolumeValue");
const bgmVolumeValue = document.getElementById("bgmVolumeValue");
const settingsNicknameInput = document.getElementById("settingsNicknameInput");
const saveNicknameButton = document.getElementById("saveNicknameButton");
const appSettingsMessage = document.getElementById("appSettingsMessage");

settingsPanel.style.maxHeight = "calc(100dvh - 150px)";
settingsPanel.style.overflowY = "auto";
settingsPanel.style.overscrollBehavior = "contain";
settingsPanel.style.paddingRight = "8px";

Array.from(settingsPanel.querySelectorAll(".settingItem")).forEach(function(item) {
  item.style.justifyContent = "flex-start";
  item.style.alignItems = "center";
  item.style.gap = "10px";
});
Array.from(settingsPanel.querySelectorAll(".settingItem > label.switch")).forEach(function(el) {
  el.style.order = "-1";
  el.style.marginRight = "2px";
});
Array.from(settingsPanel.querySelectorAll(".settingItem > .choiceGroup")).forEach(function(el) {
  el.style.marginLeft = "10px";
});

let ui = null;

function renderMembersUI(list) {
  if (ui && typeof ui.renderMembers === "function") ui.renderMembers(list);
}
function renderRoomSettings(settings) {
  currentSettings = normalizeRoomSettings(settings);
  if (ui && typeof ui.renderRoomSettings === "function") ui.renderRoomSettings(currentSettings);
  else {
    rulesText.textContent = buildRulesText(currentSettings);
    applySettingsInputs();
  }
}
function renderGame(game) {
  const previousGame = currentGame;
  if (game && typeof game === "object") {
    currentGame = game;
  } else if (!(currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading"))) {
    currentGame = null;
  }
  rememberReceivedCards(previousGame, currentGame);
  clearSelectionIfNeeded();
  if (ui && typeof ui.renderGame === "function") ui.renderGame(currentGame);
  renderReceivedCardEffects();
}
function setEntryMode() {
  if (ui && typeof ui.setEntryMode === "function") ui.setEntryMode();
  else {
    document.body.classList.remove("inRoom");
    entryPanel.classList.remove("hidden");
    roomPanel.classList.add("hidden");
  }
}
function setRoomMode() {
  if (ui && typeof ui.setRoomMode === "function") ui.setRoomMode();
  else {
    document.body.classList.add("inRoom");
    entryPanel.classList.add("hidden");
    roomPanel.classList.remove("hidden");
  }
}
function updateSettingsViewMode() {
  if (ui && typeof ui.updateSettingsViewMode === "function") ui.updateSettingsViewMode();
}
function updateStartButton() {
  if (ui && typeof ui.updateStartButton === "function") ui.updateStartButton();
}
function updateCountdownLabel() {
  if (ui && typeof ui.updateCountdownLabel === "function") ui.updateCountdownLabel();
}

const playerId = window.crypto && window.crypto.randomUUID
  ? window.crypto.randomUUID()
  : "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);

let roomWord = "";
let currentMembers = [];
let currentGame = null;
let currentLastResult = null;
let currentSettings = normalizeRoomSettings(null);
let selectedCardIds = new Set();
let turnTimerHandle = null;
let timeoutBusy = false;
const EIGHT_CUT_DELAY_MS = 1000;
const TRADE_PHASE_MS = 30000;
const RULE_EFFECT_MS = 1000;
const RULE_EFFECT_IMAGE_MAP = {
  "8切": "./img/skills/8kiri.png",
  "99車": "./img/skills/99sya.png",
  "10捨て": "./img/skills/10sute.png",
  "スペ3返し": "./img/skills/supe3kaesi.png",
  "Jバック": "./img/skills/Jback.png",
  "5飛ばし": "./img/skills/5tobasi.png",
  "6リバース": "./img/skills/6ribasu.png",
  "7渡し": "./img/skills/7watasi.png",
  "数字縛り": "./img/skills/suuzisibari.png",
  "革命": "./img/skills/kakumei.png",
  "階段革命": "./img/skills/kakumei.png",
  "マーク縛り": "./img/skills/makusibari.png"
};
const ENTRY_STORAGE_KEY = "nomi_entry_form_v1";
const APP_VOLUME_STORAGE_KEY = "daifugo_app_volume_v1";
const RENAME_COST_COIN = 100;
const audioState = {
  context: null,
  masterGain: null,
  seGain: null,
  started: false
};
let currentAuthUser = null;
let lastRuleEffectKey = "";
let ruleEffectPlaying = false;
let receivedCardEffectMap = new Map();
const RECEIVED_CARD_EFFECT_MS = 2200;

function getRuleEffectLockUntilMs(effectNames) {
  const names = Array.isArray(effectNames)
    ? effectNames.filter(function(name) { return !!RULE_EFFECT_IMAGE_MAP[name]; })
    : [];
  return names.length ? nowMs() + (RULE_EFFECT_MS * names.length) : 0;
}

function normalize(value) {
  const source = String(value || "").trim();
  let result = "";
  let prevSpace = false;
  for (const ch of source) {
    const code = ch.charCodeAt(0);
    const isSpace = ch === " " || ch === "　" || code === 9 || code === 10 || code === 13;
    if (isSpace) {
      if (!prevSpace) result += " ";
      prevSpace = true;
    } else {
      result += ch;
      prevSpace = false;
    }
  }
  return result.trim();
}
function showEntryMessage(text) { entryMessage.textContent = text || ""; entryMessage.classList.toggle("hidden", !text); }
function clearEntryMessage() { showEntryMessage(""); }
function showRoomMessage(text) { roomMessage.textContent = text || ""; roomMessage.classList.toggle("hidden", !text); }
function clearRoomMessage() { showRoomMessage(""); }
function saveEntryFormToLocal() {
  try {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify({
      playerName: normalize(playerNameInput.value),
      roomWord: normalize(roomWordInput.value)
    }));
  } catch (error) {
    console.error(error);
  }
}
function loadEntryFormFromLocal() {
  try {
    const raw = localStorage.getItem(ENTRY_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === "object") {
      if (!currentAuthUser && typeof saved.playerName === "string") playerNameInput.value = normalize(saved.playerName);
      if (typeof saved.roomWord === "string") roomWordInput.value = normalize(saved.roomWord);
    }
  } catch (error) {
    console.error(error);
  }
}
function getProfileStorageKey(user) {
  return user && user.uid ? "seiseigames_profile_" + user.uid : "";
}
function getStoredProfile(user) {
  if (!user || !user.uid) return { nickname: "", coin: 0 };
  try {
    const raw = localStorage.getItem(getProfileStorageKey(user));
    if (!raw) return { nickname: "", coin: 0 };
    const saved = JSON.parse(raw);
    return {
      nickname: saved && typeof saved.nickname === "string" ? normalize(saved.nickname) : "",
      coin: saved && Number.isFinite(saved.coin) ? Number(saved.coin) : 0
    };
  } catch (error) {
    console.error(error);
    return { nickname: "", coin: 0 };
  }
}

function getNicknameFromUser(user) {
  if (!user || !user.uid) return "";
  const profile = getStoredProfile(user);
  return profile.nickname || normalize(user.displayName || "");
}
function saveStoredProfile(user, patch) {
  if (!user || !user.uid) return { nickname: "", coin: 0 };
  const current = getStoredProfile(user);
  const nextProfile = {
    nickname: typeof patch.nickname === "string" ? normalize(patch.nickname).slice(0, 20) : current.nickname,
    coin: Number.isFinite(patch.coin) ? Math.max(0, Number(patch.coin)) : current.coin
  };
  try {
    localStorage.setItem(getProfileStorageKey(user), JSON.stringify(nextProfile));
  } catch (error) {
    console.error(error);
  }
  return nextProfile;
}
function setAppSettingsMessage(text, isError) {
  if (!appSettingsMessage) return;
  appSettingsMessage.textContent = text || "";
  appSettingsMessage.style.color = isError ? "#ffd2d2" : "rgba(248,245,255,0.78)";
}
function clampVolume(value) {
  if (!Number.isFinite(Number(value))) return 100;
  return Math.max(0, Math.min(100, Number(value)));
}
function getStoredVolumes() {
  try {
    const raw = localStorage.getItem(APP_VOLUME_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return {
      se: clampVolume(saved && saved.se),
      bgm: clampVolume(saved && saved.bgm)
    };
  } catch (error) {
    console.error(error);
    return { se: 100, bgm: 100 };
  }
}
function saveStoredVolumes(nextVolumes) {
  const safeVolumes = {
    se: clampVolume(nextVolumes && nextVolumes.se),
    bgm: clampVolume(nextVolumes && nextVolumes.bgm)
  };
  try {
    localStorage.setItem(APP_VOLUME_STORAGE_KEY, JSON.stringify(safeVolumes));
  } catch (error) {
    console.error(error);
  }
  return safeVolumes;
}
function syncVolumeInputs() {
  const volumes = getStoredVolumes();
  if (seVolumeSlider) seVolumeSlider.value = String(volumes.se);
  if (bgmVolumeSlider) bgmVolumeSlider.value = String(volumes.bgm);
  if (seVolumeValue) seVolumeValue.textContent = String(volumes.se);
  if (bgmVolumeValue) bgmVolumeValue.textContent = String(volumes.bgm);
}
function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioState.context) {
    const context = new AudioContextClass();
    const masterGain = context.createGain();
    const seGain = context.createGain();
    seGain.connect(masterGain);
    masterGain.connect(context.destination);
    audioState.context = context;
    audioState.masterGain = masterGain;
    audioState.seGain = seGain;
  }
  return audioState.context;
}
async function unlockAudio() {
  const context = ensureAudioContext();
  if (!context) return null;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.error(error);
    }
  }
  audioState.started = true;
  applyAudioVolumes();
  return context;
}
function applyAudioVolumes() {
  const volumes = getStoredVolumes();
  if (audioState.seGain) audioState.seGain.gain.value = volumes.se / 100;
}
function playSeTone(kind) {
  const context = ensureAudioContext();
  if (!context || !audioState.started || !audioState.seGain) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = kind === "action" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(kind === "action" ? 720 : 520, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(kind === "action" ? 420 : 680, context.currentTime + 0.08);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
  oscillator.connect(gain);
  gain.connect(audioState.seGain);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.11);
}
function openAppSettings() {
  if (!appSettingsOverlay) return;
  syncVolumeInputs();
  if (settingsNicknameInput) settingsNicknameInput.value = normalize((loginInfoName && loginInfoName.textContent) || getNicknameFromUser(currentAuthUser) || "");
  setAppSettingsMessage("", false);
  appSettingsOverlay.classList.remove("hidden");
  appSettingsOverlay.setAttribute("aria-hidden", "false");
}
function closeAppSettings() {
  if (!appSettingsOverlay) return;
  appSettingsOverlay.classList.add("hidden");
  appSettingsOverlay.setAttribute("aria-hidden", "true");
  setAppSettingsMessage("", false);
}
function playUiSe(kind) {
  unlockAudio().then(function() {
    playSeTone(kind || "ui");
  }).catch(function(error) {
    console.error(error);
  });
}
function applyLoggedInNickname(user) {
  currentAuthUser = user || null;
  const profile = getStoredProfile(user);
  const nickname = profile.nickname || getNicknameFromUser(user);
  const coin = Number(profile.coin || 0);
  playerNameInput.value = nickname;
  playerNameInput.readOnly = !!nickname;
  playerNameInput.disabled = !!nickname;
  playerNameInput.placeholder = nickname ? "ログイン中のニックネームを使用" : "名前";

  const displayName = nickname || normalize(user && user.displayName) || "---";
  const displaySub = "コイン: " + coin;
  if (loginInfoName) loginInfoName.textContent = displayName;
  if (loginInfoSub) loginInfoSub.textContent = displaySub;
  if (loginInfoPhoto) {
    loginInfoPhoto.removeAttribute("src");
    loginInfoPhoto.style.display = "block";
  }

  if (roomLoginInfoName) roomLoginInfoName.textContent = displayName;
  if (roomLoginInfoSub) roomLoginInfoSub.textContent = displaySub;
  if (roomLoginInfoPhoto) {
    roomLoginInfoPhoto.removeAttribute("src");
    roomLoginInfoPhoto.style.display = "block";
  }

  if (settingsNicknameInput) settingsNicknameInput.value = displayName === "---" ? "" : displayName;
  updateState();
}
function updateState() { joinButton.disabled = !(normalize(playerNameInput.value) && normalize(roomWordInput.value)); }

function ensureRuleEffectLayer() {
  let layer = document.getElementById("ruleEffectLayer");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.id = "ruleEffectLayer";
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.display = "flex";
  layer.style.alignItems = "center";
  layer.style.justifyContent = "center";
  layer.style.pointerEvents = "none";
  layer.style.opacity = "0";
  layer.style.zIndex = "10050";
  document.body.appendChild(layer);
  return layer;
}

function playRuleEffectImage(imageSrc) {
  return new Promise(function(resolve) {
    if (!imageSrc) {
      resolve();
      return;
    }
    const layer = ensureRuleEffectLayer();
    layer.innerHTML = "";
    layer.style.transition = "none";
    layer.style.opacity = "0";
    layer.style.background = "rgba(0, 0, 0, 0)";

    const flash = document.createElement("div");
    flash.style.position = "absolute";
    flash.style.inset = "0";
    flash.style.background = "rgba(255,255,255,0.88)";
    flash.style.opacity = "0";
    flash.style.transition = "opacity 140ms ease";

    const image = document.createElement("img");
    image.src = imageSrc;
    image.alt = "";
    image.draggable = false;
    image.style.width = "min(26vw, 260px)";
    image.style.maxWidth = "260px";
    image.style.minWidth = "180px";
    image.style.objectFit = "contain";
    image.style.opacity = "0";
    image.style.transform = "scale(0.82)";
    image.style.filter = "drop-shadow(0 18px 44px rgba(0,0,0,0.48))";
    image.style.transition = "opacity 180ms ease, transform 180ms ease";

    layer.appendChild(flash);
    layer.appendChild(image);

    requestAnimationFrame(function() {
      layer.style.transition = "opacity 120ms ease, background 180ms ease";
      layer.style.opacity = "1";
      layer.style.background = "rgba(0, 0, 0, 0.3)";
      flash.style.opacity = "1";
      image.style.opacity = "1";
      image.style.transform = "scale(1)";
      window.setTimeout(function() {
        flash.style.opacity = "0";
      }, 80);
      window.setTimeout(function() {
        layer.style.opacity = "0";
        layer.style.background = "rgba(0, 0, 0, 0)";
        image.style.opacity = "0";
        image.style.transform = "scale(1.04)";
      }, RULE_EFFECT_MS - 180);
      window.setTimeout(function() {
        layer.innerHTML = "";
        resolve();
      }, RULE_EFFECT_MS);
    });
  });
}

async function maybePlayRuleEffects(game) {
  const effectState = game && game.ruleEffectState && typeof game.ruleEffectState === "object" ? game.ruleEffectState : null;
  const key = effectState && effectState.key ? String(effectState.key) : "";
  const names = effectState && Array.isArray(effectState.names) ? effectState.names.filter(function(name) {
    return !!RULE_EFFECT_IMAGE_MAP[name];
  }) : [];
  if (!key || !names.length || key === lastRuleEffectKey || ruleEffectPlaying) return;
  lastRuleEffectKey = key;
  ruleEffectPlaying = true;
  try {
    for (const name of names) {
      await playRuleEffectImage(RULE_EFFECT_IMAGE_MAP[name]);
    }
  } finally {
    ruleEffectPlaying = false;
  }
}

function collectRoomSettingsFromInputs() {
  return normalizeRoomSettings({
    eightCutEnabled: !!(eightCutToggle && eightCutToggle.checked),
    ninetyNineCarEnabled: !!(ninetyNineCarToggle && ninetyNineCarToggle.checked),
    revolutionEnabled: !!(revolutionToggle && revolutionToggle.checked),
    stairsEnabled: !!(stairsToggle && stairsToggle.checked),
    stairsRevolutionEnabled: !!(stairsRevolutionToggle && stairsRevolutionToggle.checked),
    lockEnabled: !!(lockToggle && lockToggle.checked),
    numberLockEnabled: !!(numberLockToggle && numberLockToggle.checked),
    skipFiveEnabled: !!(skipFiveToggle && skipFiveToggle.checked),
    tenDumpEnabled: !!(tenDumpToggle && tenDumpToggle.checked),
    jackBackEnabled: !!(jackBackToggle && jackBackToggle.checked),
    spadeThreeReturnEnabled: !!(spadeThreeReturnToggle && spadeThreeReturnToggle.checked),
    sixReverseEnabled: !!(sixReverseToggle && sixReverseToggle.checked),
    sevenPassEnabled: !!(sevenPassToggle && sevenPassToggle.checked),
    miyakoOchiEnabled: !!(miyakoOchiToggle && miyakoOchiToggle.checked),
    doubleDeckEnabled: !!(doubleDeckToggle && doubleDeckToggle.checked),
    foulAgariEnabled: !!(foulAgariToggle && foulAgariToggle.checked),
    turnTimeSeconds: turnTime15 && turnTime15.checked ? 15 : 30,
    cpuCount: currentSettings.cpuCount || 0
  });
}
function isHostPlayer() {
  return !!currentMembers.find(function(member) { return member.id === playerId && member.isHost; });
}
function isMyTurn() {
  return !!(currentGame && currentGame.phase === "playing" && currentGame.currentTurnPlayerId === playerId && !currentGame.pendingClearField);
}
function isPendingTransferMine() {
  return !!(currentGame && currentGame.pendingSevenPass && currentGame.pendingSevenPass.fromPlayerId === playerId);
}
function isTradePhase() {
  return !!(currentGame && currentGame.phase === "trading");
}
function amAuthority() {
  return isHostPlayer();
}
function applySettingsInputs() {
  const map = [
    [eightCutToggle, currentSettings.eightCutEnabled], [ninetyNineCarToggle, currentSettings.ninetyNineCarEnabled], [revolutionToggle, currentSettings.revolutionEnabled], [stairsToggle, currentSettings.stairsEnabled],
    [stairsRevolutionToggle, currentSettings.stairsRevolutionEnabled], [lockToggle, currentSettings.lockEnabled], [numberLockToggle, currentSettings.numberLockEnabled],
    [skipFiveToggle, currentSettings.skipFiveEnabled], [tenDumpToggle, currentSettings.tenDumpEnabled], [jackBackToggle, currentSettings.jackBackEnabled], [spadeThreeReturnToggle, currentSettings.spadeThreeReturnEnabled], [sixReverseToggle, currentSettings.sixReverseEnabled],
    [sevenPassToggle, currentSettings.sevenPassEnabled], [miyakoOchiToggle, currentSettings.miyakoOchiEnabled], [doubleDeckToggle, currentSettings.doubleDeckEnabled], [foulAgariToggle, currentSettings.foulAgariEnabled]
  ];
  map.forEach(function(item) {
    if (item[0]) item[0].checked = !!item[1];
  });
  if (turnTime30) turnTime30.checked = currentSettings.turnTimeSeconds !== 15;
  if (turnTime15) turnTime15.checked = currentSettings.turnTimeSeconds === 15;
  const canEdit = isHostPlayer() && !(currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading"));
  [eightCutToggle, ninetyNineCarToggle, revolutionToggle, stairsToggle, stairsRevolutionToggle, lockToggle, numberLockToggle, skipFiveToggle, tenDumpToggle, jackBackToggle, spadeThreeReturnToggle, sixReverseToggle, sevenPassToggle, miyakoOchiToggle, doubleDeckToggle, foulAgariToggle, turnTime30, turnTime15]
    .forEach(function(input) { if (input) input.disabled = !canEdit; });
  if (cpuAddButton) cpuAddButton.disabled = !canEdit || currentSettings.cpuCount >= 6;
  if (cpuRemoveButton) cpuRemoveButton.disabled = !canEdit || currentSettings.cpuCount <= 0;
  if (cpuCountLabel) cpuCountLabel.textContent = String(currentSettings.cpuCount || 0);
}

function getStartPlayerIdFromLastResult(lastResult, members) {
  const order = getTradeOrderFromLastResult(lastResult, members);
  return order.length ? order[order.length - 1] : "";
}

function getMemberName(id, list) {
  const source = Array.isArray(list) ? list : currentMembers;
  const found = source.find(function(member) { return member.id === id; });
  return found && found.name ? found.name : "プレイヤー";
}

function getSelectedHandCards() {
  const hand = currentGame ? getCurrentHand(currentGame, playerId) : [];
  return hand.filter(function(card) { return selectedCardIds.has(card.id); });
}
function clearSelectionIfNeeded() {
  const handIds = new Set(getCurrentHand(currentGame, playerId).map(function(card) { return card.id; }));
  Array.from(selectedCardIds).forEach(function(id) {
    if (!handIds.has(id)) selectedCardIds.delete(id);
  });
  if (!isMyTurn() && !isPendingTransferMine() && !isTradePhase()) selectedCardIds.clear();
}

function rememberReceivedCards(previousGame, nextGame) {
  if (!previousGame || !nextGame) return;
  if (!((previousGame.phase === "playing" || previousGame.phase === "trading") && (nextGame.phase === "playing" || nextGame.phase === "trading" || nextGame.phase === "finished"))) return;
  const beforeIds = new Set(getCurrentHand(previousGame, playerId).map(function(card) { return card.id; }));
  const afterHand = getCurrentHand(nextGame, playerId);
  if (!beforeIds.size || !afterHand.length) return;
  const addedIds = afterHand.filter(function(card) { return !beforeIds.has(card.id); }).map(function(card) { return card.id; });
  if (!addedIds.length) return;
  const now = nowMs();
  addedIds.forEach(function(id) {
    receivedCardEffectMap.set(id, now + RECEIVED_CARD_EFFECT_MS);
  });
}

function renderReceivedCardEffects() {
  const now = nowMs();
  Array.from(receivedCardEffectMap.keys()).forEach(function(id) {
    const expireAt = receivedCardEffectMap.get(id) || 0;
    if (expireAt <= now) receivedCardEffectMap.delete(id);
  });
  const nodes = myHandList ? myHandList.querySelectorAll("[data-card-id]") : [];
  nodes.forEach(function(node) {
    const id = node.getAttribute("data-card-id") || "";
    const active = !!id && receivedCardEffectMap.has(id);
    node.style.boxShadow = active ? "0 0 0 2px rgba(255,235,120,0.95), 0 0 18px rgba(255,220,90,0.85)" : "";
    node.style.transform = active ? "translateY(-4px) scale(1.04)" : "";
    node.style.transition = active ? "transform 180ms ease, box-shadow 180ms ease" : "";
  });
  if (!receivedCardEffectMap.size) return;
  window.clearTimeout(renderReceivedCardEffects._timer);
  renderReceivedCardEffects._timer = window.setTimeout(function() {
    renderReceivedCardEffects();
  }, 120);
}

function stopTurnWatcher() {
  if (turnTimerHandle) {
    clearInterval(turnTimerHandle);
    turnTimerHandle = null;
  }
}
function startTurnWatcher() {
  if (turnTimerHandle) return;
  turnTimerHandle = window.setInterval(async function() {
    updateCountdownLabel();
    if (!currentGame || timeoutBusy) return;
    timeoutBusy = true;
    try {
      if (currentGame.phase === "playing" && currentGame.pendingClearField && currentGame.pendingClearField.executeAtMs && nowMs() >= currentGame.pendingClearField.executeAtMs) {
        await resolvePendingClearField();
        return;
      }
      if (!amAuthority()) return;
      if (currentGame.phase === "trading") {
        const tradeState = getTradeState(currentGame);
        const cpuPair = tradeState && Array.isArray(tradeState.pairs)
          ? tradeState.pairs.find(function(pair) { return !pair.done && isCpuId(pair.fromPlayerId); })
          : null;
        if (cpuPair) {
          await runRoomTransaction(function(roomData) {
            const roomGame = roomData.gameData;
            const roomTradeState = getTradeState(roomGame);
            const roomPair = roomTradeState && Array.isArray(roomTradeState.pairs)
              ? roomTradeState.pairs.find(function(pair) { return !pair.done && pair.fromPlayerId === cpuPair.fromPlayerId; })
              : null;
            if (!roomPair) return { ok: false };
            const cpuHand = getCurrentHand(roomGame, roomPair.fromPlayerId);
            const giveIds = getWeakestCardIds(cpuHand, roomPair.count);
            return mutatePlay(roomData, roomPair.fromPlayerId, giveIds, "trade");
          });
        } else if (tradeState && tradeState.startedAtMs && nowMs() - tradeState.startedAtMs >= TRADE_PHASE_MS) {
          await resolveTradeTimeout();
        }
      } else if (currentGame.phase === "playing") {
        if ((currentGame.pendingSevenPass && isCpuId(currentGame.pendingSevenPass.fromPlayerId)) || isCpuId(currentGame.currentTurnPlayerId)) {
          const cpuActionAtMs = currentGame.cpuActionAtMs || 0;
          if (!cpuActionAtMs || nowMs() >= cpuActionAtMs) {
            await resolveCpuAuto();
          }
        } else {
          const limit = (currentGame.turnTimeSeconds || currentSettings.turnTimeSeconds || 30) * 1000;
          const startedAt = currentGame.currentTurnStartedAtMs || 0;
          if (startedAt && nowMs() - startedAt >= limit) {
            await resolveTurnTimeout();
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      timeoutBusy = false;
    }
  }, 250);
}

function renderMembers(members, settings) {
  const list = mergeMembersWithCpu(members, settings);
  currentMembers = list;
  renderMembersUI(list);
}


function cardText(card) {
  if (card && card.rank === "JOKER") return "JOKER";
  return String((card && card.suit) || "") + String((card && card.rank) || "");
}
function cardClass(card) { return card && (card.suit === "♥" || card.suit === "♦") ? "cardChip cardRed" : "cardChip cardBlack"; }
function cardInlineStyle(card) {
  if (!(card && card.rank === "JOKER")) return "";
  return "font-size:12px;padding:0 10px;min-width:0;letter-spacing:0.2px;";
}
function getRoleBadgeHtml(role) {
  if (!role) return "";
  const styleMap = {
    "大富豪": "color:#fff6c8;border-color:rgba(246,196,83,0.55);background:rgba(246,196,83,0.24);",
    "富豪": "color:#ffe7b8;border-color:rgba(255,173,92,0.45);background:rgba(255,173,92,0.18);",
    "平民": "color:#d9fff1;border-color:rgba(255,255,255,0.14);background:rgba(255,255,255,0.08);",
    "貧民": "color:#cfe2ff;border-color:rgba(116,170,255,0.45);background:rgba(116,170,255,0.18);",
    "大貧民": "color:#ffd2d2;border-color:rgba(255,106,106,0.5);background:rgba(255,106,106,0.2);"
  };
  return '<span class="seatBadge subtle" style="' + (styleMap[role] || styleMap["平民"]) + '">' + String(role || "") + '</span>';
}

const mutatePlay = createMutatePlay({
  nowMs,
  normalizeRoomSettings,
  getHostPlayerId,
  isCpuId,
  mergeMembersWithCpu,
  getMemberName,
  ruleEffectImageMap: RULE_EFFECT_IMAGE_MAP,
  getRuleEffectLockUntilMs,
  eightCutDelayMs: EIGHT_CUT_DELAY_MS
});

const roomManager = createRoomManager({
  playerId,
  getCurrentSettings: function() {
    return currentSettings;
  },
  getCurrentGame: function() {
    return currentGame;
  },
  onRoomSnapshot: function(payload) {
    const data = payload && payload.data ? payload.data : {};
    roomWord = payload && payload.roomWord ? payload.roomWord : roomWord;
    currentLastResult = data.lastResult || null;
    renderMembers(data.members, data.settings);
    renderRoomSettings(data.settings);
    renderGame(data.gameData);
    maybePlayRuleEffects(data.gameData);
    setRoomMode();
  },
  onJoinRoom: function(payload) {
    roomWord = payload && payload.roomWord ? payload.roomWord : roomWord;
    clearEntryMessage();
    clearRoomMessage();
    startTurnWatcher();
    setRoomMode();
  },
  onLeaveRoom: function() {
    roomWord = "";
    lastRuleEffectKey = "";
    ruleEffectPlaying = false;
    currentMembers = [];
    currentGame = null;
    currentLastResult = null;
    currentSettings = normalizeRoomSettings(null);
    selectedCardIds = new Set();
    receivedCardEffectMap = new Map();
    timeoutBusy = false;
    clearEntryMessage();
    clearRoomMessage();
    setEntryMode();
    renderRoomSettings(currentSettings);
  },
  onResetTransientState: function() {
    stopTurnWatcher();
  }
});

async function runRoomTransaction(mutator) {
  return roomManager.runRoomTransaction(mutator);
}

async function joinRoom(playerName, word) {
  return roomManager.joinRoom(playerName, word);
}

async function startGame() {
  await runRoomTransaction(function(roomData) {
    const members = mergeMembersWithCpu(roomData.members, roomData.settings);
    const settings = normalizeRoomSettings(roomData.settings);
    const game = roomData.gameData || createDefaultGameState(roomData.lastResult && roomData.lastResult.topPlayerId, settings);
    if (members.length < 2) throw new Error("2人以上で開始できます");
    if (getHostPlayerId(roomData.members) !== playerId) throw new Error("親だけが開始できます");
    if (game.phase === "playing" || game.phase === "trading") throw new Error("すでにゲーム中です");
    const turnOrder = members.map(function(member) { return member.id; });
    const hands = {};
    turnOrder.forEach(function(id) { hands[id] = []; });
    shuffleDeck(buildDeck(settings.doubleDeckEnabled)).forEach(function(card, index) {
      hands[turnOrder[index % turnOrder.length]].push(card);
    });
    turnOrder.forEach(function(id) { hands[id] = sortHandCards(hands[id]); });

    const lastResult = roomData.lastResult && Array.isArray(roomData.lastResult.finishOrder) ? roomData.lastResult : null;
    const count = members.length;
    let phase = "playing";
    let tradeState = null;
    let lastActionText = "ゲーム開始";
    let firstTurnPlayerId = turnOrder[0] || "";

    if (lastResult && lastResult.finishOrder.length === count && count >= 4) {
      const order = getTradeOrderFromLastResult(lastResult, members);
      const pairs = [
        { fromPlayerId: order[0], toPlayerId: order[count - 1], count: 2 },
        { fromPlayerId: order[1], toPlayerId: order[count - 2], count: 1 }
      ].filter(function(pair) { return pair.fromPlayerId && pair.toPlayerId && pair.fromPlayerId !== pair.toPlayerId; });
      if (pairs.length) {
        phase = "trading";
        tradeState = {
          startedAtMs: nowMs(),
          pairs: pairs.map(function(pair) {
            const forcedIds = getStrongestCardIds(hands[pair.toPlayerId], pair.count);
            const forcedCards = getCurrentHand({ hands: hands }, pair.toPlayerId).filter(function(card) { return forcedIds.includes(card.id); });
            hands[pair.toPlayerId] = sortHandCards(removeCardsByIds(hands[pair.toPlayerId], forcedIds));
            return {
              fromPlayerId: pair.fromPlayerId,
              toPlayerId: pair.toPlayerId,
              count: pair.count,
              forcedReturnCards: forcedCards,
              selectedGiveCards: [],
              done: false
            };
          })
        };
        lastActionText = lastResult && lastResult.miyakoOchiPlayerId
          ? getMemberName(lastResult.miyakoOchiPlayerId, members) + " が都落ち / カード交換中"
          : "カード交換中";
      } else {
        firstTurnPlayerId = getStartPlayerIdFromLastResult(lastResult, members) || firstTurnPlayerId;
      }
    }

    roomData.gameData = {
      phase: phase,
      startedAtMs: nowMs(),
      revolution: false,
      jackBackActive: false,
      direction: 1,
      turnOrder: turnOrder,
      currentTurnPlayerId: phase === "playing" ? firstTurnPlayerId : "",
      currentTurnStartedAtMs: phase === "playing" ? nowMs() : 0,
      cpuActionAtMs: phase === "playing" && isCpuId(firstTurnPlayerId) ? nowMs() + 500 : 0,
      hands: hands,
      lastPlay: null,
      lastPlayPlayerId: "",
      passedPlayerIds: [],
      lockedSuitKey: "",
      numberLockKey: null,
      finishOrder: [],
      fallenPlayerIds: [],
      miyakoDroppedPlayerId: "",
      pendingSevenPass: null,
      pendingClearField: null,
      resolvedField: null,
      tradeState: tradeState,
      previousChampionId: roomData.lastResult && roomData.lastResult.topPlayerId ? roomData.lastResult.topPlayerId : "",
      miyakoDropped: false,
      turnTimeSeconds: settings.turnTimeSeconds,
      ruleSettings: settings,
      lastActionText: lastActionText,
      ruleEffectState: null,
      pendingRuleEffectUntilMs: 0
    };
    return { ok: true, room: roomData };
  });
}

async function saveRoomSettings(nextSettings) {
  return roomManager.saveRoomSettings(nextSettings);
}

async function endGameSession() {
  return roomManager.endGameSession();
}



async function applyPlay(actorId, cardIds) {
  await runRoomTransaction(function(roomData) { return mutatePlay(roomData, actorId, cardIds, "play"); });
}
async function applyPass(actorId) {
  await runRoomTransaction(function(roomData) { return mutatePlay(roomData, actorId, [], "pass"); });
}
async function applySevenTransfer(actorId, cardIds) {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, actorId, cardIds, isTradePhase() ? "trade" : "transfer");
  });
}
async function resolveTurnTimeout() {
  await runRoomTransaction(function(roomData) { return mutatePlay(roomData, playerId, [], "timeout"); });
}
async function resolveCpuAuto() {
  await runRoomTransaction(function(roomData) { return mutatePlay(roomData, playerId, [], "auto"); });
}
async function resolvePendingClearField() {
  await runRoomTransaction(function(roomData) { return mutatePlay(roomData, playerId, [], "resolveEightCut"); });
}
async function resolveTradeTimeout() {
  await runRoomTransaction(function(roomData) { return mutatePlay(roomData, playerId, [], "resolveTrade"); });
}

async function transferRoomOwner(targetPlayerId) {
  return roomManager.transferRoomOwner(targetPlayerId);
}

async function kickRoomMember(targetPlayerId) {
  return roomManager.kickRoomMember(targetPlayerId);
}

async function leaveRoom() {
  clearRoomMessage();
  return roomManager.leaveRoom();
}

playerNameInput.addEventListener("input", function() {
  clearEntryMessage();
  saveEntryFormToLocal();
  updateState();
});
roomWordInput.addEventListener("input", function() {
  clearEntryMessage();
  saveEntryFormToLocal();
  updateState();
});

form.addEventListener("submit", async function(event) {
  playUiSe("action");
  event.preventDefault();
  clearEntryMessage();
  const playerName = normalize(playerNameInput.value);
  const word = normalize(roomWordInput.value);
  if (!currentAuthUser) {
    showEntryMessage("Googleログイン後に入室してください");
    updateState();
    return;
  }
  if (!playerName || !word) {
    updateState();
    return;
  }
  joinButton.disabled = true;
  saveEntryFormToLocal();
  try {
    await joinRoom(playerName, word);
  } catch (error) {
    console.error(error);
    showEntryMessage(error && error.message ? error.message : "入室に失敗しました");
  } finally {
    updateState();
  }
});

settingsButton.addEventListener("click", async function() {
  playUiSe("ui");
  if (!isHostPlayer()) return;
  if (currentGame && currentGame.phase === "finished") {
    clearRoomMessage();
    try {
      await endGameSession();
    } catch (error) {
      console.error(error);
      showRoomMessage(error && error.message ? error.message : "終了に失敗しました");
    }
    return;
  }
  if (currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading")) return;
  settingsPanel.classList.toggle("hidden");
  updateSettingsViewMode();
});

async function handleRoomSettingsChange() {
  try {
    await saveRoomSettings(collectRoomSettingsFromInputs());
    clearRoomMessage();
  } catch (error) {
    console.error(error);
    showRoomMessage(error && error.message ? error.message : "設定変更に失敗しました");
    applySettingsInputs();
  }
}

[eightCutToggle, ninetyNineCarToggle, revolutionToggle, stairsToggle, stairsRevolutionToggle, lockToggle, numberLockToggle, skipFiveToggle, tenDumpToggle, jackBackToggle, spadeThreeReturnToggle, sixReverseToggle, sevenPassToggle, miyakoOchiToggle, doubleDeckToggle, foulAgariToggle, turnTime30, turnTime15]
  .forEach(function(input) { if (input) input.addEventListener("change", handleRoomSettingsChange); });
if (cpuAddButton) {
  cpuAddButton.addEventListener("click", async function() {
    playUiSe("ui");
    if (!isHostPlayer()) return;
    try {
      const nextSettings = Object.assign({}, currentSettings, { cpuCount: Math.min(6, (currentSettings.cpuCount || 0) + 1) });
      currentSettings = normalizeRoomSettings(nextSettings);
      applySettingsInputs();
      await saveRoomSettings(nextSettings);
      clearRoomMessage();
    } catch (error) {
      console.error(error);
      showRoomMessage(error && error.message ? error.message : "CPU追加に失敗しました");
    }
  });
}
if (cpuRemoveButton) {
  cpuRemoveButton.addEventListener("click", async function() {
    playUiSe("ui");
    if (!isHostPlayer()) return;
    try {
      const nextSettings = Object.assign({}, currentSettings, { cpuCount: Math.max(0, (currentSettings.cpuCount || 0) - 1) });
      currentSettings = normalizeRoomSettings(nextSettings);
      applySettingsInputs();
      await saveRoomSettings(nextSettings);
      clearRoomMessage();
    } catch (error) {
      console.error(error);
      showRoomMessage(error && error.message ? error.message : "CPU削除に失敗しました");
    }
  });
}

startGameButton.addEventListener("click", async function() {
  playUiSe("action");
  clearRoomMessage();
  startGameButton.disabled = true;
  try {
    await startGame();
  } catch (error) {
    console.error(error);
    showRoomMessage(error && error.message ? error.message : "ゲーム開始に失敗しました");
  } finally {
    updateStartButton();
  }
});

if (entrySettingsButton) {
  entrySettingsButton.addEventListener("click", function() {
    playUiSe("ui");
    openAppSettings();
  });
}
if (roomSettingsGearButton) {
  roomSettingsGearButton.addEventListener("click", function() {
    playUiSe("ui");
    openAppSettings();
  });
}
if (appSettingsCloseButton) {
  appSettingsCloseButton.addEventListener("click", function() {
    playUiSe("ui");
    closeAppSettings();
  });
}
if (appSettingsOverlay) {
  appSettingsOverlay.addEventListener("click", function(event) {
    if (event.target === appSettingsOverlay) {
      playUiSe("ui");
      closeAppSettings();
    }
  });
}
if (seVolumeSlider) {
  seVolumeSlider.addEventListener("input", function() {
    const safeValue = Math.max(0, Math.min(100, Number(seVolumeSlider.value) || 0));
    if (seVolumeValue) seVolumeValue.textContent = String(safeValue);
    saveStoredVolumes({ se: safeValue, bgm: bgmVolumeSlider ? bgmVolumeSlider.value : getStoredVolumes().bgm });
    applyAudioVolumes();
  });
}
if (bgmVolumeSlider) {
  bgmVolumeSlider.addEventListener("input", function() {
    const safeValue = Math.max(0, Math.min(100, Number(bgmVolumeSlider.value) || 0));
    if (bgmVolumeValue) bgmVolumeValue.textContent = String(safeValue);
    saveStoredVolumes({ se: seVolumeSlider ? seVolumeSlider.value : getStoredVolumes().se, bgm: safeValue });
  });
}
if (saveNicknameButton) {
  saveNicknameButton.addEventListener("click", function() {
    playUiSe("action");
    if (!currentAuthUser) {
      setAppSettingsMessage("ログイン後に変更できます", true);
      return;
    }
    const nextName = normalize(settingsNicknameInput && settingsNicknameInput.value).slice(0, 20);
    if (!nextName) {
      setAppSettingsMessage("名前を入れてください", true);
      return;
    }
    const profile = getStoredProfile(currentAuthUser);
    const currentName = profile.nickname || getNicknameFromUser(currentAuthUser);
    if (nextName === currentName) {
      setAppSettingsMessage("同じ名前です", true);
      return;
    }
    const nextCoin = Number(profile.coin || 0) - RENAME_COST_COIN;
    if (nextCoin < 0) {
      setAppSettingsMessage("コインが足りません", true);
      return;
    }
    saveStoredProfile(currentAuthUser, {
      nickname: nextName,
      coin: nextCoin
    });
    applyLoggedInNickname(currentAuthUser);
    setAppSettingsMessage("名前を変更しました", false);
  });
}

ui = createUI({
  refs: {
    entryPanel,
    roomPanel,
    leaveButton,
    settingsPanel,
    settingsButton,
    startGameButton,
    rulesText,
    membersList,
    myHandCount,
    myHandList,
    playButton,
    passButton,
    transferButton,
    gamePhaseLabel,
    turnInfoLabel,
    roomWordLabel,
    memberCount,
    actionHintMirror,
    effectStatusLabel,
    lockStatusLabel,
    countdownLabel
  },
  getState: function() {
    return {
      playerId,
      roomWord,
      currentMembers,
      currentGame,
      currentLastResult,
      currentSettings,
      selectedCardIds
    };
  },
  helpers: {
    nowMs,
    getMemberName,
    getCurrentHand,
    getTradePairForPlayer,
    getTradeRoleMap,
    getRoleBadgeHtml,
    getEffectiveRevolution,
    getRankLabelFromPower,
    sortHandCards,
    cardText,
    cardClass,
    cardInlineStyle,
    validatePlaySelection,
    normalizeRoomSettings,
    buildRulesText,
    isHostPlayer,
    isMyTurn,
    isPendingTransferMine,
    isTradePhase
  },
  actions: {
    onLeaveRoom: async function() {
      playUiSe("ui");
      await leaveRoom();
    },
    onToggleCard: function(cardId) {
      if (!cardId) return;
      if (selectedCardIds.has(cardId)) selectedCardIds.delete(cardId);
      else selectedCardIds.add(cardId);
      if (ui && typeof ui.renderMyHand === "function") ui.renderMyHand(getCurrentHand(currentGame, playerId));
      renderReceivedCardEffects();
    },
    onPlay: async function() {
      playUiSe("action");
      clearRoomMessage();
      try {
        await applyPlay(playerId, getSelectedHandCards().map(function(card) { return card.id; }));
        selectedCardIds.clear();
      } catch (error) {
        console.error(error);
        showRoomMessage(error && error.message ? error.message : "カードを出せませんでした");
      }
    },
    onPass: async function() {
      playUiSe("ui");
      clearRoomMessage();
      try {
        await applyPass(playerId);
        selectedCardIds.clear();
      } catch (error) {
        console.error(error);
        showRoomMessage(error && error.message ? error.message : "パスできませんでした");
      }
    },
    onTransfer: async function() {
      playUiSe("action");
      clearRoomMessage();
      try {
        await applySevenTransfer(playerId, getSelectedHandCards().map(function(card) { return card.id; }));
        selectedCardIds.clear();
      } catch (error) {
        console.error(error);
        showRoomMessage(error && error.message ? error.message : "カードを渡せませんでした");
      }
    },
    onSeatOwnerTransfer: async function(targetPlayerId) {
      clearRoomMessage();
      try {
        await transferRoomOwner(targetPlayerId);
      } catch (error) {
        console.error(error);
        showRoomMessage(error && error.message ? error.message : "オーナー譲渡に失敗しました");
      }
    },
    onSeatKick: async function(targetPlayerId) {
      clearRoomMessage();
      try {
        await kickRoomMember(targetPlayerId);
      } catch (error) {
        console.error(error);
        showRoomMessage(error && error.message ? error.message : "キックに失敗しました");
      }
    }
  }
});

onUserChanged(function(user) {
  applyLoggedInNickname(user || null);
  if (!user && !roomWord) {
    showEntryMessage("Googleログイン後に入室できます");
  } else if (user) {
    clearEntryMessage();
  }
});

loadEntryFormFromLocal();
syncVolumeInputs();
applyAudioVolumes();
renderRoomSettings(currentSettings);
setEntryMode();
updateState();
