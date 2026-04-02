export function createUI(deps) {
  const {
    refs,
    getState,
    helpers,
    actions
  } = deps;

  const {
    membersList,
    roomPanel,
    settingsPanel,
    rulesText,
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
    settingsButton,
    startGameButton
  } = refs;

  const {
    nowMs,
    getMemberName,
    getCurrentHand,
    getTradePairForPlayer,
    getTradeRoleMap,
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
  } = helpers;

  const {
    onLeaveRoom,
    onToggleCard,
    onPlay,
    onPass,
    onTransfer,
    onSeatOwnerTransfer,
    onSeatKick
  } = actions;

  let fieldOwnerLabel = document.getElementById("fieldOwnerLabel");
  let lastPlayList = document.getElementById("lastPlayList");
  let actionHintLabel = document.getElementById("actionHintLabel");
  let actionLogCache = [];
  let lastRenderedActionText = "";
  let lastAnimatedPlayKey = "";
  let lastAnimatedTransferKey = "";
  let seatActionMenu = null;
  let lastMembersLayoutKey = "";
  let lastOwnTurnMeterKey = "";
  let lastOwnTurnMeterStartedAtMs = 0;
  let hoverPreviewCardIds = new Set();
  let cachedRoleStateKey = "";
  let cachedRoleMap = {};
  let lastRenderedRoleStateKey = "";
  let selectionPromptTimer = null;
  let lastDirectionEffectKey = "";

  function getBetStatusText() {
    const state = getState();
    const game = state.currentGame;
    if (game && game.betState && game.betState.active) return "賭け試合有効";
    const humans = (Array.isArray(state.currentMembers) ? state.currentMembers : []).filter(function(member) {
      return member && !member.isCpu;
    });
    const canBet = humans.length >= 4 && humans.every(function(member) {
      return !!String(member.authUid || "").trim() && Number(member.coin) >= 20;
    });
    return canBet ? "賭け試合有効" : "賭け試合無効";
  }

  function updateRulesTextWithBetStatus() {
    const state = getState();
    if (!rulesText) return;
    rulesText.textContent = buildRulesText(state.currentSettings) + " / " + getBetStatusText();
  }

  function getSeatFinishStampHtml(game, memberId, seatScale) {
    const fallenPlayerIds = game && Array.isArray(game.fallenPlayerIds) ? game.fallenPlayerIds : [];
    const isFoulAgari = fallenPlayerIds.includes(memberId);
    const finishOrder = game && Array.isArray(game.finishOrder) ? game.finishOrder : [];
    const rankIndex = finishOrder.indexOf(memberId);
    if (rankIndex < 0) return "";
    const stampText = isFoulAgari ? "反則上がり" : (String(rankIndex + 1) + "位");
    const fontSize = isFoulAgari
      ? Math.max(14, Math.round(22 * seatScale))
      : Math.max(18, Math.round(30 * seatScale));
    const paddingY = Math.max(4, Math.round(6 * seatScale));
    const paddingX = isFoulAgari
      ? Math.max(8, Math.round(10 * seatScale))
      : Math.max(10, Math.round(14 * seatScale));
    const borderColor = isFoulAgari ? "rgba(255,170,170,0.92)" : "rgba(255,235,170,0.88)";
    const backgroundColor = isFoulAgari ? "rgba(120,20,20,0.42)" : "rgba(120,20,20,0.22)";
    const textColor = isFoulAgari ? "rgba(255,235,235,0.98)" : "rgba(255,245,210,0.96)";
    return '<div data-finish-stamp="1" style="position:absolute;left:50%;top:10px;transform:translateX(-50%) rotate(-12deg);padding:' + paddingY + 'px ' + paddingX + 'px;border:2px solid ' + borderColor + ';border-radius:999px;background:' + backgroundColor + ';color:' + textColor + ';font-size:' + fontSize + 'px;font-weight:900;letter-spacing:0.08em;line-height:1;text-shadow:0 2px 8px rgba(0,0,0,0.28);box-shadow:0 4px 14px rgba(0,0,0,0.18);pointer-events:none;z-index:3;white-space:nowrap;">' + escapeHtml(stampText) + '</div>';
  }

  const roleImageMap = {
    "大富豪": "img/main/大富豪.png",
    "富豪": "img/main/富豪.png",
    "平民": "img/main/平民.png",
    "貧民": "img/main/貧民.png",
    "大貧民": "img/main/大貧民.png",
    "都落ち": "img/main/都落ち.png"
  };

  function bindArenaElements() {
    fieldOwnerLabel = document.getElementById("fieldOwnerLabel");
    lastPlayList = document.getElementById("lastPlayList");
    actionHintLabel = document.getElementById("actionHintLabel");
    refs.countdownLabel = document.getElementById("countdownLabel") || refs.countdownLabel;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatLogTime(ms) {
    const date = new Date(ms || nowMs());
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function pushActionLog(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return;
    if (actionLogCache.length && actionLogCache[actionLogCache.length - 1].text === trimmed) return;
    actionLogCache.push({ text: trimmed, atMs: nowMs() });
    if (actionLogCache.length > 40) actionLogCache = actionLogCache.slice(-40);
  }

  function renderActionLog() {
    const actionLogList = document.getElementById("actionLogList");
    if (!actionLogList) return;
    if (!actionLogCache.length) {
      actionLogList.innerHTML = '<div style="opacity:0.7;">まだログはありません</div>';
      return;
    }
    actionLogList.innerHTML = actionLogCache.slice().reverse().map(function(item) {
      return '<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);line-height:1.45;">'
        + '<div style="font-size:11px;opacity:0.62;">' + escapeHtml(formatLogTime(item.atMs)) + '</div>'
        + '<div>' + escapeHtml(item.text) + '</div>'
        + '</div>';
    }).join("");
  }

  function buildRoleStateKey(list, lastResult, currentGame) {
    const memberIds = Array.isArray(list) ? list.map(function(member) { return member.id; }).join("|") : "";
    const finishOrderKey = lastResult && Array.isArray(lastResult.finishOrder) ? lastResult.finishOrder.join("|") : "";
    const lastMiyakoKey = lastResult && lastResult.miyakoOchiPlayerId ? lastResult.miyakoOchiPlayerId : "";
    const currentMiyakoKey = currentGame && currentGame.miyakoDroppedPlayerId ? currentGame.miyakoDroppedPlayerId : "";
    const phaseKey = currentGame && currentGame.phase ? currentGame.phase : "";
    return [memberIds, finishOrderKey, lastMiyakoKey, currentMiyakoKey, phaseKey].join("__");
  }

  function getCachedRoleMap(list, lastResult, currentGame) {
    const key = buildRoleStateKey(list, lastResult, currentGame);
    if (key !== cachedRoleStateKey) {
      cachedRoleStateKey = key;
      cachedRoleMap = getTradeRoleMap(lastResult, list || []);
    }
    return cachedRoleMap;
  }

  function getSeatRoleImageInfo(memberId, roleMap, lastResult) {
    const state = getState();
    const currentGame = state && state.currentGame ? state.currentGame : null;
    const currentMiyakoPlayerId = currentGame && currentGame.miyakoDroppedPlayerId ? currentGame.miyakoDroppedPlayerId : "";
    const shouldShowLastResultMiyako = !!(lastResult && lastResult.miyakoOchiPlayerId && (!currentGame || currentGame.phase === "waiting" || currentGame.phase === "finished"));

    if ((currentMiyakoPlayerId && memberId === currentMiyakoPlayerId) || (shouldShowLastResultMiyako && memberId === lastResult.miyakoOchiPlayerId)) {
      return { label: "都落ち", src: roleImageMap["都落ち"] };
    }
    const role = roleMap && roleMap[memberId] ? roleMap[memberId] : "平民";
    return { label: role, src: roleImageMap[role] || "" };
  }

  function buildMembersLayoutKey(list) {
    return (list || []).map(function(member) {
      return [member.id, member.name || "", member.isHost ? "1" : "0"].join("|");
    }).join("__");
  }

  function applySeatTurnVisual(seat, isTurn) {
    if (!seat) return;
    seat.classList.toggle("isTurn", !!isTurn);
    seat.style.border = isTurn
      ? "3px solid rgba(255,220,120,0.95)"
      : "3px solid rgba(255,255,255,0.9)";
    seat.style.boxShadow = isTurn
      ? "0 0 18px rgba(255,220,120,0.7),0 0 34px rgba(255,220,120,0.38)"
      : "0 8px 18px rgba(0,0,0,0.26)";
  }

  function updateSeatLiveState() {
    const state = getState();
    const list = Array.isArray(state.currentMembers) ? state.currentMembers : [];
    const roleStateKey = buildRoleStateKey(list, state.currentLastResult, state.currentGame);
    const shouldUpdateRoleImage = roleStateKey !== lastRenderedRoleStateKey;
    const roleMap = shouldUpdateRoleImage ? getCachedRoleMap(list, state.currentLastResult, state.currentGame) : null;
    const highlightedPlayerId = getHighlightedPlayerId(state.currentGame);
    list.forEach(function(member) {
      const seat = membersList.querySelector('.seatCard[data-player-id="' + CSS.escape(String(member.id)) + '"]');
      if (!seat) return;
      applySeatTurnVisual(seat, highlightedPlayerId === member.id);
      seat.classList.toggle("isMe", member.id === state.playerId);
      const handCount = state.currentGame && state.currentGame.phase !== "waiting" ? getCurrentHand(state.currentGame, member.id).length : 0;
      const handArea = seat.lastElementChild;
      if (handArea) {
        const stackCount = Math.min(handCount, 5);
        const cardStackHtml = handCount > 0
          ? '<div style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:28px;">'
            + '<div style="height:24px;display:flex;justify-content:center;align-items:flex-end;">'
            + Array.from({ length: stackCount }).map(function(_, stackIndex) {
              const shade = 0.2 + (stackIndex * 0.04);
              return '<span style="display:block;width:16px;height:22px;margin-left:' + (stackIndex === 0 ? 0 : -10) + 'px;border-radius:5px;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(180deg, rgba(255,255,255,0.96), rgba(235,240,255,' + (0.86 - shade * 0.2).toFixed(2) + '));box-shadow:0 3px 8px rgba(0,0,0,0.18);"></span>';
            }).join('')
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:800;color:#ffffff;white-space:nowrap;">'
            + '<span style="opacity:0.78;">×</span>'
            + '<span data-hand-count-label="1">' + handCount + '枚</span>'
            + '</div>'
            + '</div>'
          : '<div data-hand-empty-label="1" style="min-height:28px;display:flex;justify-content:center;align-items:center;font-size:11px;opacity:0.56;">なし</div>';
        handArea.innerHTML = cardStackHtml;
      }

      const liveSeatScale = Math.max(0.8, Number((seat.offsetWidth || 220) / 220) || 1);
      const finishStampHtml = getSeatFinishStampHtml(state.currentGame, member.id, liveSeatScale);
      const currentStamp = seat.querySelector('[data-finish-stamp="1"]');
      if (finishStampHtml) {
        if (currentStamp) currentStamp.outerHTML = finishStampHtml;
        else seat.insertAdjacentHTML("afterbegin", finishStampHtml);
      } else if (currentStamp) {
        currentStamp.remove();
      }

      if (!shouldUpdateRoleImage) return;
      const roleImageInfo = getSeatRoleImageInfo(member.id, roleMap, state.currentLastResult);
      const roleImage = seat.querySelector("[data-role-image]");
      if (roleImage) {
        const currentSrc = roleImage.getAttribute("src") || "";
        const nextSrc = roleImageInfo.src || "";
        if (currentSrc !== nextSrc) roleImage.setAttribute("src", nextSrc);
        if ((roleImage.getAttribute("alt") || "") !== (roleImageInfo.label || "")) roleImage.setAttribute("alt", roleImageInfo.label || "");
        roleImage.style.display = nextSrc ? "block" : "none";
      }
    });
    if (shouldUpdateRoleImage) lastRenderedRoleStateKey = roleStateKey;
  }

  function buildEffectStatusText(game) {
    const state = getState();
    if (!game || (game.phase !== "playing" && game.phase !== "trading")) return "待機中";
    if (game.phase === "trading") return "交換中 / 30秒";
    const parts = [
      getEffectiveRevolution(game) ? "反転中" : "通常",
      game.direction === -1 ? "逆回り" : "順回り",
      (game.turnTimeSeconds || state.currentSettings.turnTimeSeconds || 30) + "秒制"
    ];
    if (game.jackBackActive) parts.push("Jバック中");
    if (game.pendingClearField) parts.push("8切処理中");
    return parts.join(" / ");
  }

  function buildLockStatusText(game) {
    if (!game || game.phase !== "playing") return "縛りなし";
    const parts = [];
    if (game.lockedSuitKey) parts.push("マーク縛り: " + game.lockedSuitKey.replaceAll("|", ""));
    if (typeof game.numberLockKey === "number") parts.push("数字縛り: 次は" + getRankLabelFromPower(game.numberLockKey));
    return parts.length ? parts.join(" / ") : "縛りなし";
  }

  function buildLockBadgeHtml(game) {
    if (!game || game.phase !== "playing") {
      return '<div id="lockBadgeArea" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;"><span style="padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);font-size:12px;opacity:0.78;">縛りなし</span></div>';
    }
    const badges = [];
    if (game.lockedSuitKey) {
      badges.push('<span style="padding:7px 12px;border-radius:999px;background:rgba(90,160,255,0.22);border:1px solid rgba(90,160,255,0.42);font-size:12px;font-weight:700;color:#dcebff;">マーク縛り ' + escapeHtml(game.lockedSuitKey.replaceAll("|", "")) + '</span>');
    }
    if (typeof game.numberLockKey === "number") {
      badges.push('<span style="padding:7px 12px;border-radius:999px;background:rgba(255,180,80,0.2);border:1px solid rgba(255,180,80,0.42);font-size:12px;font-weight:700;color:#fff0cf;">数字縛り 次は ' + escapeHtml(getRankLabelFromPower(game.numberLockKey)) + '</span>');
    }
    if (!badges.length) {
      badges.push('<span style="padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);font-size:12px;opacity:0.78;">縛りなし</span>');
    }
    return '<div id="lockBadgeArea" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + badges.join("") + '</div>';
  }

  function closeSeatActionMenu() {
    if (!seatActionMenu) return;
    seatActionMenu.remove();
    seatActionMenu = null;
  }

  function isAppSettingsOpen() {
    const overlay = document.getElementById("appSettingsOverlay");
    return !!(overlay && !overlay.classList.contains("hidden"));
  }

  function openSeatActionMenu(playerId, clientX, clientY) {
    if (isAppSettingsOpen()) {
      closeSeatActionMenu();
      return;
    }
    const state = getState();
    const targetMember = Array.isArray(state.currentMembers)
      ? state.currentMembers.find(function(member) { return member && member.id === playerId; })
      : null;
    if (!isHostPlayer() || !targetMember || targetMember.id === state.playerId) {
      closeSeatActionMenu();
      return;
    }

    closeSeatActionMenu();

    const menu = document.createElement("div");
    menu.style.position = "fixed";
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.minWidth = "156px";
    menu.style.padding = "8px";
    menu.style.borderRadius = "14px";
    menu.style.border = "1px solid rgba(255,255,255,0.14)";
    menu.style.background = "rgba(18,10,36,0.96)";
    menu.style.backdropFilter = "blur(14px)";
    menu.style.boxShadow = "0 18px 40px rgba(0,0,0,0.34)";
    menu.style.zIndex = "10020";
    menu.style.display = "grid";
    menu.style.gap = "6px";

    const title = document.createElement("div");
    title.style.padding = "4px 8px 6px";
    title.style.fontSize = "12px";
    title.style.fontWeight = "800";
    title.style.color = "rgba(248,245,255,0.72)";
    title.style.wordBreak = "break-word";
    title.textContent = targetMember.name || "プレイヤー";
    menu.appendChild(title);

    function makeMenuButton(label, danger, onClick) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.width = "100%";
      button.style.height = "42px";
      button.style.minWidth = "0";
      button.style.borderRadius = "10px";
      button.style.border = danger ? "1px solid rgba(255,120,120,0.28)" : "1px solid rgba(255,255,255,0.12)";
      button.style.background = danger ? "rgba(255,90,90,0.18)" : "rgba(255,255,255,0.08)";
      button.style.color = "#f8f5ff";
      button.style.fontSize = "14px";
      button.style.fontWeight = "900";
      button.addEventListener("click", function(event) {
        event.stopPropagation();
        closeSeatActionMenu();
        onClick();
      });
      return button;
    }

    menu.appendChild(makeMenuButton("オーナー譲渡", false, function() {
      if (typeof onSeatOwnerTransfer === "function") onSeatOwnerTransfer(playerId);
    }));
    menu.appendChild(makeMenuButton("キック", true, function() {
      if (typeof onSeatKick === "function") onSeatKick(playerId);
    }));

    document.body.appendChild(menu);
    seatActionMenu = menu;

    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(8, clientX), Math.max(8, window.innerWidth - rect.width - 8));
    const top = Math.min(Math.max(8, clientY), Math.max(8, window.innerHeight - rect.height - 8));
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function ensurePlayAnimLayer() {
    let layer = document.getElementById("playAnimLayer");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "playAnimLayer";
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "9999";
    document.body.appendChild(layer);
    return layer;
  }

  function animateSeatToSeatCards(fromPlayerId, toPlayerId, count, cacheKey) {
    if (!fromPlayerId || !toPlayerId || !count || !cacheKey || cacheKey === lastAnimatedTransferKey) return;
    const fromSeat = document.querySelector('.seatCard[data-player-id="' + CSS.escape(String(fromPlayerId)) + '"]');
    const toSeat = document.querySelector('.seatCard[data-player-id="' + CSS.escape(String(toPlayerId)) + '"]');
    if (!fromSeat || !toSeat) return;
    const fromRect = fromSeat.getBoundingClientRect();
    const toRect = toSeat.getBoundingClientRect();
    if (!fromRect.width || !toRect.width) return;
    lastAnimatedTransferKey = cacheKey;
    const layer = ensurePlayAnimLayer();
    const startX = fromRect.left + (fromRect.width / 2);
    const startY = fromRect.top + (fromRect.height / 2);
    const endX = toRect.left + (toRect.width / 2);
    const endY = toRect.top + (toRect.height / 2);

    for (let index = 0; index < count; index += 1) {
      const chip = document.createElement("div");
      chip.className = "cardChip cardBlack";
      chip.textContent = "🂠";
      chip.style.position = "fixed";
      chip.style.left = (startX - 22) + "px";
      chip.style.top = (startY - 15) + "px";
      chip.style.margin = "0";
      chip.style.pointerEvents = "none";
      chip.style.zIndex = "10000";
      chip.style.transition = "transform 360ms ease, opacity 360ms ease";
      chip.style.transform = "translate(0px, 0px) scale(0.92)";
      chip.style.opacity = "0.96";
      chip.style.boxShadow = "0 8px 18px rgba(0,0,0,0.26)";
      chip.style.willChange = "transform, opacity";
      layer.appendChild(chip);

      const spreadX = (index - ((count - 1) / 2)) * 12;
      const spreadY = Math.min(index * 3, 10);
      requestAnimationFrame(function() {
        chip.style.transform = 'translate(' + ((endX - startX) + spreadX) + 'px, ' + ((endY - startY) + spreadY) + 'px) scale(1)';
        chip.style.opacity = "0.18";
      });
      window.setTimeout(function() {
        chip.remove();
      }, 400);
    }
  }

  function applyRoomScale() {
    if (!roomPanel) return;
    if (!document.body.classList.contains("inRoom")) {
      roomPanel.style.zoom = "";
      roomPanel.style.width = "";
      roomPanel.style.height = "";
      return;
    }
    const baseWidth = 1440;
    const baseHeight = 900;
    const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight, 1);
    roomPanel.style.zoom = String(scale);
    roomPanel.style.width = (100 / scale) + "vw";
    roomPanel.style.height = (100 / scale) + "dvh";
  }

  function animatePlayedCards(game) {
    if (!game || !game.lastPlay || !Array.isArray(game.lastPlay.cards) || !game.lastPlay.cards.length) return;
    const playKey = [
      game.lastPlay.playerId || "",
      game.lastPlay.playedAtMs || "",
      game.lastPlay.cards.map(function(card) { return card.id; }).join("|")
    ].join("__");
    if (!playKey || playKey === lastAnimatedPlayKey) return;
    const fromSeat = document.querySelector('.seatCard[data-player-id="' + CSS.escape(String(game.lastPlay.playerId || "")) + '"]');
    const targetWrap = document.getElementById("lastPlayList");
    if (!fromSeat || !targetWrap) return;
    const fromRect = fromSeat.getBoundingClientRect();
    const targetRect = targetWrap.getBoundingClientRect();
    if (!fromRect.width || !targetRect.width) return;
    lastAnimatedPlayKey = playKey;
    const layer = ensurePlayAnimLayer();
    const startX = fromRect.left + (fromRect.width / 2);
    const startY = fromRect.top + (fromRect.height / 2);
    const endX = targetRect.left + (targetRect.width / 2);
    const endY = targetRect.top + Math.min(36, targetRect.height / 2);

    game.lastPlay.cards.forEach(function(card, index) {
      const chip = document.createElement("div");
      chip.className = cardClass(card);
      chip.textContent = cardText(card);
      chip.style.position = "fixed";
      chip.style.left = (startX - 22) + "px";
      chip.style.top = (startY - 15) + "px";
      chip.style.margin = "0";
      chip.style.pointerEvents = "none";
      chip.style.zIndex = "10000";
      chip.style.transition = "transform 340ms ease, opacity 340ms ease";
      chip.style.transform = "translate(0px, 0px) scale(0.92)";
      chip.style.opacity = "0.96";
      chip.style.boxShadow = "0 8px 18px rgba(0,0,0,0.26)";
      chip.style.willChange = "transform, opacity";
      if (cardInlineStyle(card)) chip.style.cssText += cardInlineStyle(card);
      layer.appendChild(chip);

      const spreadX = (index - ((game.lastPlay.cards.length - 1) / 2)) * 16;
      const spreadY = Math.min(index * 2, 8);
      requestAnimationFrame(function() {
        chip.style.transform = 'translate(' + ((endX - startX) + spreadX) + 'px, ' + ((endY - startY) + spreadY) + 'px) scale(1)';
        chip.style.opacity = "0.18";
      });
      window.setTimeout(function() {
        chip.remove();
      }, 380);
    });
  }

  function updateCountdownLabel() {
    const state = getState();
    const currentGame = state.currentGame;
    let remainMs = 0;
    let totalMs = 0;
    let baseStartedAtMs = 0;

    let ownTurnMeterKey = "";
    if (currentGame && currentGame.phase === "playing") {
      if (isMyTurn() && !(currentGame && currentGame.pendingSevenPass)) {
        ownTurnMeterKey = [
          "play",
          currentGame.currentTurnPlayerId || "",
          currentGame.currentTurnStartedAtMs || 0
        ].join("__");
        totalMs = (currentGame.turnTimeSeconds || state.currentSettings.turnTimeSeconds || 30) * 1000;
        baseStartedAtMs = currentGame.currentTurnStartedAtMs || 0;
      } else if (isPendingTransferMine()) {
        ownTurnMeterKey = [
          "transfer",
          currentGame.pendingSevenPass && currentGame.pendingSevenPass.fromPlayerId || "",
          currentGame.pendingSevenPass && currentGame.pendingSevenPass.toPlayerId || "",
          currentGame.pendingSevenPass && currentGame.pendingSevenPass.count || 0,
          currentGame.lastPlay && currentGame.lastPlay.playedAtMs || 0
        ].join("__");
        totalMs = (currentGame.turnTimeSeconds || state.currentSettings.turnTimeSeconds || 30) * 1000;
        baseStartedAtMs = currentGame.currentTurnStartedAtMs || 0;
      }
    } else if (currentGame && currentGame.phase === "trading") {
      const ownPair = getTradePairForPlayer(currentGame, state.playerId);
      if (ownPair && !ownPair.done) {
        ownTurnMeterKey = [
          "trade",
          ownPair.fromPlayerId || "",
          ownPair.toPlayerId || "",
          ownPair.count || 0,
          currentGame.tradeState && currentGame.tradeState.startedAtMs || 0
        ].join("__");
        totalMs = 30000;
        baseStartedAtMs = currentGame.tradeState && currentGame.tradeState.startedAtMs || 0;
      }
    }

    let meterWrap = document.getElementById("handCountdownMeterWrap");
    let meterBar = document.getElementById("handCountdownMeterBar");
    if ((!meterWrap || !meterBar) && myHandList && myHandList.parentElement) {
      meterWrap = document.createElement("div");
      meterWrap.id = "handCountdownMeterWrap";
      meterWrap.style.width = "min(100%, 720px)";
      meterWrap.style.height = "10px";
      meterWrap.style.margin = "0 auto 10px";
      meterWrap.style.borderRadius = "999px";
      meterWrap.style.overflow = "hidden";
      meterWrap.style.background = "rgba(255,255,255,0.12)";
      meterWrap.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.22)";

      meterBar = document.createElement("div");
      meterBar.id = "handCountdownMeterBar";
      meterBar.style.height = "100%";
      meterBar.style.width = "0%";
      meterBar.style.borderRadius = "999px";
      meterBar.style.transition = "width 180ms linear, background 180ms linear";
      meterWrap.appendChild(meterBar);
      myHandList.parentElement.insertBefore(meterWrap, myHandList);
    }

    if (!meterBar) return;
    if (!ownTurnMeterKey || !totalMs || !baseStartedAtMs) {
      lastOwnTurnMeterKey = "";
      lastOwnTurnMeterStartedAtMs = 0;
      meterBar.style.width = "0%";
      meterBar.style.background = "linear-gradient(90deg, rgba(120,255,160,0.9), rgba(70,210,120,0.95))";
      return;
    }

    if (ownTurnMeterKey !== lastOwnTurnMeterKey || lastOwnTurnMeterStartedAtMs !== baseStartedAtMs) {
      lastOwnTurnMeterKey = ownTurnMeterKey;
      lastOwnTurnMeterStartedAtMs = baseStartedAtMs;
    }

    remainMs = Math.max(0, totalMs - Math.max(0, nowMs() - lastOwnTurnMeterStartedAtMs));
    const ratio = Math.max(0, Math.min(1, remainMs / totalMs));
    meterBar.style.width = (ratio * 100).toFixed(1) + "%";
    if (ratio <= 0.25) {
      meterBar.style.background = "linear-gradient(90deg, rgba(255,120,120,0.95), rgba(255,70,70,1))";
    } else if (ratio <= 0.5) {
      meterBar.style.background = "linear-gradient(90deg, rgba(255,210,110,0.95), rgba(255,170,60,1))";
    } else {
      meterBar.style.background = "linear-gradient(90deg, rgba(120,255,160,0.9), rgba(70,210,120,0.95))";
    }
  }

  function getTradeResultNotice(game) {
  const state = getState();
  const tradeResult = game && game.lastTradeResult && typeof game.lastTradeResult === "object" ? game.lastTradeResult : null;
  const playerResult = tradeResult && tradeResult.players && tradeResult.players[state.playerId] ? tradeResult.players[state.playerId] : null;
  if (!playerResult || !Array.isArray(playerResult.givenCards) || !playerResult.givenCards.length) return "";
  const targetName = playerResult.toPlayerId ? getMemberName(playerResult.toPlayerId) : "相手";
  return "あなたが " + targetName + " に渡したカード: " + playerResult.givenCards.map(function(card) {
    return cardText(card);
  }).join(" / ");
}

  function ensureSelectionPromptLayer() {
    let layer = document.getElementById("selectionPromptLayer");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "selectionPromptLayer";
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.display = "none";
    layer.style.alignItems = "center";
    layer.style.justifyContent = "center";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "10040";

    const text = document.createElement("div");
    text.id = "selectionPromptText";
    text.style.padding = "18px 28px";
    text.style.borderRadius = "22px";
    text.style.background = "rgba(0,0,0,0.26)";
    text.style.backdropFilter = "blur(8px)";
    text.style.color = "#ffffff";
    text.style.fontSize = "clamp(28px, 4.2vw, 52px)";
    text.style.fontWeight = "900";
    text.style.letterSpacing = "0.04em";
    text.style.textAlign = "center";
    text.style.textShadow = "0 6px 22px rgba(0,0,0,0.38)";
    text.style.opacity = "0";
    text.style.transition = "opacity 480ms ease";
    text.style.whiteSpace = "nowrap";

    layer.appendChild(text);
    document.body.appendChild(layer);
    return layer;
  }

  function updateSelectionPrompt(game) {
    const layer = ensureSelectionPromptLayer();
    const text = document.getElementById("selectionPromptText");
    if (!layer || !text) return;
    window.clearInterval(selectionPromptTimer);
    selectionPromptTimer = null;

    const state = getState();
    let message = "";
    if (game && game.phase === "trading") {
      const pair = getTradePairForPlayer(game, state.playerId);
      if (pair && !pair.done) {
        message = "渡すカードを選んでください";
      }
    } else if (game && game.phase === "playing" && game.pendingSevenPass && game.pendingSevenPass.fromPlayerId === state.playerId) {
      message = game.pendingSevenPass.mode === "tenDump"
        ? "捨てるカードを選んでください"
        : "渡すカードを選んでください";
    }

    if (!message) {
      layer.classList.add("hidden");
      layer.style.display = "none";
      text.style.opacity = "0";
      text.textContent = "";
      return;
    }

    text.textContent = message;
    layer.classList.remove("hidden");
    layer.style.display = "flex";
    let visible = false;
    function tick() {
      visible = !visible;
      text.style.opacity = visible ? "1" : "0.18";
    }
    tick();
    selectionPromptTimer = window.setInterval(tick, 1000);
  }

  function ensureDirectionEffectLayer() {
    let layer = document.getElementById("directionEffectLayer");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "directionEffectLayer";
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "10030";
    layer.style.opacity = "0";
    document.body.appendChild(layer);
    return layer;
  }

  function playDirectionEffect(direction) {
    const layer = ensureDirectionEffectLayer();
    layer.innerHTML = "";
    layer.style.opacity = "1";

    const ring = document.createElement("div");
    ring.style.position = "absolute";
    ring.style.left = "50%";
    ring.style.top = "50%";
    ring.style.width = "min(44vw, 340px)";
    ring.style.height = "min(44vw, 340px)";
    ring.style.transform = "translate(-50%, calc(-50% - 60px))";
    ring.style.filter = "drop-shadow(0 0 8px rgba(255,255,255,0.14))";
    ring.style.opacity = "0";
    layer.appendChild(ring);

    const radius = 170;
    const arrowCount = 6;
    for (let index = 0; index < arrowCount; index += 1) {
      const arrow = document.createElement("div");
      const angle = ((Math.PI * 2) / arrowCount) * index;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const deg = (angle * 180 / Math.PI) + (direction === -1 ? -90 : 90);
      arrow.textContent = "➜";
      arrow.style.position = "absolute";
      arrow.style.left = "50%";
      arrow.style.top = "50%";
      arrow.style.width = "44px";
      arrow.style.height = "44px";
      arrow.style.marginLeft = "-22px";
      arrow.style.marginTop = "-22px";
      arrow.style.display = "flex";
      arrow.style.alignItems = "center";
      arrow.style.justifyContent = "center";
      arrow.style.fontSize = "32px";
      arrow.style.fontWeight = "900";
      arrow.style.color = "rgba(255,255,255," + (0.18 + (index / arrowCount) * 0.12).toFixed(2) + ")";
      arrow.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px) rotate(" + deg.toFixed(1) + "deg)";
      arrow.style.filter = "drop-shadow(0 0 5px rgba(255,255,255,0.10))";
      ring.appendChild(arrow);
    }

    ring.animate(
      [
        { transform: "translate(-50%, calc(-50% - 60px)) rotate(0deg)", opacity: 0 },
        { transform: "translate(-50%, calc(-50% - 60px)) rotate(" + (direction === -1 ? -18 : 18) + "deg)", opacity: 0.26, offset: 0.2 },
        { transform: "translate(-50%, calc(-50% - 60px)) rotate(" + (direction === -1 ? -36 : 36) + "deg)", opacity: 0, offset: 0.4 },
        { transform: "translate(-50%, calc(-50% - 60px)) rotate(" + (direction === -1 ? -90 : 90) + "deg)", opacity: 0, offset: 1 }
      ],
      {
        duration: 5000,
        easing: "linear",
        iterations: Infinity
      }
    );
  }

  function maybePlayDirectionEffect(game) {
    const layer = ensureDirectionEffectLayer();
    if (!game || game.phase !== "playing") {
      layer.style.opacity = "0";
      layer.innerHTML = "";
      lastDirectionEffectKey = "";
      return;
    }
    const key = [
      game.phase || "",
      game.direction,
      getEffectiveRevolution(game) ? "rev" : "normal"
    ].join("__");
    if (key === lastDirectionEffectKey) return;
    lastDirectionEffectKey = key;
    playDirectionEffect(game.direction);
  }

  function renderField(game) {
    const tableCenterEl = membersList.querySelector(".tableCenter");
    if (tableCenterEl) {
      const revolutionActive = !!(game && game.phase === "playing" && getEffectiveRevolution(game));
      tableCenterEl.style.background = revolutionActive
        ? "linear-gradient(145deg, rgba(120, 12, 12, 0.9), rgba(170, 24, 24, 0.86))"
        : "rgba(0,0,0,0.18)";
      tableCenterEl.style.borderColor = revolutionActive
        ? "rgba(255,120,120,0.42)"
        : "rgba(255,255,255,0.14)";
      tableCenterEl.style.boxShadow = revolutionActive
        ? "inset 0 0 28px rgba(255,120,120,0.12), 0 0 0 1px rgba(255,80,80,0.14)"
        : "inset 0 0 28px rgba(255,255,255,0.04)";
    }

    if (!game) {
      fieldOwnerLabel.textContent = "場は空です";
      effectStatusLabel.textContent = "待機中";
      lockStatusLabel.textContent = "縛りなし";
      const lockBadgeWrap = document.getElementById("lockBadgeWrap");
      if (lockBadgeWrap) lockBadgeWrap.innerHTML = buildLockBadgeHtml(null);
      actionHintLabel.textContent = "開始待ち";
      actionHintMirror.textContent = "開始待ち";
      actionLogCache = [];
      lastRenderedActionText = "";
      lastPlayList.innerHTML = '<div class="fieldEmpty">まだ場札はありません</div>';
      updateSelectionPrompt(null);
      updateCountdownLabel();
      return;
    }

    effectStatusLabel.textContent = buildEffectStatusText(game);
    maybePlayDirectionEffect(game);
    lockStatusLabel.textContent = buildLockStatusText(game);
    const lockBadgeWrap = document.getElementById("lockBadgeWrap");
    if (lockBadgeWrap) lockBadgeWrap.innerHTML = buildLockBadgeHtml(game);

    if (game.lastPlay && Array.isArray(game.lastPlay.cards) && game.lastPlay.cards.length) {
      fieldOwnerLabel.textContent = getMemberName(game.lastPlay.playerId) + " が出しました";
      lastPlayList.innerHTML = game.lastPlay.cards.map(function(card) {
        return '<div class="' + cardClass(card) + '" style="' + cardInlineStyle(card) + '">' + escapeHtml(cardText(card)) + '</div>';
      }).join("");
      animatePlayedCards(game);
    } else if (game.resolvedField && Array.isArray(game.resolvedField.cards) && game.resolvedField.cards.length) {
      fieldOwnerLabel.textContent = getMemberName(game.resolvedField.playerId) + " の" + (game.resolvedField.reason || "直前の場");
      lastPlayList.innerHTML = game.resolvedField.cards.map(function(card) {
        return '<div class="' + cardClass(card) + '" style="' + cardInlineStyle(card) + '">' + escapeHtml(cardText(card)) + '</div>';
      }).join("");
    } else {
      fieldOwnerLabel.textContent = "場は空です";
      lastPlayList.innerHTML = '<div class="fieldEmpty">まだ場札はありません</div>';
    }

    const tradeResultNotice = getTradeResultNotice(game);
    if (tradeResultNotice) {
      actionHintLabel.textContent = tradeResultNotice;
      actionHintMirror.textContent = tradeResultNotice;
      if (tradeResultNotice !== lastRenderedActionText) {
        pushActionLog(tradeResultNotice);
        lastRenderedActionText = tradeResultNotice;
      }
    }

    if (game.phase === "trading") {
      const state = getState();
      const pair = getTradePairForPlayer(game, state.playerId);
      if (pair && !pair.done) {
        actionHintLabel.textContent = pair.count + "枚選んで " + getMemberName(pair.toPlayerId) + " に渡してください";
      } else {
        actionHintLabel.textContent = tradeResultNotice || game.lastActionText || "交換中";
      }
      actionHintMirror.textContent = actionHintLabel.textContent;
      if (actionHintLabel.textContent && actionHintLabel.textContent !== lastRenderedActionText) {
        pushActionLog(actionHintLabel.textContent);
        lastRenderedActionText = actionHintLabel.textContent;
      }
      renderActionLog();
      updateSelectionPrompt(game);
      updateCountdownLabel();
      return;
    }

    if (game.phase === "finished") {
      actionHintLabel.textContent = tradeResultNotice || game.lastActionText || "順位が確定しました";
      actionHintMirror.textContent = actionHintLabel.textContent;
    } else if (tradeResultNotice) {
      actionHintLabel.textContent = tradeResultNotice;
      actionHintMirror.textContent = actionHintLabel.textContent;
    } else if (game.pendingSevenPass) {
      actionHintLabel.textContent = getMemberName(game.pendingSevenPass.fromPlayerId) + " が " + getMemberName(game.pendingSevenPass.toPlayerId) + " に " + game.pendingSevenPass.count + "枚渡します";
      actionHintMirror.textContent = actionHintLabel.textContent;
      animateSeatToSeatCards(
        game.pendingSevenPass.fromPlayerId,
        game.pendingSevenPass.toPlayerId,
        game.pendingSevenPass.count,
        [
          game.lastPlay && game.lastPlay.playedAtMs ? game.lastPlay.playedAtMs : "",
          game.pendingSevenPass.fromPlayerId,
          game.pendingSevenPass.toPlayerId,
          game.pendingSevenPass.count
        ].join("__")
      );
    } else if (game.pendingClearField) {
      actionHintLabel.textContent = game.lastActionText || "8切り処理中";
      actionHintMirror.textContent = actionHintLabel.textContent;
    } else {
      actionHintLabel.textContent = game.lastActionText || "進行中";
      actionHintMirror.textContent = actionHintLabel.textContent;
    }

    if (actionHintLabel.textContent && actionHintLabel.textContent !== lastRenderedActionText) {
      pushActionLog(actionHintLabel.textContent);
      lastRenderedActionText = actionHintLabel.textContent;
    }
    renderActionLog();
    updateSelectionPrompt(game);
    updateCountdownLabel();
  }

  function updateActionButtons() {
    const state = getState();
    const currentGame = state.currentGame;
    const currentSettings = state.currentSettings;
    const inGame = !!(currentGame && (currentGame.phase === "playing" || currentGame.phase === "trading"));
    const pendingTransfer = currentGame && currentGame.pendingSevenPass ? currentGame.pendingSevenPass : null;
    const tradingPair = getTradePairForPlayer(currentGame, state.playerId);
    const tradeMode = !!(isTradePhase() && tradingPair && !tradingPair.done);
    const transferMode = !!(pendingTransfer && pendingTransfer.fromPlayerId === state.playerId) || tradeMode;
    const selection = getSelectedHandCards();

    transferButton.classList.toggle("hidden", !transferMode);
    playButton.classList.toggle("hidden", transferMode);
    passButton.classList.toggle("hidden", transferMode);

    if (!inGame) {
      playButton.disabled = true;
      passButton.disabled = true;
      transferButton.disabled = true;
      return;
    }
    if (tradeMode) {
      transferButton.disabled = selection.length !== tradingPair.count;
      return;
    }
    if (transferMode) {
      transferButton.disabled = selection.length !== pendingTransfer.count;
      return;
    }

    const validation = selection.length ? validatePlaySelection(selection, currentGame, currentSettings) : { ok: false };
    playButton.disabled = !(isMyTurn() && validation.ok && !pendingTransfer && !(currentGame && currentGame.pendingClearField));
    passButton.disabled = !(isMyTurn() && currentGame.lastPlay && !pendingTransfer && !(currentGame && currentGame.pendingClearField));
  }

  function getSelectedHandCards() {
    const state = getState();
    const hand = state.currentGame ? getCurrentHand(state.currentGame, state.playerId) : [];
    return hand.filter(function(card) { return state.selectedCardIds.has(card.id); });
  }

  function chooseCards(items, count) {
    if (count <= 0) return [[]];
    if (!Array.isArray(items) || items.length < count) return [];
    const result = [];
    function walk(start, picked) {
      if (picked.length === count) {
        result.push(picked.slice());
        return;
      }
      for (let index = start; index < items.length; index += 1) {
        picked.push(items[index]);
        walk(index + 1, picked);
        picked.pop();
      }
    }
    walk(0, []);
    return result;
  }

  function getHoverPreviewCardIds(cardId) {
    const state = getState();
    const game = state.currentGame;
    if (!cardId || !isMyTurn() || !game || !game.lastPlay || game.pendingSevenPass || game.pendingClearField) return new Set();
    const hand = sortHandCards(getCurrentHand(game, state.playerId));
    const hoveredCard = hand.find(function(card) { return card.id === cardId; });
    if (!hoveredCard) return new Set();
    const requiredLength = game.lastPlay && game.lastPlay.length ? game.lastPlay.length : 0;
    if (!requiredLength || requiredLength < 1) return new Set();
    const others = hand.filter(function(card) { return card.id !== cardId; });
    const candidates = chooseCards(others, Math.max(0, requiredLength - 1)).map(function(group) {
      return [hoveredCard].concat(group);
    });
    const valid = candidates.map(function(cards) {
      return { cards: cards, result: validatePlaySelection(cards, game, state.currentSettings) };
    }).filter(function(item) {
      return item.result && item.result.ok;
    }).sort(function(a, b) {
      const aJokerCount = a.cards.filter(function(card) { return card.rank === "JOKER"; }).length;
      const bJokerCount = b.cards.filter(function(card) { return card.rank === "JOKER"; }).length;
      if (aJokerCount !== bJokerCount) return aJokerCount - bJokerCount;
      if (a.result.play.comparePower !== b.result.play.comparePower) return a.result.play.comparePower - b.result.play.comparePower;
      return a.cards.map(function(card) { return String(card.id); }).join("|").localeCompare(b.cards.map(function(card) { return String(card.id); }).join("|"));
    });
    return valid.length ? new Set(valid[0].cards.map(function(card) { return card.id; })) : new Set();
  }

  function applyHoverPreview(cardId) {
    const nextIds = getHoverPreviewCardIds(cardId);
    let changed = nextIds.size !== hoverPreviewCardIds.size;
    if (!changed) {
      nextIds.forEach(function(id) {
        if (!hoverPreviewCardIds.has(id)) changed = true;
      });
    }
    if (!changed) return;
    hoverPreviewCardIds = nextIds;
    renderMyHand(getCurrentHand(getState().currentGame, getState().playerId));
  }

  function clearHoverPreview() {
    if (!hoverPreviewCardIds.size) return;
    hoverPreviewCardIds = new Set();
    renderMyHand(getCurrentHand(getState().currentGame, getState().playerId));
  }

  function renderMyHand(cards) {
    const state = getState();
    const hand = sortHandCards(cards);
    myHandCount.textContent = hand.length + "枚";

    const handIds = new Set(hand.map(function(card) { return card.id; }));
    Array.from(state.selectedCardIds).forEach(function(id) {
      if (!handIds.has(id)) state.selectedCardIds.delete(id);
    });
    if (!isMyTurn() && !isPendingTransferMine() && !isTradePhase()) {
      state.selectedCardIds.clear();
      hoverPreviewCardIds = new Set();
    }

    if (!hand.length) {
      myHandList.innerHTML = '<div class="handEmpty">手札はありません</div>';
      updateActionButtons();
      return;
    }

    const selectable = isMyTurn() || isPendingTransferMine() || (isTradePhase() && !!getTradePairForPlayer(state.currentGame, state.playerId));
    myHandList.innerHTML = hand.map(function(card) {
      const selected = state.selectedCardIds.has(card.id);
      const preview = hoverPreviewCardIds.has(card.id);
      let extraStyle = cardInlineStyle(card) || "";
      if (preview && !selected) extraStyle += 'transform:translateY(-9px);box-shadow:0 0 0 2px rgba(120,210,255,0.92),0 10px 22px rgba(70,170,255,0.34);transition:transform 120ms ease, box-shadow 120ms ease;';
      if (!preview && !selected) extraStyle += 'transition:transform 120ms ease, box-shadow 120ms ease;';
      return '<div class="' + cardClass(card) + (selectable ? ' cardSelectable' : '') + (selected ? ' cardSelected' : '') + '" data-card-id="' + escapeHtml(card.id) + '" style="' + extraStyle + '">' + escapeHtml(cardText(card)) + '</div>';
    }).join("");

    updateActionButtons();
  }

  function updatePreStartLock() {
    const state = getState();
    const inGame = !!(state.currentGame && (state.currentGame.phase === "playing" || state.currentGame.phase === "trading"));
    const finished = !!(state.currentGame && state.currentGame.phase === "finished");
    roomPanel.classList.toggle("guestLocked", !inGame && !finished && !isHostPlayer());
  }

  function updateStartButton() {
    const state = getState();
    const amHost = isHostPlayer();
    const inGame = !!(state.currentGame && (state.currentGame.phase === "playing" || state.currentGame.phase === "trading"));
    const finished = !!(state.currentGame && state.currentGame.phase === "finished");
    settingsButton.classList.toggle("hidden", !amHost || inGame);
    startGameButton.classList.toggle("hidden", !amHost);
    startGameButton.textContent = finished ? "次の試合" : "ゲーム開始";
    settingsButton.textContent = finished ? "終了" : "ルール設定";
    startGameButton.disabled = !amHost || inGame || state.currentMembers.length < 2;
    if (!amHost || inGame || finished) settingsPanel.classList.add("hidden");
    updatePreStartLock();
    if (!(state.currentGame && (state.currentGame.phase === "playing" || state.currentGame.phase === "trading"))) {
      updateSelectionPrompt(null);
    }
    updateRulesTextWithBetStatus();
    updateSettingsViewMode();
  }

  function updateSettingsViewMode() {
    const state = getState();
    const showSettingsOnly = !settingsPanel.classList.contains("hidden")
      && isHostPlayer()
      && !(state.currentGame && (state.currentGame.phase === "playing" || state.currentGame.phase === "trading" || state.currentGame.phase === "finished"));

    const fieldPanelEl = document.querySelector(".fieldPanel");
    const myHandSectionEl = document.querySelector(".myHandSection");
    const compactLineEl = document.querySelector(".compactLine");
    const topInfoBarEl = document.querySelector(".topInfoBar");
    const rulesTextEl = document.getElementById("rulesText");

    if (fieldPanelEl) fieldPanelEl.classList.toggle("hidden", showSettingsOnly);
    if (membersList) membersList.classList.toggle("hidden", showSettingsOnly);
    if (myHandSectionEl) myHandSectionEl.classList.toggle("hidden", showSettingsOnly);
    if (compactLineEl) compactLineEl.classList.toggle("hidden", showSettingsOnly);
    if (topInfoBarEl) topInfoBarEl.classList.toggle("hidden", showSettingsOnly);
    if (rulesTextEl) rulesTextEl.classList.toggle("hidden", showSettingsOnly);
  }

  function renderRoomSettings(settings) {
    const state = getState();
    state.currentSettings = normalizeRoomSettings(settings);
    updateRulesTextWithBetStatus();
    Array.from(settingsPanel.querySelectorAll(".settingItem[data-setting-target]"))
      .forEach(function(item) {
        const targetId = item.getAttribute("data-setting-target") || "";
        const input = targetId ? document.getElementById(targetId) : null;
        const on = !!(input && input.checked);
        item.classList.toggle("settingOn", on);
        item.classList.toggle("settingOff", !on);
      });
    updateSettingsViewMode();
  }

  function getHighlightedPlayerId(game) {
    if (!game) return "";
    if (game.phase === "trading") {
      const tradeState = game.tradeState && typeof game.tradeState === "object" ? game.tradeState : null;
      const waitingPair = tradeState && Array.isArray(tradeState.pairs)
        ? tradeState.pairs.find(function(pair) { return pair && !pair.done; })
        : null;
      return waitingPair ? (waitingPair.fromPlayerId || "") : "";
    }
    if (game.phase !== "playing") return "";
    if (game.pendingClearField && game.pendingClearField.nextPlayerId) return game.pendingClearField.nextPlayerId;
    if (game.pendingSevenPass && game.pendingSevenPass.fromPlayerId) return game.pendingSevenPass.fromPlayerId;
    return game.currentTurnPlayerId || "";
  }

  function renderMembers(members) {
    const state = getState();
    const list = members;
    memberCount.textContent = list.length + "人";
    roomWordLabel.textContent = state.roomWord || "-";

    if (!list.length) {
      lastMembersLayoutKey = "";
      lastRenderedRoleStateKey = "";
      membersList.innerHTML = '<div class="sideInfoCol"><div class="sideInfoCard"><span>合言葉</span><strong id="sideRoomWordLabel">-</strong></div><div class="sideInfoCard"><span>参加人数</span><strong id="sideMemberCountLabel">0人</strong></div></div><div class="arenaCenter"><div class="tableCenter"><div class="tableCenterTitle">TABLE CENTER</div><div class="tableCenterOwner" id="fieldOwnerLabel">場は空です</div><div class="fieldCards" id="lastPlayList"><div class="fieldEmpty">まだ場札はありません</div></div><div class="tableCenterSub" id="actionHintLabel">開始待ち</div></div><div class="fieldEmpty">まだ参加者はいません</div></div><div class="sideInfoCol"><div class="sideInfoCard"><span>状態</span><strong id="sideGamePhaseLabel">待機中</strong></div><div class="sideInfoCard"><span>手番</span><strong id="sideTurnInfoLabel">-</strong></div><div class="sideInfoCard"><span>ルール</span><strong id="sideRulesText">-</strong></div></div>';
      bindArenaElements();
      applyRoomScale();
      updateStartButton();
      return;
    }

    const layoutKey = buildMembersLayoutKey(list);
    if (layoutKey === lastMembersLayoutKey && membersList.querySelectorAll(".seatCard").length === list.length) {
      updateSeatLiveState();
      applyRoomScale();
      renderActionLog();
      updateRulesTextWithBetStatus();
      updateStartButton();
      return;
    }

    lastMembersLayoutKey = layoutKey;
    lastRenderedRoleStateKey = "";
    const roleMap = getCachedRoleMap(list, state.currentLastResult, state.currentGame);
    const seatCount = list.length;
    const radius = seatCount <= 2 ? 190 : seatCount <= 4 ? 220 : seatCount <= 6 ? 240 : 252;
    const seatScale = seatCount <= 4 ? 1 : Math.max(0.8, 1 - ((seatCount - 4) * 0.05));
    const seatWidth = Math.round(220 * seatScale);
    const seatHeight = Math.round(130 * seatScale);
    const seatTopHeight = Math.round(80 * seatScale);
    const avatarSize = Math.round(80 * seatScale);
    const nameHeight = Math.round(36 * seatScale);
    const roleHeight = Math.round(44 * seatScale);
    const handHeight = Math.round(50 * seatScale);
    const seatBorder = Math.max(2, Math.round(3 * seatScale));
    const seatNameFontSize = Math.max(11, Math.round(14 * seatScale));
    const handFontSize = Math.max(10, Math.round(12 * seatScale));
    const handStackWidth = Math.max(12, Math.round(16 * seatScale));
    const handStackHeight = Math.max(16, Math.round(22 * seatScale));
    const handStackOverlap = Math.max(7, Math.round(10 * seatScale));
    const startAngle = -Math.PI / 2;

    const leftHtml = '<div class="sideInfoCol">'
      + '<div class="sideInfoCard"><span>合言葉</span><strong id="sideRoomWordLabel">' + escapeHtml(state.roomWord || '-') + '</strong></div>'
      + '<div class="sideInfoCard"><span>参加人数</span><strong id="sideMemberCountLabel">' + list.length + '人</strong></div>'
      + '</div>';

    const centerHtml = '<div class="arenaCenter">'
      + '<div class="tableCenter">'
      + '<div class="tableCenterTitle">TABLE CENTER</div>'
      + '<div style="margin:6px 0 10px;" id="lockBadgeWrap">' + buildLockBadgeHtml(state.currentGame) + '</div>'
      + '<div class="tableCenterOwner" id="fieldOwnerLabel">場は空です</div>'
      + '<div class="fieldCards" id="lastPlayList"><div class="fieldEmpty">まだ場札はありません</div></div>'
      + '<div class="tableCenterSub" id="actionHintLabel">開始待ち</div>'
      + '</div>';

    const rightHtml = '<div class="sideInfoCol">'
      + '<div class="sideInfoCard"><span>状態</span><strong id="sideGamePhaseLabel">' + escapeHtml(gamePhaseLabel.textContent || '待機中') + '</strong></div>'
      + '<div class="sideInfoCard"><span>手番</span><strong id="sideTurnInfoLabel">' + escapeHtml(turnInfoLabel.textContent || '-') + '</strong></div>'
      + '<div class="sideInfoCard"><span>ルール</span><strong id="sideRulesText">' + escapeHtml(rulesText.textContent || '-') + '</strong></div>'
      + '<div class="sideInfoCard"><span>ログ</span><div id="actionLogList" style="max-height:220px;overflow-y:auto;padding-right:6px;font-size:12px;line-height:1.45;">まだログはありません</div></div>'
      + '</div>';

    const highlightedPlayerId = getHighlightedPlayerId(state.currentGame);
    const seatsHtml = list.map(function(member, index) {
      const angle = startAngle + (Math.PI * 2 * index / seatCount);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const isMe = member.id === state.playerId;
      const handCount = state.currentGame && state.currentGame.phase !== "waiting" ? getCurrentHand(state.currentGame, member.id).length : 0;
      const roleImageInfo = getSeatRoleImageInfo(member.id, roleMap, state.currentLastResult);
      const seatClickable = isHostPlayer() && !isMe ? ' data-seat-menu="1"' : '';
      const stackCount = Math.min(handCount, 5);

      const cardStackHtml = handCount > 0
        ? '<div style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:28px;">'
          + '<div style="height:24px;display:flex;justify-content:center;align-items:flex-end;">'
          + Array.from({ length: stackCount }).map(function(_, stackIndex) {
            const shade = 0.2 + (stackIndex * 0.04);
            return '<span style="display:block;width:16px;height:22px;margin-left:' + (stackIndex === 0 ? 0 : -10) + 'px;border-radius:5px;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(180deg, rgba(255,255,255,0.96), rgba(235,240,255,' + (0.86 - shade * 0.2).toFixed(2) + '));box-shadow:0 3px 8px rgba(0,0,0,0.18);"></span>';
          }).join('')
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:800;color:#ffffff;white-space:nowrap;">'
          + '<span style="opacity:0.78;">×</span>'
          + '<span data-hand-count-label="1">' + handCount + '枚</span>'
          + '</div>'
          + '</div>'
        : '<div data-hand-empty-label="1" style="min-height:28px;display:flex;justify-content:center;align-items:center;font-size:11px;opacity:0.56;">なし</div>';

      const roleImageHtml = '<img data-role-image="1" src="' + escapeHtml(roleImageInfo.src || '') + '" alt="' + escapeHtml(roleImageInfo.label || '') + '" style="display:' + (roleImageInfo.src ? 'block' : 'none') + ';width:100%;height:100%;object-fit:fill;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.24));" />';
      const finishStampHtml = getSeatFinishStampHtml(state.currentGame, member.id, seatScale);

      return '<div class="seatCard' + (isMe ? ' isMe' : '') + '" data-player-id="' + escapeHtml(member.id) + '"' + seatClickable + ' style="--seat-x:' + x.toFixed(1) + 'px;--seat-y:' + y.toFixed(1) + 'px;width:' + seatWidth + 'px;height:' + seatHeight + 'px;padding:0;border-radius:0;border:' + seatBorder + 'px solid rgba(255,255,255,0.9);box-shadow:0 8px 18px rgba(0,0,0,0.26);background:rgba(0,0,0,0.28);overflow:visible;">'
        + finishStampHtml
        + '<div style="display:grid;grid-template-columns:' + avatarSize + 'px 1fr;grid-template-rows:' + nameHeight + 'px ' + roleHeight + 'px;height:' + seatTopHeight + 'px;border-bottom:' + seatBorder + 'px solid #000;background:rgba(0,0,0,0.28);">'
        + '<div style="grid-column:1;grid-row:1 / span 2;border-right:' + seatBorder + 'px solid #000;display:flex;align-items:center;justify-content:center;color:#f0f0f0;font-size:12px;font-weight:700;background:rgba(0,0,0,0.18);">&nbsp;</div>'
        + '<div style="grid-column:2;grid-row:1;border-bottom:' + seatBorder + 'px solid #000;display:flex;align-items:center;justify-content:center;padding:0 10px;color:#f5f5f5;font-size:' + seatNameFontSize + 'px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:rgba(0,0,0,0.18);">' + escapeHtml(member.name || '名無し') + '</div>'
        + '<div style="grid-column:2;grid-row:2;padding:6px 10px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.18);">'
        + '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">' + roleImageHtml + '</div>'
        + '</div>'
        + '</div>'
        + '<div style="height:' + handHeight + 'px;padding:0 10px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.28);font-size:' + handFontSize + 'px;">' + cardStackHtml.replaceAll('width:16px', 'width:' + handStackWidth + 'px').replaceAll('height:22px', 'height:' + handStackHeight + 'px').replaceAll('margin-left:' + 0 + 'px', 'margin-left:0px').replaceAll('margin-left:-10px', 'margin-left:-' + handStackOverlap + 'px').replaceAll('font-size:12px', 'font-size:' + handFontSize + 'px') + '</div>'
        + '</div>';
    }).join('');

    membersList.innerHTML = leftHtml + centerHtml + seatsHtml + '</div>' + rightHtml;
    bindArenaElements();
    updateSeatLiveState();
    applyRoomScale();
    renderActionLog();
    updateRulesTextWithBetStatus();
    updateStartButton();
  }

  function syncSideInfo() {
    const sideRoomWordLabel = document.getElementById("sideRoomWordLabel");
    const sideMemberCountLabel = document.getElementById("sideMemberCountLabel");
    const sideGamePhaseLabel = document.getElementById("sideGamePhaseLabel");
    const sideTurnInfoLabel = document.getElementById("sideTurnInfoLabel");
    const sideRulesText = document.getElementById("sideRulesText");
    if (sideRoomWordLabel) sideRoomWordLabel.textContent = roomWordLabel.textContent || "-";
    if (sideMemberCountLabel) sideMemberCountLabel.textContent = memberCount.textContent || "0人";
    if (sideGamePhaseLabel) sideGamePhaseLabel.textContent = gamePhaseLabel.textContent || "待機中";
    if (sideTurnInfoLabel) sideTurnInfoLabel.textContent = turnInfoLabel.textContent || "-";
    if (sideRulesText) sideRulesText.textContent = rulesText.textContent || "-";
  }

  function renderGame(game) {
    const state = getState();
    state.currentGame = game && typeof game === "object"
      ? game
      : { phase: "waiting", revolution: false, jackBackActive: false, direction: 1, hands: {}, currentTurnPlayerId: "" };

    if (state.currentGame.phase === "waiting") {
      gamePhaseLabel.textContent = "待機中";
      turnInfoLabel.textContent = "開始待ち";
      if (Array.isArray(state.currentMembers) && state.currentMembers.length) renderMembers(state.currentMembers);
      renderMyHand([]);
      renderField(null);
      updateRulesTextWithBetStatus();
      syncSideInfo();
      updateStartButton();
      return;
    }

    if (state.currentGame.phase === "finished") {
      gamePhaseLabel.textContent = "終了";
      turnInfoLabel.textContent = "次ゲーム待ち";
      if (Array.isArray(state.currentMembers) && state.currentMembers.length) renderMembers(state.currentMembers);
      renderField(state.currentGame);
      updateRulesTextWithBetStatus();
      syncSideInfo();
      renderMyHand(getCurrentHand(state.currentGame, state.playerId));
      updateStartButton();
      return;
    }

    if (state.currentGame.phase === "trading") {
      gamePhaseLabel.textContent = "交換中";
      const pair = getTradePairForPlayer(state.currentGame, state.playerId);
      turnInfoLabel.textContent = pair && !pair.done ? "あなたの交換" : "交換待ち";
      if (Array.isArray(state.currentMembers) && state.currentMembers.length) renderMembers(state.currentMembers);
      renderField(state.currentGame);
      syncSideInfo();
      renderMyHand(getCurrentHand(state.currentGame, state.playerId));
      updateStartButton();
      return;
    }

    gamePhaseLabel.textContent = "ゲーム中";
    turnInfoLabel.textContent = state.currentGame.pendingClearField
      ? (getMemberName(state.currentGame.pendingClearField.nextPlayerId) + " の番")
      : (getMemberName(state.currentGame.currentTurnPlayerId) + (state.currentGame.pendingSevenPass ? " / 7渡し中" : " / 手番"));
    if (Array.isArray(state.currentMembers) && state.currentMembers.length) renderMembers(state.currentMembers);
    renderField(state.currentGame);
    updateRulesTextWithBetStatus();
    syncSideInfo();
    renderMyHand(getCurrentHand(state.currentGame, state.playerId));
    updateStartButton();
  }

  function setEntryMode() {
    lastMembersLayoutKey = "";
    lastRenderedRoleStateKey = "";
    document.body.classList.remove("inRoom");
    refs.entryPanel.classList.remove("hidden");
    closeSeatActionMenu();
    roomPanel.classList.add("hidden");
    roomPanel.classList.remove("guestLocked");
    memberCount.textContent = "0人";
    roomWordLabel.textContent = "-";
    gamePhaseLabel.textContent = "待機中";
    turnInfoLabel.textContent = "-";
    fieldOwnerLabel.textContent = "場は空です";
    effectStatusLabel.textContent = "待機中";
    lockStatusLabel.textContent = "縛りなし";
    actionHintLabel.textContent = "開始待ち";
    actionHintMirror.textContent = "開始待ち";
    lastAnimatedPlayKey = "";
    lastAnimatedTransferKey = "";
    lastDirectionEffectKey = "";
    myHandCount.textContent = "0枚";
    myHandList.innerHTML = '<div class="handEmpty">ゲーム開始で手札が配られます</div>';
    lastPlayList.innerHTML = '<div class="fieldEmpty">まだ場札はありません</div>';
    membersList.innerHTML = '<div class="sideInfoCol"><div class="sideInfoCard"><span>合言葉</span><strong id="sideRoomWordLabel">-</strong></div><div class="sideInfoCard"><span>参加人数</span><strong id="sideMemberCountLabel">0人</strong></div></div><div class="arenaCenter"><div class="tableCenter"><div class="tableCenterTitle">TABLE CENTER</div><div class="tableCenterOwner" id="fieldOwnerLabel">場は空です</div><div class="fieldCards" id="lastPlayList"><div class="fieldEmpty">まだ場札はありません</div></div><div class="tableCenterSub" id="actionHintLabel">開始待ち</div></div><div class="fieldEmpty">まだ参加者はいません</div></div><div class="sideInfoCol"><div class="sideInfoCard"><span>状態</span><strong id="sideGamePhaseLabel">待機中</strong></div><div class="sideInfoCard"><span>手番</span><strong id="sideTurnInfoLabel">-</strong></div><div class="sideInfoCard"><span>ルール</span><strong id="sideRulesText">-</strong></div></div>';
    bindArenaElements();
    settingsButton.classList.add("hidden");
    settingsPanel.classList.add("hidden");
    startGameButton.classList.add("hidden");
    startGameButton.disabled = true;
    playButton.disabled = true;
    passButton.disabled = true;
    transferButton.disabled = true;
    updateSettingsViewMode();
  }

  function setRoomMode() {
    closeSeatActionMenu();
    document.body.classList.add("inRoom");
    refs.entryPanel.classList.add("hidden");
    roomPanel.classList.remove("hidden");
    applyRoomScale();
  }

  membersList.addEventListener("click", function(event) {
    if (isAppSettingsOpen()) {
      closeSeatActionMenu();
      return;
    }
    const target = event.target.closest("[data-seat-menu][data-player-id]");
    if (!target) {
      closeSeatActionMenu();
      return;
    }
    event.stopPropagation();
    openSeatActionMenu(target.getAttribute("data-player-id"), event.clientX, event.clientY);
  });

  document.addEventListener("click", function(event) {
    if (!seatActionMenu) return;
    if (seatActionMenu.contains(event.target)) return;
    closeSeatActionMenu();
  });

  window.addEventListener("resize", closeSeatActionMenu);
  window.addEventListener("scroll", closeSeatActionMenu, true);

  myHandList.addEventListener("click", function(event) {
    const target = event.target.closest("[data-card-id]");
    if (!target) return;
    onToggleCard(target.getAttribute("data-card-id"));
  });

  myHandList.addEventListener("mouseover", function(event) {
    const target = event.target.closest("[data-card-id]");
    if (!target || !myHandList.contains(target)) return;
    applyHoverPreview(target.getAttribute("data-card-id"));
  });

  myHandList.addEventListener("mouseout", function(event) {
    const target = event.target.closest("[data-card-id]");
    if (!target) return;
    const related = event.relatedTarget;
    if (related && target.contains(related)) return;
    if (related && myHandList.contains(related) && related.closest("[data-card-id]")) return;
    clearHoverPreview();
  });

  playButton.addEventListener("click", onPlay);
  passButton.addEventListener("click", onPass);
  transferButton.addEventListener("click", onTransfer);
  refs.leaveButton.addEventListener("click", onLeaveRoom);
  Array.from(settingsPanel.querySelectorAll(".settingItem[data-setting-target]"))
    .forEach(function(item) {
      item.addEventListener("click", function(event) {
        const target = event.target;
        if (target && target.closest("input, button, label.switch, .choiceGroup, .choiceOption")) return;
        const targetId = item.getAttribute("data-setting-target") || "";
        const input = targetId ? document.getElementById(targetId) : null;
        if (!input || input.disabled) return;
        input.click();
      });
    });
  window.addEventListener("resize", applyRoomScale);

  return {
    bindArenaElements,
    renderActionLog,
    renderField,
    renderMembers,
    renderGame,
    renderMyHand,
    renderRoomSettings,
    setEntryMode,
    setRoomMode,
    syncSideInfo,
    updateActionButtons,
    updateCountdownLabel,
    updatePreStartLock,
    updateSettingsViewMode,
    updateStartButton
  };
}
