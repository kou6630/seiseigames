export function createGameUiRuntime(deps) {
  const {
    refs,
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
    validatePlaySelection
  } = deps;

  const {
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
  } = refs;

  const options = deps.options || {};
  const EIGHT_CUT_DELAY_MS = Number(options.eightCutDelayMs) || 1000;
  const TRADE_PHASE_MS = Number(options.tradePhaseMs) || 30000;
  const RULE_EFFECT_MS = Number(options.ruleEffectMs) || 1000;
  const RECEIVED_CARD_EFFECT_MS = Number(options.receivedCardEffectMs) || 2200;
  const RESULT_OVERLAY_MS = Number(options.resultOverlayMs) || 5000;
  const BET_REQUIRED_COIN = Number(options.betRequiredCoin) || 20;
  const BET_BIG_AMOUNT = Number(options.betBigAmount) || 20;
  const BET_SMALL_AMOUNT = Number(options.betSmallAmount) || 10;
  const RENAME_COST_COIN = Number(options.renameCostCoin) || 100;
  const ENTRY_STORAGE_KEY = options.entryStorageKey || "nomi_entry_form_v1";
  const APP_VOLUME_STORAGE_KEY = options.volumeStorageKey || "daifugo_app_volume_v1";
  const ROOM_EXPIRED_MESSAGE = options.roomExpiredMessage || "部屋の有効期限が切れました";

  const RULE_EFFECT_IMAGE_MAP = options.ruleEffectImageMap || {
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

  const SE_AUDIO_PATHS = options.seAudioPaths || {
    skipFive: "./audio/se/５飛ばし.ogg",
    skill: "./audio/se/スキル.ogg",
    revolution: "./audio/se/革命.ogg",
    ownTurn: "./audio/se/自分のターン.ogg",
    cut: "./audio/se/切り.ogg",
    join: "./audio/se/入室.ogg",
    lock: "./audio/se/縛り.ogg"
  };

  const BGM_AUDIO_PATHS = options.bgmAudioPaths || {
    playing: "./audio/bgm/ゲームロビー.ogg",
    revolution: "./audio/bgm/ゲームロビー（革命中）.m4a"
  };

  const AVATAR_IMAGE_MAP = {
    avatar_1: "/img/アバター/1-虹靴.png",
    avatar_2: "/img/アバター/2-古い野球玉.png",
    avatar_3: "/img/アバター/3-焼きちくわ.png",
    avatar_4: "/img/アバター/4-ブルーアップル.png",
    avatar_5: "/img/アバター/5-チーズ.png",
    avatar_6: "/img/アバター/6-カラースプレー.png",
    avatar_41: "/img/アバター/41-ネズミ.png",
    avatar_42: "/img/アバター/42-ピンクカエル.png",
    avatar_43: "/img/アバター/43-タバコマン.png",
    avatar_44: "/img/アバター/44-凶悪アヒル.png",
    avatar_71: "/img/アバター/71-素ゴリ.png",
    avatar_72: "/img/アバター/72-素りな.png",
    avatar_73: "/img/アバター/73-素めそ.png",
    avatar_91: "/img/アバター/91-カエルゴリ.png",
    avatar_92: "/img/アバター/92-カエルりな.png",
    avatar_93: "/img/アバター/93-カエルめそ.png"
  };

  if (settingsPanel) {
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
  }

  let ui = null;
  let currentAuthUser = null;
  let currentMembers = [];
  let currentGame = null;
  let currentLastResult = null;
  let currentSettings = normalizeRoomSettings(null);
  let selectedCardIds = new Set();
  let receivedCardEffectMap = new Map();
  let lastRuleEffectKey = "";
  let ruleEffectPlaying = false;
  let lastOwnTurnSeKey = "";
  let lastShownResultOverlayKey = "";
  let resultOverlayTimer = null;
  let bgmAudio = null;
  let currentBgmKey = "";
  let betSettlementBusyKey = "";
  let lastBetStartEffectKey = "";
  let externalRoomWord = "";
  let externalStateGetter = typeof deps.getExternalState === "function" ? deps.getExternalState : null;
  let externalActions = deps.actions || {};
  let initialized = false;

  const audioState = {
    context: null,
    masterGain: null,
    seGain: null,
    started: false
  };

  function getExternalState() {
    return externalStateGetter ? externalStateGetter() || {} : {};
  }

  function setExternalStateGetter(fn) {
    externalStateGetter = typeof fn === "function" ? fn : null;
  }

  function setExternalActions(nextActions) {
    externalActions = nextActions || {};
  }

  function getRuleEffectLockUntilMs(effectNames) {
    const names = Array.isArray(effectNames)
      ? effectNames.filter(function(name) { return !!RULE_EFFECT_IMAGE_MAP[name]; })
      : [];
    return names.length ? getServerNowMs() + (RULE_EFFECT_MS * names.length) : 0;
  }

  function getHumanRoomMembers(members) {
    return (Array.isArray(members) ? members : []).filter(function(member) {
      return !!member;
    });
  }

  function getRoomMemberAuthUid(member) {
    if (!member || typeof member !== "object") return "";
    return typeof member.authUid === "string" ? member.authUid.trim() : "";
  }

  function getRoomMemberCoin(member) {
    if (!member || typeof member !== "object") return NaN;
    const value = Number(member.coin);
    return Number.isFinite(value) ? value : NaN;
  }

  function canStartBetMatch(members) {
    const humans = getHumanRoomMembers(members);
    if (humans.length < 4) return false;
    return humans.every(function(member) {
      if (isCpuId(member && member.id)) return getRoomMemberCoin(member) >= BET_REQUIRED_COIN;
      return !!getRoomMemberAuthUid(member) && getRoomMemberCoin(member) >= BET_REQUIRED_COIN;
    });
  }

  function buildBetTransfers(lastResult, members) {
    if (!lastResult || !Array.isArray(lastResult.finishOrder) || !lastResult.finishOrder.length) return [];
    const humans = getHumanRoomMembers(members);
    if (humans.length < 4) return [];
    const roleMap = getTradeRoleMap(lastResult, humans);
    const byId = new Map(humans.map(function(member) { return [member.id, member]; }));
    let daihugouId = "";
    let hugouId = "";
    let hinminId = "";
    let daihinminId = "";

    humans.forEach(function(member) {
      const role = roleMap[member.id] || "";
      if (role === "大富豪") daihugouId = member.id;
      if (role === "富豪") hugouId = member.id;
      if (role === "貧民") hinminId = member.id;
      if (role === "大貧民") daihinminId = member.id;
    });

    const transfers = [];
    if (daihinminId && daihugouId) {
      const from = byId.get(daihinminId);
      const to = byId.get(daihugouId);
      if (from && to) {
        transfers.push({ fromUid: getRoomMemberAuthUid(from), toUid: getRoomMemberAuthUid(to), amount: BET_BIG_AMOUNT });
      }
    }
    if (hinminId && hugouId) {
      const from = byId.get(hinminId);
      const to = byId.get(hugouId);
      if (from && to) {
        transfers.push({ fromUid: getRoomMemberAuthUid(from), toUid: getRoomMemberAuthUid(to), amount: BET_SMALL_AMOUNT });
      }
    }

    return transfers.filter(function(item) {
      return item.fromUid && item.toUid && item.fromUid !== item.toUid && item.amount > 0;
    });
  }

  function applyTransfersToRoomMembers(members, transfers) {
    const nextMembers = members && typeof members === "object" ? members : {};
    const safeTransfers = Array.isArray(transfers) ? transfers : [];
    safeTransfers.forEach(function(item) {
      const amount = Number(item && item.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      Object.keys(nextMembers).forEach(function(memberId) {
        const member = nextMembers[memberId];
        if (!member || typeof member !== "object") return;
        const authUid = getRoomMemberAuthUid(member);
        const currentCoin = Number.isFinite(Number(member.coin)) ? Number(member.coin) : 0;
        if (authUid && authUid === item.fromUid) {
          member.coin = Math.max(0, currentCoin - amount);
          return;
        }
        if (authUid && authUid === item.toUid) {
          member.coin = currentCoin + amount;
        }
      });
    });
  }

  function isCpuAuthUid(uid) {
    return String(uid || "").startsWith("cpu_");
  }

  function getBetTransferKey(item) {
    if (!item) return "";
    return [String(item.fromUid || ""), String(item.toUid || ""), Number(item.amount || 0)].join("__");
  }

  async function applyBetSettlementIfNeeded(game, lastResult, members, runRoomTransaction) {
    if (!game || game.phase !== "finished") return;
    if (!game.betState || !game.betState.active || game.betState.applied) return;
    if (!currentAuthUser || typeof runRoomTransaction !== "function") return;

    const settlementKey = [
      lastResult && lastResult.roundNumber || 0,
      lastResult && lastResult.finishedAtMs || 0,
      Array.isArray(lastResult && lastResult.finishOrder) ? lastResult.finishOrder.join("|") : ""
    ].join("__");
    if (!settlementKey || betSettlementBusyKey === settlementKey) return;

    const transfers = buildBetTransfers(lastResult, members);
    if (!transfers.length) return;

    let claimed = false;
    betSettlementBusyKey = settlementKey;
    try {
      const claimedRoom = await runRoomTransaction(function(roomData) {
        const roomGame = roomData && roomData.gameData && typeof roomData.gameData === "object" ? roomData.gameData : null;
        const betState = roomGame && roomGame.betState && typeof roomGame.betState === "object" ? roomGame.betState : null;
        if (!roomGame || roomGame.phase !== "finished" || !betState || !betState.active || betState.applied) return { ok: false };
        if (betState.settlingKey && betState.settlingKey !== settlementKey) return { ok: false };
        if (!Array.isArray(betState.completedTransferKeys)) betState.completedTransferKeys = [];
        betState.settlingKey = settlementKey;
        return { ok: true, room: roomData };
      });
      if (!claimedRoom || !claimedRoom.gameData || !claimedRoom.gameData.betState || claimedRoom.gameData.betState.settlingKey !== settlementKey) return;
      claimed = true;

      const completedTransferKeys = new Set(
        Array.isArray(claimedRoom.gameData.betState.completedTransferKeys)
          ? claimedRoom.gameData.betState.completedTransferKeys
          : []
      );

      for (const item of transfers) {
        const fromIsCpu = isCpuAuthUid(item.fromUid);
        const toIsCpu = isCpuAuthUid(item.toUid);
        const amount = Math.max(0, Number(item.amount) || 0);
        const transferKey = getBetTransferKey(item);
        if (!amount || !transferKey || completedTransferKeys.has(transferKey)) continue;

        let appliedAmount = 0;
        if (fromIsCpu && toIsCpu) {
          appliedAmount = amount;
        } else if (fromIsCpu) {
          const result = await addUserCoinByUid(item.toUid, amount, currentAuthUser);
          if (result) appliedAmount = amount;
        } else if (toIsCpu) {
          const result = await useUserCoinByUid(item.fromUid, amount, currentAuthUser);
          if (result) appliedAmount = amount;
        } else {
          const result = await transferUserCoinByUid(item.fromUid, item.toUid, amount, currentAuthUser);
          if (result && Number(result.amount) > 0) appliedAmount = Number(result.amount) || 0;
        }

        if (!appliedAmount) continue;

        const appliedTransfer = {
          fromUid: item.fromUid,
          toUid: item.toUid,
          amount: appliedAmount,
        };

        await runRoomTransaction(function(roomData) {
          const roomGame = roomData && roomData.gameData && typeof roomData.gameData === "object" ? roomData.gameData : null;
          const betState = roomGame && roomGame.betState && typeof roomGame.betState === "object" ? roomGame.betState : null;
          if (!roomGame || !betState || !betState.active || betState.applied || betState.settlingKey !== settlementKey) return { ok: false };
          if (!Array.isArray(betState.completedTransferKeys)) betState.completedTransferKeys = [];
          if (betState.completedTransferKeys.includes(transferKey)) return { ok: false };
          applyTransfersToRoomMembers(roomData.members, [appliedTransfer]);
          betState.completedTransferKeys.push(transferKey);
          return { ok: true, room: roomData };
        });
        completedTransferKeys.add(transferKey);
      }

      const allTransferKeys = transfers.map(function(item) { return getBetTransferKey(item); }).filter(Boolean);
      await runRoomTransaction(function(roomData) {
        const roomGame = roomData && roomData.gameData && typeof roomData.gameData === "object" ? roomData.gameData : null;
        const betState = roomGame && roomGame.betState && typeof roomGame.betState === "object" ? roomGame.betState : null;
        if (!roomGame || !betState || !betState.active || betState.applied || betState.settlingKey !== settlementKey) return { ok: false };
        if (!Array.isArray(betState.completedTransferKeys)) betState.completedTransferKeys = [];
        const doneKeys = new Set(betState.completedTransferKeys);
        const allDone = allTransferKeys.every(function(key) { return doneKeys.has(key); });
        if (!allDone) return { ok: false };
        betState.applied = true;
        betState.appliedKey = settlementKey;
        betState.settlingKey = "";
        return { ok: true, room: roomData };
      });
    } catch (error) {
      console.error(error);
      if (claimed) {
        try {
          await runRoomTransaction(function(roomData) {
            const roomGame = roomData && roomData.gameData && typeof roomData.gameData === "object" ? roomData.gameData : null;
            const betState = roomGame && roomGame.betState && typeof roomGame.betState === "object" ? roomGame.betState : null;
            if (!roomGame || !betState || betState.applied || betState.settlingKey !== settlementKey) return { ok: false };
            betState.settlingKey = "";
            return { ok: true, room: roomData };
          });
        } catch (unlockError) {
          console.error(unlockError);
        }
      }
    } finally {
      if (betSettlementBusyKey === settlementKey) betSettlementBusyKey = "";
    }
  }

  function ensureBetStartEffectLayer() {
    let layer = document.getElementById("betStartEffectLayer");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "betStartEffectLayer";
    layer.setAttribute("aria-hidden", "true");
    layer.style.setProperty("position", "fixed", "important");
    layer.style.setProperty("left", "0", "important");
    layer.style.setProperty("top", "0", "important");
    layer.style.setProperty("right", "0", "important");
    layer.style.setProperty("bottom", "0", "important");
    layer.style.setProperty("display", "flex", "important");
    layer.style.setProperty("align-items", "center", "important");
    layer.style.setProperty("justify-content", "center", "important");
    layer.style.setProperty("padding", "24px", "important");
    layer.style.setProperty("pointer-events", "none", "important");
    layer.style.setProperty("opacity", "0", "important");
    layer.style.setProperty("visibility", "hidden", "important");
    layer.style.setProperty("z-index", "2147483647", "important");
    document.documentElement.appendChild(layer);
    return layer;
  }

  function playBetStartEffect(isActive) {
    return new Promise(function(resolve) {
      const layer = ensureBetStartEffectLayer();
      layer.innerHTML = "";
      layer.style.transition = "none";
      layer.style.setProperty("opacity", "0", "important");
      layer.style.setProperty("visibility", "visible", "important");
      layer.style.setProperty("background", "rgba(0,0,0,0)", "important");
      layer.setAttribute("aria-hidden", "false");

      const box = document.createElement("div");
      box.textContent = isActive ? "賭け試合有効！" : "賭け試合無効！";
      box.style.setProperty("padding", "28px 36px", "important");
      box.style.setProperty("border-radius", "28px", "important");
      box.style.setProperty("border", "1px solid rgba(255,255,255,0.22)", "important");
      box.style.setProperty("background", isActive
        ? "linear-gradient(145deg, rgba(246,196,83,0.98), rgba(255,227,154,0.98))"
        : "linear-gradient(145deg, rgba(120,130,156,0.98), rgba(214,221,235,0.98))", "important");
      box.style.setProperty("color", isActive ? "#2d1800" : "#1b2230", "important");
      box.style.setProperty("font-size", "clamp(40px, 8vw, 86px)", "important");
      box.style.setProperty("font-weight", "900", "important");
      box.style.setProperty("letter-spacing", "0.08em", "important");
      box.style.setProperty("text-align", "center", "important");
      box.style.setProperty("box-shadow", "0 24px 80px rgba(0,0,0,0.42)", "important");
      box.style.setProperty("transform", "scale(0.88)", "important");
      box.style.setProperty("opacity", "0", "important");
      box.style.setProperty("transition", "transform 220ms ease, opacity 220ms ease", "important");
      layer.appendChild(box);

      void layer.offsetWidth;
      requestAnimationFrame(function() {
        layer.style.transition = "opacity 180ms ease, background 220ms ease";
        layer.style.setProperty("opacity", "1", "important");
        layer.style.setProperty("background", isActive ? "rgba(0,0,0,0.44)" : "rgba(8,12,22,0.52)", "important");
        box.style.setProperty("opacity", "1", "important");
        box.style.setProperty("transform", "scale(1)", "important");
        window.setTimeout(function() {
          layer.style.setProperty("opacity", "0", "important");
          layer.style.setProperty("background", "rgba(0,0,0,0)", "important");
          box.style.setProperty("opacity", "0", "important");
          box.style.setProperty("transform", "scale(1.04)", "important");
        }, 1600);
        window.setTimeout(function() {
          layer.innerHTML = "";
          layer.style.setProperty("visibility", "hidden", "important");
          layer.setAttribute("aria-hidden", "true");
          resolve();
        }, 1820);
      });
    });
  }

  async function showBetStartEffectForCurrentMembers() {
    const isActive = canStartBetMatch(currentMembers);
    lastBetStartEffectKey = [String(isActive), String(nowMs())].join("__");
    await playBetStartEffect(isActive);
  }

  function ensureResultOverlayLayer() {
    let layer = document.getElementById("matchResultOverlay");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "matchResultOverlay";
    layer.setAttribute("aria-hidden", "true");
    layer.style.setProperty("position", "fixed", "important");
    layer.style.setProperty("left", "0", "important");
    layer.style.setProperty("top", "0", "important");
    layer.style.setProperty("right", "0", "important");
    layer.style.setProperty("bottom", "0", "important");
    layer.style.setProperty("display", "flex", "important");
    layer.style.setProperty("align-items", "center", "important");
    layer.style.setProperty("justify-content", "center", "important");
    layer.style.setProperty("padding", "20px", "important");
    layer.style.setProperty("background", "rgba(0,0,0,0)", "important");
    layer.style.setProperty("opacity", "0", "important");
    layer.style.setProperty("visibility", "hidden", "important");
    layer.style.setProperty("pointer-events", "none", "important");
    layer.style.setProperty("z-index", "2147483647", "important");
    document.documentElement.appendChild(layer);
    return layer;
  }

  function escapeResultHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatResultCoinMoveText(item, members) {
    if (!item) return "";
    const fromMember = (Array.isArray(members) ? members : []).find(function(member) {
      return getRoomMemberAuthUid(member) === item.fromUid;
    }) || null;
    const toMember = (Array.isArray(members) ? members : []).find(function(member) {
      return getRoomMemberAuthUid(member) === item.toUid;
    }) || null;
    const fromName = fromMember ? getMemberName(fromMember.id, members) : "不明";
    const toName = toMember ? getMemberName(toMember.id, members) : "不明";
    return fromName + " → " + toName + " : " + Number(item.amount || 0) + "コイン";
  }

  function showMatchResultOverlayIfNeeded(game, lastResult, members) {
    if (!game || game.phase !== "finished") return;
    if (!lastResult || !Array.isArray(lastResult.finishOrder) || !lastResult.finishOrder.length) return;
    const overlayKey = [
      lastResult.roundNumber || 0,
      lastResult.finishedAtMs || 0,
      lastResult.finishOrder.join("|")
    ].join("__");
    if (overlayKey === lastShownResultOverlayKey) return;

    const memberList = Array.isArray(members) ? members.slice() : [];
    const roleMap = getTradeRoleMap(lastResult, memberList);
    const transfers = game.betState && game.betState.active ? buildBetTransfers(lastResult, memberList) : [];
    const finishRowsHtml = lastResult.finishOrder.map(function(memberId, index) {
      const member = memberList.find(function(item) { return item && item.id === memberId; }) || null;
      const name = member ? getMemberName(member.id, memberList) : ("プレイヤー" + (index + 1));
      const role = roleMap[memberId] || "平民";
      return '<div style="display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">'
        + '<div style="font-size:18px;font-weight:900;color:#ffe39a;">' + escapeResultHtml(String(index + 1) + "位") + '</div>'
        + '<div style="font-size:16px;font-weight:800;color:#f8f5ff;word-break:break-word;">' + escapeResultHtml(name) + '</div>'
        + '<div style="font-size:13px;font-weight:900;color:#d9fff1;white-space:nowrap;">' + escapeResultHtml(role) + '</div>'
        + '</div>';
    }).join("");
    const moveLines = transfers.length
      ? transfers.map(function(item) { return formatResultCoinMoveText(item, memberList); })
      : ["コイン移動なし"];
    const moveHtml = moveLines.map(function(line) {
      return '<div style="padding:7px 10px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);font-size:13px;line-height:1.45;color:#f8f5ff;">' + escapeResultHtml(line) + '</div>';
    }).join("");

    const layer = ensureResultOverlayLayer();
    layer.innerHTML = ''
      + '<div style="width:min(100%, 720px);max-height:min(84dvh, 760px);overflow:auto;padding:22px 20px 18px;border-radius:26px;border:1px solid rgba(255,255,255,0.16);background:linear-gradient(145deg, rgba(20,18,40,0.98), rgba(28,34,58,0.98));box-shadow:0 28px 90px rgba(0,0,0,0.46);">'
      + '<div style="font-size:30px;font-weight:900;letter-spacing:0.08em;color:#ffe39a;text-align:center;margin-bottom:16px;">試合結果</div>'
      + '<div style="display:grid;gap:8px;margin-bottom:16px;">' + finishRowsHtml + '</div>'
      + '<div style="font-size:16px;font-weight:900;color:#ffe39a;margin-bottom:8px;">コイン移動</div>'
      + '<div style="display:grid;gap:8px;">' + moveHtml + '</div>'
      + '</div>';

    window.clearTimeout(resultOverlayTimer);
    lastShownResultOverlayKey = overlayKey;
    layer.style.transition = "none";
    layer.style.setProperty("opacity", "0", "important");
    layer.style.setProperty("visibility", "visible", "important");
    layer.style.setProperty("background", "rgba(0,0,0,0)", "important");
    layer.setAttribute("aria-hidden", "false");
    void layer.offsetWidth;
    requestAnimationFrame(function() {
      layer.style.transition = "opacity 220ms ease, background 220ms ease";
      layer.style.setProperty("opacity", "1", "important");
      layer.style.setProperty("background", "rgba(0,0,0,0.54)", "important");
    });
    resultOverlayTimer = window.setTimeout(function() {
      layer.style.setProperty("opacity", "0", "important");
      layer.style.setProperty("background", "rgba(0,0,0,0)", "important");
      window.setTimeout(function() {
        layer.style.setProperty("visibility", "hidden", "important");
        layer.setAttribute("aria-hidden", "true");
        layer.innerHTML = "";
      }, 240);
    }, RESULT_OVERLAY_MS);
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

  function showEntryMessage(text) {
    if (!entryMessage) return;
    entryMessage.textContent = text || "";
    entryMessage.classList.toggle("hidden", !text);
  }

  function clearEntryMessage() {
    showEntryMessage("");
  }

  function showRoomMessage(text) {
    if (!roomMessage) return;
    roomMessage.textContent = text || "";
    roomMessage.classList.toggle("hidden", !text);
  }

  function clearRoomMessage() {
    showRoomMessage("");
  }

  function saveEntryFormToLocal() {
    try {
      localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify({
        playerName: normalize(playerNameInput && playerNameInput.value),
        roomWord: normalize(roomWordInput && roomWordInput.value)
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
        if (!currentAuthUser && playerNameInput && typeof saved.playerName === "string") playerNameInput.value = normalize(saved.playerName);
        if (roomWordInput && typeof saved.roomWord === "string") roomWordInput.value = normalize(saved.roomWord);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function getNicknameFromUser(user, profile) {
    const nickname = profile && typeof profile.nickname === "string" ? normalize(profile.nickname) : "";
    if (nickname) return nickname;
    return "";
  }

  function getProfileAvatarImage(profile) {
    const selectedAvatar = normalize(profile && profile.selectedAvatar ? profile.selectedAvatar : "");
    return selectedAvatar && AVATAR_IMAGE_MAP[selectedAvatar] ? AVATAR_IMAGE_MAP[selectedAvatar] : "";
  }

  async function getLiveProfile(user) {
    if (!user || !user.uid) return { nickname: "", coin: 0, avatarImage: "" };
    try {
      const data = await getUserData(user);
      return {
        nickname: typeof data.nickname === "string" ? normalize(data.nickname) : "",
        coin: Number.isFinite(Number(data.coin)) ? Number(data.coin) : 0,
        avatarImage: normalize(getProfileAvatarImage(data))
      };
    } catch (error) {
      console.error(error);
      return {
        nickname: "",
        coin: 0,
        avatarImage: ""
      };
    }
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
    if (bgmAudio) bgmAudio.volume = volumes.bgm / 100;
  }

  function playSeTone(kind) {
    const src = SE_AUDIO_PATHS[kind];
    if (!src) return;
    try {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = clampVolume(getStoredVolumes().se) / 100;
      audio.currentTime = 0;
      audio.play().catch(function(error) {
        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  }

  function stopBgm() {
    currentBgmKey = "";
    if (!bgmAudio) return;
    try {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    } catch (error) {
      console.error(error);
    }
  }

  function playLoopBgm(kind) {
    const src = BGM_AUDIO_PATHS[kind];
    if (!src) {
      stopBgm();
      return;
    }
    try {
      if (!bgmAudio) {
        bgmAudio = new Audio();
        bgmAudio.preload = "auto";
        bgmAudio.loop = true;
      }
      const nextSrc = new URL(src, window.location.href).href;
      const srcChanged = bgmAudio.src !== nextSrc;
      if (currentBgmKey !== kind || srcChanged) {
        bgmAudio.src = src;
        bgmAudio.currentTime = 0;
        currentBgmKey = kind;
      }
      bgmAudio.volume = clampVolume(getStoredVolumes().bgm) / 100;
      if (srcChanged || bgmAudio.paused) {
        bgmAudio.play().catch(function(error) {
          console.error(error);
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  function syncGameBgm(game) {
    if (!game) return;
    if (game.phase === "playing") {
      if (game.revolution) {
        playLoopBgm("revolution");
        return;
      }
      playLoopBgm("playing");
      return;
    }
    if (currentBgmKey === "revolution") {
      playLoopBgm("playing");
    }
  }

  function openAppSettings() {
    if (!appSettingsOverlay) return;
    syncVolumeInputs();
    if (settingsNicknameInput) settingsNicknameInput.value = normalize((settingsNicknameInput && settingsNicknameInput.value) || (playerNameInput && playerNameInput.value) || "");
    setAppSettingsMessage("", false);
    appSettingsOverlay.classList.remove("hidden");
    appSettingsOverlay.setAttribute("aria-hidden", "false");
  }

  function closeAppSettings() {
    if (!appSettingsOverlay) return;
    appSettingsOverlay.classList.add("hidden");
    appSettingsOverlay.setAttribute("aria-hidden", "true");
    setAppSettingsMessage("", false);
    applyAudioVolumes();
  }

  function playUiSe() {
  }

  function playRuleEffectSe(name) {
    if (name === "5飛ばし") {
      playSeTone("skipFive");
      return;
    }
    if (name === "6リバース" || name === "7渡し" || name === "10捨て" || name === "Jバック") return;
    if (name === "革命" || name === "階段革命") {
      playSeTone("revolution");
      return;
    }
    if (name === "8切" || name === "スペ3返し" || name === "99車") {
      playSeTone("cut");
      return;
    }
    if (name === "数字縛り" || name === "マーク縛り") playSeTone("lock");
  }

  function getOwnTurnSeKey(game) {
    if (!game) return "";
    if (game.phase === "playing") {
      if (game.pendingSevenPass && game.pendingSevenPass.fromPlayerId === playerId) {
        return [
          "transfer",
          game.pendingSevenPass.fromPlayerId || "",
          game.pendingSevenPass.toPlayerId || "",
          game.pendingSevenPass.count || 0,
          game.currentTurnStartedAtMs || 0
        ].join("__");
      }
      if (game.currentTurnPlayerId === playerId && !game.pendingClearField) {
        return ["play", game.currentTurnPlayerId || "", game.currentTurnStartedAtMs || 0].join("__");
      }
    }
    if (game.phase === "trading") {
      const ownPair = getTradePairForPlayer(game, playerId);
      if (ownPair && !ownPair.done) {
        return [
          "trade",
          ownPair.fromPlayerId || "",
          ownPair.toPlayerId || "",
          ownPair.count || 0,
          game.tradeState && game.tradeState.startedAtMs || 0
        ].join("__");
      }
    }
    return "";
  }

  function maybePlayOwnTurnSe(game) {
    const key = getOwnTurnSeKey(game);
    if (!key || key === lastOwnTurnSeKey) return;
    lastOwnTurnSeKey = key;
    playSeTone("ownTurn");
  }

  function getHumanMemberIdsFromRoomData(members) {
    return Object.keys(members || {}).sort();
  }

  function maybePlayJoinSe(nextMembers) {
    const previousIds = currentMembers.filter(function(member) {
      return member && !isCpuId(member.id);
    }).map(function(member) {
      return member.id;
    });
    const nextIds = getHumanMemberIdsFromRoomData(nextMembers);
    if (nextIds.length > previousIds.length) playSeTone("join");
  }

  async function applyLoggedInNickname(user) {
    currentAuthUser = user || null;
    const profile = await getLiveProfile(user);
    const nickname = getNicknameFromUser(user, profile);
    const coin = Number(profile.coin || 0);
    const avatarImage = normalize(profile.avatarImage || "");
    if (playerNameInput) {
      playerNameInput.value = nickname;
      playerNameInput.readOnly = true;
      playerNameInput.disabled = true;
      playerNameInput.placeholder = nickname ? "ログイン中のニックネームを使用" : "最初にニックネームを決めてください";
    }

    const displayName = nickname || "ニックネーム未設定";
    const displaySub = "コイン: " + coin;
    if (loginInfoName) loginInfoName.textContent = displayName;
    if (loginInfoSub) loginInfoSub.textContent = displaySub;
    if (loginInfoPhoto) {
      if (avatarImage) loginInfoPhoto.src = avatarImage;
      else loginInfoPhoto.removeAttribute("src");
      loginInfoPhoto.style.display = "block";
    }
    if (roomLoginInfoName) roomLoginInfoName.textContent = displayName;
    if (roomLoginInfoSub) roomLoginInfoSub.textContent = displaySub;
    if (roomLoginInfoPhoto) {
      if (avatarImage) roomLoginInfoPhoto.src = avatarImage;
      else roomLoginInfoPhoto.removeAttribute("src");
      roomLoginInfoPhoto.style.display = "block";
    }
    if (settingsNicknameInput) settingsNicknameInput.value = nickname;
    if (user && !nickname) {
      setAppSettingsMessage("最初にニックネームを決めてください", false);
      openAppSettings();
    }
    updateState();
  }

  function updateState() {
    const hasNickname = !!normalize(playerNameInput && playerNameInput.value);
    if (joinButton) joinButton.disabled = !(hasNickname && normalize(roomWordInput && roomWordInput.value));
  }

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
        playRuleEffectSe(name);
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

  function applySettingsInputs() {
    const map = [
      [eightCutToggle, currentSettings.eightCutEnabled],
      [ninetyNineCarToggle, currentSettings.ninetyNineCarEnabled],
      [revolutionToggle, currentSettings.revolutionEnabled],
      [stairsToggle, currentSettings.stairsEnabled],
      [stairsRevolutionToggle, currentSettings.stairsRevolutionEnabled],
      [lockToggle, currentSettings.lockEnabled],
      [numberLockToggle, currentSettings.numberLockEnabled],
      [skipFiveToggle, currentSettings.skipFiveEnabled],
      [tenDumpToggle, currentSettings.tenDumpEnabled],
      [jackBackToggle, currentSettings.jackBackEnabled],
      [spadeThreeReturnToggle, currentSettings.spadeThreeReturnEnabled],
      [sixReverseToggle, currentSettings.sixReverseEnabled],
      [sevenPassToggle, currentSettings.sevenPassEnabled],
      [miyakoOchiToggle, currentSettings.miyakoOchiEnabled],
      [doubleDeckToggle, currentSettings.doubleDeckEnabled],
      [foulAgariToggle, currentSettings.foulAgariEnabled]
    ];
    map.forEach(function(item) {
      if (item[0]) item[0].checked = !!item[1];
    });
    if (turnTime30) turnTime30.checked = currentSettings.turnTimeSeconds !== 15;
    if (turnTime15) turnTime15.checked = currentSettings.turnTimeSeconds === 15;
    const canEdit = isHostPlayer() && !(currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading"));
    [
      eightCutToggle, ninetyNineCarToggle, revolutionToggle, stairsToggle, stairsRevolutionToggle,
      lockToggle, numberLockToggle, skipFiveToggle, tenDumpToggle, jackBackToggle,
      spadeThreeReturnToggle, sixReverseToggle, sevenPassToggle, miyakoOchiToggle,
      doubleDeckToggle, foulAgariToggle, turnTime30, turnTime15
    ].forEach(function(input) {
      if (input) input.disabled = !canEdit;
    });
    if (cpuAddButton) cpuAddButton.disabled = !canEdit || currentSettings.cpuCount >= 6;
    if (cpuRemoveButton) cpuRemoveButton.disabled = !canEdit || currentSettings.cpuCount <= 0;
    if (cpuCountLabel) cpuCountLabel.textContent = String(currentSettings.cpuCount || 0);
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

  function renderMembersUI(list) {
    if (ui && typeof ui.renderMembers === "function") ui.renderMembers(list);
  }

  function getBetStatusText() {
    if (currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading" || currentGame.phase === "finished")) {
      return canStartBetMatch(currentMembers) ? "賭け試合有効" : "賭け試合無効";
    }
    if (currentGame && currentGame.betState && currentGame.betState.active) return "賭け試合有効";
    return canStartBetMatch(currentMembers) ? "賭け試合有効" : "賭け試合無効";
  }

  function updateRulesTextWithBetStatus() {
    if (!rulesText) return;
    rulesText.textContent = buildRulesText(currentSettings) + " / " + getBetStatusText();
  }

  function renderRoomSettings(settings) {
    currentSettings = normalizeRoomSettings(settings);
    if (ui && typeof ui.renderRoomSettings === "function") ui.renderRoomSettings(currentSettings);
    else applySettingsInputs();
    updateRulesTextWithBetStatus();
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
    maybePlayOwnTurnSe(currentGame);
    syncGameBgm(currentGame);
    if (ui && typeof ui.renderGame === "function") ui.renderGame(currentGame);
    updateRulesTextWithBetStatus();
    renderReceivedCardEffects();
  }

  function renderMembers(members, settings) {
    const list = mergeMembersWithCpu(members, settings);
    currentMembers = list;
    const ownMember = list.find(function(member) { return member && member.id === playerId; }) || null;
    if (ownMember) {
      const coin = Number.isFinite(Number(ownMember.coin)) ? Number(ownMember.coin) : 0;
      const displaySub = "コイン: " + coin;
      if (loginInfoSub) loginInfoSub.textContent = displaySub;
      if (roomLoginInfoSub) roomLoginInfoSub.textContent = displaySub;
    }
    renderMembersUI(list);
  }

  function setEntryMode() {
    stopBgm();
    if (ui && typeof ui.setEntryMode === "function") ui.setEntryMode();
    else {
      document.body.classList.remove("inRoom");
      if (entryPanel) entryPanel.classList.remove("hidden");
      if (roomPanel) roomPanel.classList.add("hidden");
    }
  }

  function setRoomMode() {
    if (currentGame && currentGame.phase === "playing") syncGameBgm(currentGame);
    else playLoopBgm("playing");
    if (ui && typeof ui.setRoomMode === "function") ui.setRoomMode();
    else {
      document.body.classList.add("inRoom");
      if (entryPanel) entryPanel.classList.add("hidden");
      if (roomPanel) roomPanel.classList.remove("hidden");
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

  function createUiInstance() {
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
          roomWord: externalRoomWord,
          currentMembers,
          currentGame,
          currentLastResult,
          currentSettings,
          selectedCardIds
        };
      },
      helpers: {
        nowMs,
        getServerNowMs,
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
          if (externalActions.onLeaveRoom) await externalActions.onLeaveRoom();
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
            if (externalActions.onPlay) await externalActions.onPlay(getSelectedHandCards().map(function(card) { return card.id; }));
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
            if (externalActions.onPass) await externalActions.onPass();
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
            if (externalActions.onTransfer) await externalActions.onTransfer(getSelectedHandCards().map(function(card) { return card.id; }));
            selectedCardIds.clear();
          } catch (error) {
            console.error(error);
            showRoomMessage(error && error.message ? error.message : "カードを渡せませんでした");
          }
        },
        onSeatOwnerTransfer: async function(targetPlayerId) {
          clearRoomMessage();
          try {
            if (externalActions.onSeatOwnerTransfer) await externalActions.onSeatOwnerTransfer(targetPlayerId);
          } catch (error) {
            console.error(error);
            showRoomMessage(error && error.message ? error.message : "オーナー譲渡に失敗しました");
          }
        },
        onSeatKick: async function(targetPlayerId) {
          clearRoomMessage();
          try {
            if (externalActions.onSeatKick) await externalActions.onSeatKick(targetPlayerId);
          } catch (error) {
            console.error(error);
            showRoomMessage(error && error.message ? error.message : "キックに失敗しました");
          }
        }
      }
    });
    return ui;
  }

  function bindStaticEvents() {
    if (playerNameInput) {
      playerNameInput.addEventListener("input", function() {
        clearEntryMessage();
        saveEntryFormToLocal();
        updateState();
      });
    }
    if (roomWordInput) {
      roomWordInput.addEventListener("input", function() {
        clearEntryMessage();
        saveEntryFormToLocal();
        updateState();
      });
    }
    if (form) {
      form.addEventListener("submit", async function(event) {
        playUiSe("action");
        event.preventDefault();
        clearEntryMessage();
        const state = getExternalState();
        const playerName = normalize(playerNameInput && playerNameInput.value);
        const word = normalize(roomWordInput && roomWordInput.value);
        if (!currentAuthUser) {
          showEntryMessage("Googleログイン後に入室してください");
          updateState();
          return;
        }
        if (!playerName || !word) {
          updateState();
          return;
        }
        if (joinButton) joinButton.disabled = true;
        saveEntryFormToLocal();
        try {
          if (state.onJoinRoom) await state.onJoinRoom(playerName, word);
        } catch (error) {
          console.error(error);
          showEntryMessage(error && error.message ? error.message : "入室に失敗しました");
        } finally {
          updateState();
        }
      });
    }
    if (settingsButton) {
      settingsButton.addEventListener("click", async function() {
        playUiSe("ui");
        if (!isHostPlayer()) return;
        if (currentGame && currentGame.phase === "finished") {
          clearRoomMessage();
          try {
            if (externalActions.onEndGameSession) await externalActions.onEndGameSession();
          } catch (error) {
            console.error(error);
            showRoomMessage(error && error.message ? error.message : "終了に失敗しました");
          }
          return;
        }
        if (currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading")) return;
        if (settingsPanel) settingsPanel.classList.toggle("hidden");
        updateSettingsViewMode();
      });
    }

    async function handleRoomSettingsChange() {
      try {
        if (externalActions.onSaveRoomSettings) await externalActions.onSaveRoomSettings(collectRoomSettingsFromInputs());
        clearRoomMessage();
      } catch (error) {
        console.error(error);
        showRoomMessage(error && error.message ? error.message : "設定変更に失敗しました");
        applySettingsInputs();
      }
    }

    [
      eightCutToggle, ninetyNineCarToggle, revolutionToggle, stairsToggle, stairsRevolutionToggle,
      lockToggle, numberLockToggle, skipFiveToggle, tenDumpToggle, jackBackToggle,
      spadeThreeReturnToggle, sixReverseToggle, sevenPassToggle, miyakoOchiToggle,
      doubleDeckToggle, foulAgariToggle, turnTime30, turnTime15
    ].forEach(function(input) {
      if (input) input.addEventListener("change", handleRoomSettingsChange);
    });

    if (cpuAddButton) {
      cpuAddButton.addEventListener("click", async function() {
        playUiSe("ui");
        if (!isHostPlayer()) return;
        try {
          const nextSettings = Object.assign({}, currentSettings, { cpuCount: Math.min(6, (currentSettings.cpuCount || 0) + 1) });
          currentSettings = normalizeRoomSettings(nextSettings);
          applySettingsInputs();
          if (externalActions.onSaveRoomSettings) await externalActions.onSaveRoomSettings(nextSettings);
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
          if (externalActions.onSaveRoomSettings) await externalActions.onSaveRoomSettings(nextSettings);
          clearRoomMessage();
        } catch (error) {
          console.error(error);
          showRoomMessage(error && error.message ? error.message : "CPU削除に失敗しました");
        }
      });
    }

    if (startGameButton) {
      startGameButton.addEventListener("click", async function() {
        if (!externalActions.onStartGame) return;
        if (externalActions.startGameBusy && externalActions.startGameBusy()) return;
        if (externalActions.setStartGameBusy) externalActions.setStartGameBusy(true);
        playUiSe("action");
        clearRoomMessage();
        startGameButton.disabled = true;
        try {
          await showBetStartEffectForCurrentMembers();
          await externalActions.onStartGame();
        } catch (error) {
          console.error(error);
          showRoomMessage(error && error.message ? error.message : "ゲーム開始に失敗しました");
        } finally {
          if (externalActions.setStartGameBusy) externalActions.setStartGameBusy(false);
          updateStartButton();
        }
      });
    }

    if (entrySettingsButton) entrySettingsButton.addEventListener("click", function() { playUiSe("ui"); openAppSettings(); });
    if (roomSettingsGearButton) roomSettingsGearButton.addEventListener("click", function() { playUiSe("ui"); openAppSettings(); });
    if (appSettingsCloseButton) appSettingsCloseButton.addEventListener("click", function() { playUiSe("ui"); closeAppSettings(); });
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
        applyAudioVolumes();
      });
    }
    if (saveNicknameButton) {
      saveNicknameButton.addEventListener("click", async function() {
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
        try {
          const profile = await getLiveProfile(currentAuthUser);
          const currentName = getNicknameFromUser(currentAuthUser, profile);
          if (nextName === currentName) {
            setAppSettingsMessage("同じ名前です", true);
            return;
          }
          if (currentName) await useUserCoin(RENAME_COST_COIN, currentAuthUser);
          await updateUserData({ nickname: nextName }, currentAuthUser);
          await applyLoggedInNickname(currentAuthUser);
          setAppSettingsMessage(currentName ? "名前を変更しました" : "ニックネームを登録しました", false);
          if (!currentName) closeAppSettings();
        } catch (error) {
          console.error(error);
          setAppSettingsMessage(error && error.message ? error.message : "変更に失敗しました", true);
        }
      });
    }
  }

  function setRoomWord(value) {
    externalRoomWord = String(value || "");
  }

  function onRoomSnapshot(payload) {
    const data = payload && payload.data ? payload.data : {};
    externalRoomWord = payload && payload.roomWord ? payload.roomWord : externalRoomWord;
    maybePlayJoinSe(data.members);
    currentLastResult = data.lastResult || null;
    renderMembers(data.members, data.settings);
    renderRoomSettings(data.settings);
    renderGame(data.gameData);
    maybePlayRuleEffects(data.gameData);
    if (externalActions.runRoomTransaction) {
      applyBetSettlementIfNeeded(data.gameData, data.lastResult || null, currentMembers, externalActions.runRoomTransaction);
    }
    showMatchResultOverlayIfNeeded(data.gameData, data.lastResult || null, currentMembers);
    setRoomMode();
  }

  function onJoinRoom(payload) {
    externalRoomWord = payload && payload.roomWord ? payload.roomWord : externalRoomWord;
    clearEntryMessage();
    clearRoomMessage();
    setRoomMode();
  }

  function onLeaveRoom() {
    const expiredWhileInRoom = !!externalRoomWord && !!currentMembers.length;
    externalRoomWord = "";
    lastRuleEffectKey = "";
    lastBetStartEffectKey = "";
    lastOwnTurnSeKey = "";
    lastShownResultOverlayKey = "";
    ruleEffectPlaying = false;
    currentMembers = [];
    currentGame = null;
    window.clearTimeout(resultOverlayTimer);
    resultOverlayTimer = null;
    const resultOverlay = document.getElementById("matchResultOverlay");
    if (resultOverlay) {
      resultOverlay.style.setProperty("opacity", "0", "important");
      resultOverlay.style.setProperty("visibility", "hidden", "important");
      resultOverlay.setAttribute("aria-hidden", "true");
      resultOverlay.innerHTML = "";
    }
    currentLastResult = null;
    currentSettings = normalizeRoomSettings(null);
    selectedCardIds = new Set();
    receivedCardEffectMap = new Map();
    clearEntryMessage();
    clearRoomMessage();
    setEntryMode();
    if (expiredWhileInRoom) showEntryMessage(ROOM_EXPIRED_MESSAGE);
    renderRoomSettings(currentSettings);
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    createUiInstance();
    bindStaticEvents();
    loadEntryFormFromLocal();
    syncVolumeInputs();
    applyAudioVolumes();
    renderRoomSettings(currentSettings);
    setEntryMode();
    updateState();
  }

  return {
    constants: {
      EIGHT_CUT_DELAY_MS,
      TRADE_PHASE_MS,
      RULE_EFFECT_MS,
      RECEIVED_CARD_EFFECT_MS,
      RESULT_OVERLAY_MS,
      BET_REQUIRED_COIN,
      BET_BIG_AMOUNT,
      BET_SMALL_AMOUNT,
      RENAME_COST_COIN,
      ENTRY_STORAGE_KEY,
      APP_VOLUME_STORAGE_KEY,
      ROOM_EXPIRED_MESSAGE,
      RULE_EFFECT_IMAGE_MAP,
      SE_AUDIO_PATHS,
      BGM_AUDIO_PATHS
    },
    initialize,
    setExternalStateGetter,
    setExternalActions,
    setRoomWord,
    onRoomSnapshot,
    onJoinRoom,
    onLeaveRoom,
    renderMembersUI,
    renderMembers,
    renderRoomSettings,
    renderGame,
    setEntryMode,
    setRoomMode,
    updateSettingsViewMode,
    updateStartButton,
    updateCountdownLabel,
    updateRulesTextWithBetStatus,
    getBetStatusText,
    getRuleEffectLockUntilMs,
    getHumanRoomMembers,
    getRoomMemberAuthUid,
    getRoomMemberCoin,
    canStartBetMatch,
    buildBetTransfers,
    applyTransfersToRoomMembers,
    isCpuAuthUid,
    getBetTransferKey,
    applyBetSettlementIfNeeded,
    ensureBetStartEffectLayer,
    playBetStartEffect,
    showBetStartEffectForCurrentMembers,
    ensureResultOverlayLayer,
    escapeResultHtml,
    formatResultCoinMoveText,
    showMatchResultOverlayIfNeeded,
    normalize,
    showEntryMessage,
    clearEntryMessage,
    showRoomMessage,
    clearRoomMessage,
    saveEntryFormToLocal,
    loadEntryFormFromLocal,
    getNicknameFromUser,
    getLiveProfile,
    setAppSettingsMessage,
    clampVolume,
    getStoredVolumes,
    saveStoredVolumes,
    syncVolumeInputs,
    ensureAudioContext,
    unlockAudio,
    applyAudioVolumes,
    playSeTone,
    stopBgm,
    playLoopBgm,
    syncGameBgm,
    openAppSettings,
    closeAppSettings,
    playUiSe,
    playRuleEffectSe,
    getOwnTurnSeKey,
    maybePlayOwnTurnSe,
    getHumanMemberIdsFromRoomData,
    maybePlayJoinSe,
    applyLoggedInNickname,
    updateState,
    ensureRuleEffectLayer,
    playRuleEffectImage,
    maybePlayRuleEffects,
    collectRoomSettingsFromInputs,
    isHostPlayer,
    isMyTurn,
    isPendingTransferMine,
    isTradePhase,
    applySettingsInputs,
    getSelectedHandCards,
    clearSelectionIfNeeded,
    rememberReceivedCards,
    renderReceivedCardEffects,
    getCurrentState: function() {
      return {
        currentAuthUser,
        currentMembers,
        currentGame,
        currentLastResult,
        currentSettings,
        selectedCardIds,
        receivedCardEffectMap,
        lastRuleEffectKey,
        ruleEffectPlaying,
        lastOwnTurnSeKey,
        lastShownResultOverlayKey,
        betSettlementBusyKey,
        lastBetStartEffectKey,
        roomWord: externalRoomWord,
        ui
      };
    }
  };
}

