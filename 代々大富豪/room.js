import { app } from "../shared/firebase.js";
import { getDatabase, ref, set, get, update, remove, onValue, onDisconnect, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

export function normalizeRoomSettings(settings) {
  return {
    eightCutEnabled: settings ? settings.eightCutEnabled !== false : true,
    ninetyNineCarEnabled: !!(settings && settings.ninetyNineCarEnabled),
    revolutionEnabled: settings ? settings.revolutionEnabled !== false : true,
    stairsEnabled: !!(settings && settings.stairsEnabled),
    stairsRevolutionEnabled: !!(settings && settings.stairsRevolutionEnabled),
    lockEnabled: !!(settings && settings.lockEnabled),
    numberLockEnabled: !!(settings && settings.numberLockEnabled),
    skipFiveEnabled: !!(settings && settings.skipFiveEnabled),
    tenDumpEnabled: !!(settings && settings.tenDumpEnabled),
    jackBackEnabled: !!(settings && settings.jackBackEnabled),
    spadeThreeReturnEnabled: !!(settings && settings.spadeThreeReturnEnabled),
    sixReverseEnabled: !!(settings && settings.sixReverseEnabled),
    sevenPassEnabled: !!(settings && settings.sevenPassEnabled),
    miyakoOchiEnabled: !!(settings && settings.miyakoOchiEnabled),
    doubleDeckEnabled: !!(settings && settings.doubleDeckEnabled),
    foulAgariEnabled: !!(settings && settings.foulAgariEnabled),
    turnTimeSeconds: settings && Number(settings.turnTimeSeconds) === 15 ? 15 : 30,
    cpuCount: Math.max(0, Math.min(6, Number(settings && settings.cpuCount) || 0))
  };
}

export function buildRulesText(settings) {
  const safe = normalizeRoomSettings(settings);
  const parts = [];
  if (safe.eightCutEnabled) parts.push("8切");
  if (safe.ninetyNineCarEnabled) parts.push("99車");
  if (safe.revolutionEnabled) parts.push("革命");
  if (safe.stairsEnabled) parts.push("階段");
  if (safe.stairsRevolutionEnabled) parts.push("階段革命");
  if (safe.lockEnabled) parts.push("マーク縛り");
  if (safe.numberLockEnabled) parts.push("数字縛り");
  if (safe.skipFiveEnabled) parts.push("5飛ばし");
  if (safe.tenDumpEnabled) parts.push("10捨て");
  if (safe.jackBackEnabled) parts.push("Jバック");
  if (safe.spadeThreeReturnEnabled) parts.push("スペ3返し");
  if (safe.sixReverseEnabled) parts.push("6リバース");
  if (safe.sevenPassEnabled) parts.push("7渡し");
  if (safe.miyakoOchiEnabled) parts.push("都落ち");
  if (safe.doubleDeckEnabled) parts.push("104枚");
  if (safe.foulAgariEnabled) parts.push("反則上がり");
  if (safe.cpuCount) parts.push("CPU" + safe.cpuCount + "人");
  parts.push(safe.turnTimeSeconds + "秒");
  return parts.join(" / ");
}

export function nowMs() {
  return Date.now();
}

export function hashRoomWord(value) {
  let hash = 0;
  const source = String(value || "");
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return "daifugo_" + Math.abs(hash).toString(36);
}

export function toMemberList(members) {
  return Object.entries(members || {}).map(function(entry) {
    return {
      id: entry[0],
      name: entry[1] && entry[1].name ? entry[1].name : "",
      joinedAtMs: entry[1] && entry[1].joinedAtMs ? entry[1].joinedAtMs : 0,
      isHost: !!(entry[1] && entry[1].isHost)
    };
  }).sort(function(a, b) {
    if (!!a.isHost !== !!b.isHost) return a.isHost ? -1 : 1;
    if ((a.joinedAtMs || 0) !== (b.joinedAtMs || 0)) return (a.joinedAtMs || 0) - (b.joinedAtMs || 0);
    return String(a.id).localeCompare(String(b.id));
  });
}

export function getHostPlayerId(members) {
  const humanList = toMemberList(members);
  const host = humanList.find(function(member) { return member.isHost; }) || humanList[0] || null;
  return host ? host.id : "";
}

export function isCpuId(id) {
  return String(id || "").startsWith("cpu_");
}

export function createCpuMembers(cpuCount) {
  const safeCount = Math.max(0, Math.min(6, Number(cpuCount) || 0));
  const list = [];
  for (let i = 1; i <= safeCount; i += 1) {
    list.push({
      id: "cpu_" + i,
      name: "CPU" + i,
      joinedAtMs: 9000000000000 + i,
      isHost: false,
      isCpu: true
    });
  }
  return list;
}

export function mergeMembersWithCpu(members, settings) {
  const humanList = toMemberList(members);
  const hostId = getHostPlayerId(members);
  const normalizedHumans = humanList.map(function(member) {
    return Object.assign({}, member, { isHost: member.id === hostId });
  });
  return normalizedHumans.concat(createCpuMembers(normalizeRoomSettings(settings).cpuCount));
}

export function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createDefaultGameState(previousChampionId, settings) {
  const safe = normalizeRoomSettings(settings);
  return {
    phase: "waiting",
    revolution: false,
    jackBackActive: false,
    direction: 1,
    turnOrder: [],
    currentTurnPlayerId: "",
    currentTurnStartedAtMs: 0,
    hands: {},
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
    tradeState: null,
    turnTimeSeconds: safe.turnTimeSeconds,
    ruleSettings: safe,
    previousChampionId: previousChampionId || "",
    miyakoDropped: false,
    lastActionText: "開始待ち",
    cpuActionAtMs: 0
  };
}

export function createRoomManager(options) {
  const {    playerId,
    getCurrentSettings,
    getCurrentGame,
    onRoomSnapshot,
    onJoinRoom,
    onLeaveRoom,
    onResetTransientState,
    roomPath = "daidaiDaifugoRooms"
  } = options;

  const db = getDatabase(app);

  let roomId = "";
  let roomWord = "";
  let memberRef = null;
  let unwatchRoom = null;

  function getRoomBaseRef() {
    if (!roomId) throw new Error("部屋に入っていません");
    return ref(db, roomPath + "/" + roomId);
  }

  function getSafeCurrentSettings() {
    return normalizeRoomSettings(typeof getCurrentSettings === "function" ? getCurrentSettings() : null);
  }

  function getSafeCurrentGame() {
    const game = typeof getCurrentGame === "function" ? getCurrentGame() : null;
    return game && typeof game === "object" ? clonePlain(game) : null;
  }

  async function runRoomTransaction(mutator) {
    const roomBaseRef = getRoomBaseRef();
    const tx = await runTransaction(roomBaseRef, function(roomData) {
      const safeRoomData = roomData ? clonePlain(roomData) : {};
      if ((!safeRoomData.settings || typeof safeRoomData.settings !== "object")) {
        safeRoomData.settings = getSafeCurrentSettings();
      }
      if ((!safeRoomData.gameData || typeof safeRoomData.gameData !== "object")) {
        const currentGame = getSafeCurrentGame();
        if (currentGame) safeRoomData.gameData = currentGame;
      }
      const result = mutator(safeRoomData);
      if (!result || !result.ok) return;
      const nextRoom = result.room;
      nextRoom.updatedAtMs = nowMs();
      return nextRoom;
    }, { applyLocally: false });
    if (!tx.committed) throw new Error("更新が競合しました。もう一度試してください");
    return tx.snapshot.val() || {};
  }

  function syncHostFlag(humanList) {
    if (!roomId || !humanList.length) return;
    const currentHost = humanList.find(function(member) { return member.isHost; }) || humanList[0] || null;
    if (!currentHost) return;
    const updates = {};
    let changed = false;
    humanList.forEach(function(member) {
      const shouldBeHost = member.id === currentHost.id;
      if (!!member.isHost !== shouldBeHost) {
        updates[member.id + "/isHost"] = shouldBeHost;
        changed = true;
      }
    });
    if (changed) {
      update(ref(db, roomPath + "/" + roomId + "/members"), updates).catch(console.error);
    }
  }

  async function joinRoom(playerName, word) {
    roomWord = word;
    roomId = hashRoomWord(String(word || "").toLowerCase());
    const roomBaseRef = ref(db, roomPath + "/" + roomId);
    memberRef = ref(db, roomPath + "/" + roomId + "/members/" + playerId);

    const roomSnap = await get(roomBaseRef);
    const roomData = roomSnap.val() || {};
    const memberList = toMemberList(roomData.members);
    const savedGame = roomData.gameData || null;
    const roomSettings = normalizeRoomSettings(roomData.settings);

    if (savedGame && (savedGame.phase === "playing" || savedGame.phase === "trading") && memberList.length > 0) {
      throw new Error("この部屋はすでにゲーム中です");
    }

    if (!roomSnap.exists()) {
      await set(roomBaseRef, {
        kind: "daidai-daifugo",
        createdAt: serverTimestamp(),
        createdAtMs: nowMs(),
        updatedAtMs: nowMs(),
        roomWord: word,
        gameStateVersion: 3,
        settings: roomSettings,
        gameData: createDefaultGameState("", roomSettings)
      });
    } else if (!memberList.length) {
      await set(roomBaseRef, {
        kind: "daidai-daifugo",
        createdAt: roomData.createdAt || serverTimestamp(),
        createdAtMs: roomData.createdAtMs || nowMs(),
        updatedAtMs: nowMs(),
        roomWord: word,
        gameStateVersion: 3,
        settings: roomSettings,
        gameData: createDefaultGameState(roomData.lastResult && roomData.lastResult.topPlayerId, roomSettings)
      });
    } else {
      await update(roomBaseRef, { updatedAt: serverTimestamp(), updatedAtMs: nowMs() });
    }

    const amHostPlayer = memberList.length === 0;
    onDisconnect(memberRef).remove();
    await set(memberRef, {
      name: playerName,
      isHost: amHostPlayer,
      joinedAt: serverTimestamp(),
      joinedAtMs: nowMs()
    });

    if (unwatchRoom) unwatchRoom();
    unwatchRoom = onValue(roomBaseRef, function(snapshot) {
      const data = snapshot.val() || {};
      roomWord = data.roomWord || roomWord;
      const humans = toMemberList(data.members);
      syncHostFlag(humans);
      if (typeof onRoomSnapshot === "function") {
        onRoomSnapshot({
          roomId,
          roomWord,
          data,
          humanMembers: humans,
          mergedMembers: mergeMembersWithCpu(data.members, data.settings)
        });
      }
    });

    if (typeof onJoinRoom === "function") onJoinRoom({ roomId, roomWord });
    return { roomId, roomWord };
  }

  async function saveRoomSettings(nextSettings) {
    await runRoomTransaction(function(roomData) {
      const game = roomData.gameData || createDefaultGameState("", normalizeRoomSettings(nextSettings));
      if (game.phase === "playing" || game.phase === "trading") throw new Error("ゲーム開始後は変更できません");
      if (getHostPlayerId(roomData.members) !== playerId) throw new Error("親だけが変更できます");
      roomData.settings = normalizeRoomSettings(nextSettings);
      return { ok: true, room: roomData };
    });
  }

  async function endGameSession() {
    await runRoomTransaction(function(roomData) {
      const settings = normalizeRoomSettings(roomData.settings);
      if (getHostPlayerId(roomData.members) !== playerId) throw new Error("親だけが終了できます");
      roomData.gameData = createDefaultGameState("", settings);
      roomData.lastResult = null;
      return { ok: true, room: roomData };
    });
  }

  async function transferRoomOwner(targetPlayerId) {
    await runRoomTransaction(function(roomData) {
      const humanList = toMemberList(roomData.members);
      const currentHost = humanList.find(function(member) { return member.isHost; }) || humanList[0] || null;
      const target = humanList.find(function(member) { return member.id === targetPlayerId; }) || null;
      const game = roomData.gameData || null;
      if (!currentHost || currentHost.id !== playerId) throw new Error("親だけが実行できます");
      if (!target || target.id === playerId) throw new Error("譲渡先を選んでください");
      if (game && (game.phase === "playing" || game.phase === "trading")) throw new Error("ゲーム中は譲渡できません");
      const nextMembers = Object.assign({}, roomData.members || {});
      Object.keys(nextMembers).forEach(function(id) {
        nextMembers[id] = Object.assign({}, nextMembers[id], { isHost: id === targetPlayerId });
      });
      roomData.members = nextMembers;
      return { ok: true, room: roomData };
    });
  }

  async function kickRoomMember(targetPlayerId) {
    await runRoomTransaction(function(roomData) {
      const humanList = toMemberList(roomData.members);
      const currentHost = humanList.find(function(member) { return member.isHost; }) || humanList[0] || null;
      const target = humanList.find(function(member) { return member.id === targetPlayerId; }) || null;
      const game = roomData.gameData || null;
      if (!currentHost || currentHost.id !== playerId) throw new Error("親だけが実行できます");
      if (!target || target.id === playerId) throw new Error("キック対象を選んでください");
      if (game && (game.phase === "playing" || game.phase === "trading")) throw new Error("ゲーム中はキックできません");
      const nextMembers = Object.assign({}, roomData.members || {});
      delete nextMembers[targetPlayerId];
      roomData.members = nextMembers;
      return { ok: true, room: roomData };
    });
  }

  async function leaveRoom() {
    try {
      if (unwatchRoom) {
        unwatchRoom();
        unwatchRoom = null;
      }
      if (memberRef) {
        const roomBaseRef = ref(db, roomPath + "/" + roomId);
        await remove(memberRef);
        const afterMembersSnap = await get(ref(db, roomPath + "/" + roomId + "/members"));
        const remainMembers = toMemberList(afterMembersSnap.val());
        if (!remainMembers.length) {
          await remove(roomBaseRef);
        }
        memberRef = null;
      }
    } catch (error) {
      console.error(error);
    }

    roomId = "";
    roomWord = "";
    if (typeof onResetTransientState === "function") onResetTransientState();
    if (typeof onLeaveRoom === "function") onLeaveRoom();
  }

  function getRoomState() {
    return {
      roomId,
      roomWord,
      memberRef,
      hasWatcher: !!unwatchRoom,
      db
    };
  }

  return {
    db,
    getRoomState,
    joinRoom,
    leaveRoom,
    saveRoomSettings,
    endGameSession,
    transferRoomOwner,
    kickRoomMember,
    runRoomTransaction
  };
}
