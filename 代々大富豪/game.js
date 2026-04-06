import { createUI } from "./ui.js";
import { createGameUiRuntime } from "./gameui.js";
import { onUserChanged } from "../shared/firebase.js";
import { getUserData, updateUserData, useUserCoin, transferUserCoinByUid, addUserCoinByUid, useUserCoinByUid } from "../shared/userDate.js";
import {
  nowMs,
  getServerNowMs,
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
  getStartPlayerIdFromLastResult,
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

const playerId = window.crypto && window.crypto.randomUUID
  ? window.crypto.randomUUID()
  : "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);

const EIGHT_CUT_DELAY_MS = 1000;
const TRADE_PHASE_MS = 30000;
const RULE_EFFECT_MS = 1000;
const RECEIVED_CARD_EFFECT_MS = 2200;
const RESULT_OVERLAY_MS = 5000;
const ENTRY_STORAGE_KEY = "nomi_entry_form_v1";
const APP_VOLUME_STORAGE_KEY = "daifugo_app_volume_v1";
const RENAME_COST_COIN = 100;
const ROOM_EXPIRED_MESSAGE = "部屋の有効期限が切れました";
const BET_REQUIRED_COIN = 20;
const BET_BIG_AMOUNT = 20;
const BET_SMALL_AMOUNT = 10;
const CPU_ACTION_DELAY_MS = 1000;

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

const SE_AUDIO_PATHS = {
  skipFive: "./audio/se/５飛ばし.ogg",
  skill: "./audio/se/スキル.ogg",
  revolution: "./audio/se/革命.ogg",
  ownTurn: "./audio/se/自分のターン.ogg",
  cut: "./audio/se/切り.ogg",
  join: "./audio/se/入室.ogg",
  lock: "./audio/se/縛り.ogg"
};

const BGM_AUDIO_PATHS = {
  playing: "./audio/bgm/ゲームロビー.ogg",
  revolution: "./audio/bgm/ゲームロビー（革命中）.m4a"
};

let roomWord = "";
let currentMembers = [];
let currentGame = null;
let currentLastResult = null;
let currentSettings = normalizeRoomSettings(null);
let currentAuthUser = null;
let turnTimerHandle = null;
let timeoutBusy = false;
let startGameBusy = false;

function getMemberName(id, list) {
  const source = Array.isArray(list) ? list : currentMembers;
  const found = source.find(function(member) { return member.id === id; });
  return found && found.name ? found.name : "プレイヤー";
}

function cardText(card) {
  if (card && card.rank === "JOKER") return "JOKER";
  return String((card && card.suit) || "") + String((card && card.rank) || "");
}

function cardClass(card) {
  return card && (card.suit === "♥" || card.suit === "♦") ? "cardChip cardRed" : "cardChip cardBlack";
}

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

const gameUiRuntime = createGameUiRuntime({
  refs: {
    playerId,
    form,
    playerNameInput,
    roomWordInput,
    joinButton,
    entryPanel,
    roomPanel,
    leaveButton,
    settingsButton,
    startGameButton,
    playButton,
    passButton,
    transferButton,
    roomWordLabel,
    memberCount,
    membersList,
    gamePhaseLabel,
    turnInfoLabel,
    actionHintMirror,
    rulesText,
    settingsPanel,
    myHandCount,
    myHandList,
    cpuAddButton,
    cpuRemoveButton,
    cpuCountLabel,
    entryMessage,
    roomMessage,
    countdownLabel,
    effectStatusLabel,
    lockStatusLabel,
    loginInfoPhoto,
    loginInfoName,
    loginInfoSub,
    roomLoginInfoPhoto,
    roomLoginInfoName,
    roomLoginInfoSub,
    entrySettingsButton,
    roomSettingsGearButton,
    appSettingsOverlay,
    appSettingsCloseButton,
    seVolumeSlider,
    bgmVolumeSlider,
    seVolumeValue,
    bgmVolumeValue,
    settingsNicknameInput,
    saveNicknameButton,
    appSettingsMessage,
    eightCutToggle,
    ninetyNineCarToggle,
    revolutionToggle,
    stairsToggle,
    stairsRevolutionToggle,
    lockToggle,
    numberLockToggle,
    skipFiveToggle,
    tenDumpToggle,
    jackBackToggle,
    spadeThreeReturnToggle,
    sixReverseToggle,
    sevenPassToggle,
    miyakoOchiToggle,
    doubleDeckToggle,
    foulAgariToggle,
    turnTime30,
    turnTime15
  },
  createUI,
  buildRulesText,
  normalizeRoomSettings,
  mergeMembersWithCpu,
  getCurrentHand,
  getTradePairForPlayer,
  getTradeRoleMap,
  getUserData,
  updateUserData,
  useUserCoin,
  transferUserCoinByUid,
  addUserCoinByUid,
  useUserCoinByUid,
  getServerNowMs,
  nowMs,
  isCpuId,
  getMemberName,
  getRoleBadgeHtml,
  getEffectiveRevolution,
  getRankLabelFromPower,
  sortHandCards,
  cardText,
  cardClass,
  cardInlineStyle,
  validatePlaySelection,
  options: {
    eightCutDelayMs: EIGHT_CUT_DELAY_MS,
    tradePhaseMs: TRADE_PHASE_MS,
    ruleEffectMs: RULE_EFFECT_MS,
    receivedCardEffectMs: RECEIVED_CARD_EFFECT_MS,
    resultOverlayMs: RESULT_OVERLAY_MS,
    betRequiredCoin: BET_REQUIRED_COIN,
    betBigAmount: BET_BIG_AMOUNT,
    betSmallAmount: BET_SMALL_AMOUNT,
    renameCostCoin: RENAME_COST_COIN,
    entryStorageKey: ENTRY_STORAGE_KEY,
    volumeStorageKey: APP_VOLUME_STORAGE_KEY,
    roomExpiredMessage: ROOM_EXPIRED_MESSAGE,
    ruleEffectImageMap: RULE_EFFECT_IMAGE_MAP,
    seAudioPaths: SE_AUDIO_PATHS,
    bgmAudioPaths: BGM_AUDIO_PATHS
  }
});

const mutatePlay = createMutatePlay({
  nowMs,
  getServerNowMs,
  normalizeRoomSettings,
  getHostPlayerId,
  isCpuId,
  mergeMembersWithCpu,
  getMemberName,
  ruleEffectImageMap: RULE_EFFECT_IMAGE_MAP,
  getRuleEffectLockUntilMs: gameUiRuntime.getRuleEffectLockUntilMs,
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
    gameUiRuntime.setRoomWord(roomWord);
    currentLastResult = data.lastResult || null;
    currentMembers = mergeMembersWithCpu(data.members, data.settings);
    currentSettings = normalizeRoomSettings(data.settings);
    currentGame = data.gameData && typeof data.gameData === "object"
      ? data.gameData
      : (currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading") ? currentGame : null);
    gameUiRuntime.onRoomSnapshot(payload);
  },
  onJoinRoom: function(payload) {
    roomWord = payload && payload.roomWord ? payload.roomWord : roomWord;
    gameUiRuntime.setRoomWord(roomWord);
    startTurnWatcher();
    gameUiRuntime.onJoinRoom(payload);
  },
  onLeaveRoom: function() {
    const expiredWhileInRoom = !!roomWord && !!currentMembers.length;
    roomWord = "";
    currentMembers = [];
    currentGame = null;
    currentLastResult = null;
    currentSettings = normalizeRoomSettings(null);
    timeoutBusy = false;
    stopTurnWatcher();
    gameUiRuntime.setRoomWord(roomWord);
    gameUiRuntime.onLeaveRoom();
    if (expiredWhileInRoom) gameUiRuntime.showEntryMessage(ROOM_EXPIRED_MESSAGE);
  },
  onResetTransientState: function() {
    stopTurnWatcher();
  }
});

function amAuthority() {
  return !!currentMembers.find(function(member) {
    return member.id === playerId && member.isHost;
  });
}

async function runRoomTransaction(mutator) {
  return roomManager.runRoomTransaction(mutator);
}

async function joinRoom(playerName, word) {
  let memberMeta = null;
  if (currentAuthUser) {
    try {
      const liveUserData = await getUserData(currentAuthUser);
      memberMeta = {
        authUid: currentAuthUser.uid || "",
        coin: Number.isFinite(Number(liveUserData && liveUserData.coin)) ? Number(liveUserData.coin) : 0,
      };
    } catch (error) {
      console.error(error);
      memberMeta = {
        authUid: currentAuthUser.uid || "",
        coin: 0,
      };
    }
  }
  return roomManager.joinRoom(playerName, word, memberMeta);
}

function isRetryableRoomError(error) {
  const text = String(error && error.message ? error.message : error || "").toLowerCase();
  return text.includes("maxretry") || text.includes("競合");
}

function waitMs(ms) {
  return new Promise(function(resolve) {
    window.setTimeout(resolve, ms);
  });
}

async function startGame() {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await runRoomTransaction(function(roomData) {
        const members = mergeMembersWithCpu(roomData.members, roomData.settings);
        const settings = normalizeRoomSettings(roomData.settings);
        const game = roomData.gameData || createDefaultGameState(roomData.lastResult && roomData.lastResult.topPlayerId, settings);
        if (members.length < 2) throw new Error("2人以上で開始できます");
        if (getHostPlayerId(roomData.members) !== playerId) throw new Error("親だけが開始できます");
        if (game.phase === "playing" || game.phase === "trading") throw new Error("すでにゲーム中です");

        let turnOrder = members.map(function(member) { return member.id; });
        const lastResult = roomData.lastResult && Array.isArray(roomData.lastResult.finishOrder) ? roomData.lastResult : null;
        const count = members.length;
        let phase = "playing";
        let tradeState = null;
        let lastActionText = "ゲーム開始";
        let firstTurnPlayerId = turnOrder[0] || "";

        if (lastResult && lastResult.finishOrder.length === count && count >= 4) {
          firstTurnPlayerId = getStartPlayerIdFromLastResult(lastResult, members) || firstTurnPlayerId;
          const startIndex = turnOrder.indexOf(firstTurnPlayerId);
          if (startIndex > 0) {
            turnOrder = turnOrder.slice(startIndex).concat(turnOrder.slice(0, startIndex));
          }
        }

        const hands = {};
        turnOrder.forEach(function(id) { hands[id] = []; });
        shuffleDeck(buildDeck(settings.doubleDeckEnabled)).forEach(function(card, index) {
          hands[turnOrder[index % turnOrder.length]].push(card);
        });
        turnOrder.forEach(function(id) { hands[id] = sortHandCards(hands[id]); });

        if (lastResult && lastResult.finishOrder.length === count && count >= 4) {
          const order = getTradeOrderFromLastResult(lastResult, members);
          const pairs = [
            { fromPlayerId: order[0], toPlayerId: order[count - 1], count: 2 },
            { fromPlayerId: order[1], toPlayerId: order[count - 2], count: 1 }
          ].filter(function(pair) {
            return pair.fromPlayerId && pair.toPlayerId && pair.fromPlayerId !== pair.toPlayerId;
          });
          if (pairs.length) {
            phase = "trading";
            tradeState = {
              startedAtMs: getServerNowMs(),
              pairs: pairs.map(function(pair) {
                const forcedIds = getStrongestCardIds(hands[pair.toPlayerId], pair.count);
                const forcedCards = getCurrentHand({ hands: hands }, pair.toPlayerId).filter(function(card) {
                  return forcedIds.includes(card.id);
                });
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
          }
        }

        roomData.gameData = {
          phase: phase,
          startedAtMs: getServerNowMs(),
          revolution: false,
          jackBackActive: false,
          direction: 1,
          turnOrder: turnOrder,
          currentTurnPlayerId: phase === "playing" ? firstTurnPlayerId : "",
          currentTurnStartedAtMs: phase === "playing" ? getServerNowMs() : 0,
          cpuActionAtMs: phase === "playing" && isCpuId(firstTurnPlayerId) ? getServerNowMs() + CPU_ACTION_DELAY_MS : 0,
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
          lastTradeResult: null,
          previousChampionId: roomData.lastResult && roomData.lastResult.topPlayerId ? roomData.lastResult.topPlayerId : "",
          miyakoDropped: false,
          turnTimeSeconds: settings.turnTimeSeconds,
          ruleSettings: settings,
          lastActionText: lastActionText,
          betState: {
            active: gameUiRuntime.canStartBetMatch(members),
            applied: false,
          },
          ruleEffectState: null,
          pendingRuleEffectUntilMs: 0
        };
        return { ok: true, room: roomData };
      });
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableRoomError(error) || attempt >= 2) throw error;
      await waitMs(180 * (attempt + 1));
    }
  }
  if (lastError) throw lastError;
}

async function saveRoomSettings(nextSettings) {
  return roomManager.saveRoomSettings(nextSettings);
}

async function endGameSession() {
  return roomManager.endGameSession();
}

async function applyPlay(actorId, cardIds) {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, actorId, cardIds, "play");
  });
}

async function applyPass(actorId) {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, actorId, [], "pass");
  });
}

async function applySevenTransfer(actorId, cardIds) {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, actorId, cardIds, currentGame && currentGame.phase === "trading" ? "trade" : "transfer");
  });
}

async function resolveTurnTimeout() {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, playerId, [], "timeout");
  });
}

async function resolveCpuAuto() {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, playerId, [], "auto");
  });
}

async function resolvePendingClearField() {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, playerId, [], "resolveEightCut");
  });
}

async function resolveTradeTimeout() {
  await runRoomTransaction(function(roomData) {
    return mutatePlay(roomData, playerId, [], "resolveTrade");
  });
}

async function transferRoomOwner(targetPlayerId) {
  return roomManager.transferRoomOwner(targetPlayerId);
}

async function kickRoomMember(targetPlayerId) {
  return roomManager.kickRoomMember(targetPlayerId);
}

async function leaveRoom() {
  gameUiRuntime.clearRoomMessage();
  return roomManager.leaveRoom();
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
    gameUiRuntime.updateCountdownLabel();
    if (!currentGame || timeoutBusy) return;
    timeoutBusy = true;
    try {
      if (currentGame.phase === "playing" && currentGame.pendingClearField && currentGame.pendingClearField.executeAtMs && getServerNowMs() >= currentGame.pendingClearField.executeAtMs) {
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
        } else if (tradeState && tradeState.startedAtMs && getServerNowMs() - tradeState.startedAtMs >= TRADE_PHASE_MS) {
          await resolveTradeTimeout();
        }
        return;
      }

      if (currentGame.phase === "playing") {
        if ((currentGame.pendingSevenPass && isCpuId(currentGame.pendingSevenPass.fromPlayerId)) || isCpuId(currentGame.currentTurnPlayerId)) {
          const cpuActionAtMs = currentGame.cpuActionAtMs || 0;
          if (!cpuActionAtMs || getServerNowMs() >= cpuActionAtMs) {
            await resolveCpuAuto();
          }
        } else {
          const limit = (currentGame.turnTimeSeconds || currentSettings.turnTimeSeconds || 30) * 1000;
          const startedAt = currentGame.currentTurnStartedAtMs || 0;
          if (startedAt && getServerNowMs() - startedAt >= limit) {
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

gameUiRuntime.initialize();
gameUiRuntime.setExternalStateGetter(function() {
  return {
    onJoinRoom: joinRoom
  };
});

gameUiRuntime.setExternalActions({
  onLeaveRoom: leaveRoom,
  onPlay: async function(cardIds) {
    await applyPlay(playerId, cardIds);
  },
  onPass: async function() {
    await applyPass(playerId);
  },
  onTransfer: async function(cardIds) {
    await applySevenTransfer(playerId, cardIds);
  },
  onSeatOwnerTransfer: transferRoomOwner,
  onSeatKick: kickRoomMember,
  onSaveRoomSettings: saveRoomSettings,
  onEndGameSession: endGameSession,
  onStartGame: startGame,
  runRoomTransaction: runRoomTransaction,
  startGameBusy: function() {
    return startGameBusy;
  },
  setStartGameBusy: function(value) {
    startGameBusy = !!value;
  }
});

onUserChanged(function(user) {
  currentAuthUser = user || null;
  gameUiRuntime.applyLoggedInNickname(currentAuthUser);
  if (!user && !roomWord) {
    gameUiRuntime.showEntryMessage("Googleログイン後に入室できます");
  } else if (user) {
    gameUiRuntime.clearEntryMessage();
  }
});

gameUiRuntime.setRoomWord(roomWord);
