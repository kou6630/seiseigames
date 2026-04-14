const suits = [
  { code: "S", symbol: "♠", suitPower: 3 },
  { code: "H", symbol: "♥", suitPower: 2 },
  { code: "D", symbol: "♦", suitPower: 1 },
  { code: "C", symbol: "♣", suitPower: 0 }
];

const ranks = [
  { label: "3", power: 0 },
  { label: "4", power: 1 },
  { label: "5", power: 2 },
  { label: "6", power: 3 },
  { label: "7", power: 4 },
  { label: "8", power: 5 },
  { label: "9", power: 6 },
  { label: "10", power: 7 },
  { label: "J", power: 8 },
  { label: "Q", power: 9 },
  { label: "K", power: 10 },
  { label: "A", power: 11 },
  { label: "2", power: 12 }
];

export function getRanks() {
  return ranks.slice();
}

export function buildDeck(doubleDeckEnabled) {
  const deck = [];
  const deckCount = doubleDeckEnabled ? 2 : 1;
  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    suits.forEach(function(suit) {
      ranks.forEach(function(rank) {
        deck.push({
          id: deckIndex + "_" + suit.code + "_" + rank.label + "_" + Math.random().toString(36).slice(2, 7),
          suit: suit.symbol,
          suitCode: suit.code,
          suitPower: suit.suitPower,
          rank: rank.label,
          power: rank.power
        });
      });
    });
    for (let jokerIndex = 0; jokerIndex < 2; jokerIndex += 1) {
      deck.push({
        id: deckIndex + "_JOKER_" + jokerIndex + "_" + Math.random().toString(36).slice(2, 7),
        suit: "",
        suitCode: "JOKER",
        suitPower: 4,
        rank: "JOKER",
        power: 13
      });
    }
  }
  return deck;
}

export function shuffleDeck(cards) {
  const deck = cards.slice();
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
  return deck;
}

export function getEffectiveRevolution(game) {
  return !!(game && game.revolution) !== !!(game && game.jackBackActive);
}

export function getCardOrderValue(card) {
  if (!card) return -1;
  if (card.rank === "JOKER") return 13;
  return Number(card.power) || 0;
}

export function getRankLabelFromPower(power) {
  const found = ranks.find(function(rank) { return rank.power === power; });
  return found ? found.label : "?";
}

export function getPlayStrengthScore(comparePower, reversed) {
  if (comparePower === 13) return 999;
  return reversed ? (12 - comparePower) : comparePower;
}

export function sortCards(cards, reversed) {
  return (cards || []).slice().sort(function(a, b) {
    const aValue = getCardOrderValue(a);
    const bValue = getCardOrderValue(b);
    const rankDiff = reversed ? aValue - bValue : bValue - aValue;
    if (rankDiff !== 0) return rankDiff;
    const suitDiff = reversed ? (a.suitPower || 0) - (b.suitPower || 0) : (b.suitPower || 0) - (a.suitPower || 0);
    if (suitDiff !== 0) return suitDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function sortHandCards(cards) {
  return (cards || []).slice().sort(function(a, b) {
    const rankDiff = getCardOrderValue(a) - getCardOrderValue(b);
    if (rankDiff !== 0) return rankDiff;
    const suitDiff = (a.suitPower || 0) - (b.suitPower || 0);
    if (suitDiff !== 0) return suitDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function getCurrentHand(game, targetId) {
  return Array.isArray(game && game.hands && game.hands[targetId]) ? game.hands[targetId] : [];
}

export function getTradeState(game) {
  return game && game.tradeState && typeof game.tradeState === "object" ? game.tradeState : null;
}

export function getTradePairForPlayer(game, targetId) {
  const tradeState = getTradeState(game);
  if (!tradeState || !Array.isArray(tradeState.pairs)) return null;
  return tradeState.pairs.find(function(pair) { return pair.fromPlayerId === targetId; }) || null;
}

export function getTradeTitle(rank, count) {
  if (count <= 1) return "交換なし";
  if (rank === 0) return "大富豪";
  if (rank === 1) return "富豪";
  if (rank === count - 2) return "貧民";
  if (rank === count - 1) return "大貧民";
  return "平民";
}

export function getTradeOrderFromLastResult(lastResult, members) {
  const memberIds = (members || []).map(function(member) { return member.id; });
  const baseOrder = lastResult && Array.isArray(lastResult.finishOrder)
    ? lastResult.finishOrder.filter(function(id) { return memberIds.includes(id); })
    : [];
  memberIds.forEach(function(id) {
    if (!baseOrder.includes(id)) baseOrder.push(id);
  });
  const miyakoPlayerId = lastResult && lastResult.miyakoOchiPlayerId ? lastResult.miyakoOchiPlayerId : "";
  if (!miyakoPlayerId || !memberIds.includes(miyakoPlayerId)) return baseOrder;
  const withoutMiyako = baseOrder.filter(function(id) { return id !== miyakoPlayerId; });
  withoutMiyako.push(miyakoPlayerId);
  return withoutMiyako;
}

export function getStartPlayerIdFromLastResult(lastResult, members) {
  const order = getTradeOrderFromLastResult(lastResult, members);
  return order.length ? order[order.length - 1] : "";
}

export function getTradeRoleMap(lastResult, members) {
  const memberList = Array.isArray(members) ? members : [];
  const roleMap = {};
  const hasLastResult = !!(lastResult && Array.isArray(lastResult.finishOrder) && lastResult.finishOrder.length);
  if (!hasLastResult) {
    memberList.forEach(function(member) {
      roleMap[member.id] = "平民";
    });
    return roleMap;
  }
  const order = getTradeOrderFromLastResult(lastResult, memberList);
  const count = order.length;
  order.forEach(function(id, index) {
    roleMap[id] = getTradeTitle(index, count);
  });
  memberList.forEach(function(member) {
    if (!roleMap[member.id]) roleMap[member.id] = "平民";
  });
  return roleMap;
}

export function getStrongestCardIds(cards, count) {
  return sortHandCards(cards).slice(-count).map(function(card) { return card.id; });
}

export function getWeakestCardIds(cards, count) {
  return sortHandCards(cards).slice(0, count).map(function(card) { return card.id; });
}

export function getActivePlayerIds(game) {
  const finished = new Set(game && Array.isArray(game.finishOrder) ? game.finishOrder : []);
  return (game && Array.isArray(game.turnOrder) ? game.turnOrder : []).filter(function(id) { return !finished.has(id); });
}

export function removeCardsByIds(cards, ids) {
  const setIds = new Set(ids);
  return (cards || []).filter(function(card) { return !setIds.has(card.id); });
}

export function getNextActivePlayer(order, finishOrder, fromId, direction, skipIds, steps) {
  const orderList = Array.isArray(order) ? order : [];
  if (!orderList.length) return "";
  const finished = new Set(Array.isArray(finishOrder) ? finishOrder : []);
  const skipped = new Set(Array.isArray(skipIds) ? skipIds : []);
  let index = orderList.indexOf(fromId);
  if (index < 0) index = 0;
  const need = Math.max(1, steps || 1);
  let found = 0;
  const dir = direction === -1 ? -1 : 1;
  for (let loop = 0; loop < orderList.length * (need + 3); loop += 1) {
    index = (index + dir + orderList.length) % orderList.length;
    const candidate = orderList[index];
    if (finished.has(candidate) || skipped.has(candidate)) continue;
    found += 1;
    if (found >= need) return candidate;
  }
  return "";
}

export function getSkippedPlayerIds(order, finishOrder, fromId, direction, skipIds, steps) {
  const orderList = Array.isArray(order) ? order : [];
  if (!orderList.length) return [];
  const finished = new Set(Array.isArray(finishOrder) ? finishOrder : []);
  const skipped = new Set(Array.isArray(skipIds) ? skipIds : []);
  let index = orderList.indexOf(fromId);
  if (index < 0) index = 0;
  const need = Math.max(0, steps || 0);
  const result = [];
  const dir = direction === -1 ? -1 : 1;
  for (let loop = 0; loop < orderList.length * (need + 3); loop += 1) {
    if (result.length >= need) break;
    index = (index + dir + orderList.length) % orderList.length;
    const candidate = orderList[index];
    if (finished.has(candidate) || skipped.has(candidate)) continue;
    result.push(candidate);
  }
  return result;
}

function chooseCombinations(array, count) {
  if (count <= 0) return [[]];
  if (!Array.isArray(array) || array.length < count) return [];
  const result = [];
  function walk(start, picked) {
    if (picked.length === count) {
      result.push(picked.slice());
      return;
    }
    for (let i = start; i < array.length; i += 1) {
      picked.push(array[i]);
      walk(i + 1, picked);
      picked.pop();
    }
  }
  walk(0, []);
  return result;
}

export function analyzePlay(cards, settings) {
  const list = (cards || []).slice();
  if (!list.length) return { ok: false, reason: "カードが選ばれていません" };
  const sorted = list.slice().sort(function(a, b) {
    const aValue = getCardOrderValue(a);
    const bValue = getCardOrderValue(b);
    if (aValue !== bValue) return aValue - bValue;
    if ((a.suitPower || 0) !== (b.suitPower || 0)) return (a.suitPower || 0) - (b.suitPower || 0);
    return String(a.id).localeCompare(String(b.id));
  });
  const jokers = sorted.filter(function(card) { return card.rank === "JOKER"; });
  const normalCards = sorted.filter(function(card) { return card.rank !== "JOKER"; });

  if (!normalCards.length) {
    return {
      ok: true,
      type: "group",
      cards: sorted,
      length: sorted.length,
      comparePower: 13,
      suitKey: sorted.map(function(card) { return card.suitCode || ""; }).sort().join("|"),
      rankKey: sorted.map(function() { return "JOKER"; }).join("|")
    };
  }

  const sameRank = normalCards.every(function(card) { return card.rank === normalCards[0].rank; });
  if (sameRank) {
    const rankValue = getCardOrderValue(normalCards[0]);
    return {
      ok: true,
      type: "group",
      cards: sorted,
      length: sorted.length,
      comparePower: rankValue,
      suitKey: sorted.map(function(card) { return card.suitCode || ""; }).sort().join("|"),
      rankKey: sorted.map(function() { return normalCards[0].rank; }).join("|")
    };
  }

  if (settings.stairsEnabled && sorted.length >= 3) {
    const baseSuit = normalCards[0].suitCode;
    const sameSuit = normalCards.every(function(card) { return card.suitCode === baseSuit; });
    if (sameSuit) {
      const uniquePowers = Array.from(new Set(normalCards.map(function(card) { return getCardOrderValue(card); }))).sort(function(a, b) { return a - b; });
      if (uniquePowers.length === normalCards.length) {
        const minPower = uniquePowers[0];
        const maxPower = uniquePowers[uniquePowers.length - 1];
        const neededInside = (maxPower - minPower + 1) - uniquePowers.length;
        const remainingJokers = jokers.length - neededInside;
        if (neededInside <= jokers.length && remainingJokers >= 0) {
          const canExpandLow = minPower - remainingJokers >= 0;
          const comparePower = canExpandLow ? maxPower : maxPower + remainingJokers;
          return {
            ok: true,
            type: "stairs",
            cards: sorted,
            length: sorted.length,
            comparePower: comparePower,
            suitKey: sorted.map(function() { return baseSuit; }).join("|"),
            rankKey: sorted.map(function(card) { return card.rank === "JOKER" ? "*" : card.rank; }).join("|")
          };
        }
      }
    }
  }

  return { ok: false, reason: "同じ数字か階段だけ出せます" };
}

export function validatePlaySelection(cards, game, settings) {
  const play = analyzePlay(cards, settings);
  if (!play.ok) return { ok: false, reason: play.reason };
  const lastPlay = game && game.lastPlay ? game.lastPlay : null;
  const hasJoker = (cards || []).some(function(card) { return card && card.rank === "JOKER"; });
  if (game && game.lockedSuitKey && !hasJoker && play.suitKey !== game.lockedSuitKey) return { ok: false, reason: "マーク縛り中です" };
  if (game && typeof game.numberLockKey === "number" && !hasJoker && play.comparePower !== game.numberLockKey) return { ok: false, reason: "数字縛り中です" };
  if (!lastPlay) return { ok: true, play: play };
  const isSpadeThreeReturn = !!(
    lastPlay.type === "group"
    && lastPlay.length === 1
    && lastPlay.comparePower === 13
    && cards
    && cards.length === 1
    && cards[0]
    && cards[0].rank === "3"
    && cards[0].suitCode === "S"
  );
  if (settings.spadeThreeReturnEnabled && isSpadeThreeReturn) return { ok: true, play: play };
  if (play.type !== lastPlay.type) return { ok: false, reason: "同じ種類で出してください" };
  if (play.length !== lastPlay.length) return { ok: false, reason: "同じ枚数で出してください" };
  const reversed = getEffectiveRevolution(game);
  const stronger = getPlayStrengthScore(play.comparePower, reversed) > getPlayStrengthScore(lastPlay.comparePower, reversed);
  if (!stronger) return { ok: false, reason: "もっと強いカードが必要です" };
  return { ok: true, play: play };
}

function generateGroupCandidates(hand, requiredLength) {
  const jokerCards = (hand || []).filter(function(card) { return card.rank === "JOKER"; });
  const normalCards = (hand || []).filter(function(card) { return card.rank !== "JOKER"; });
  const map = {};
  normalCards.forEach(function(card) {
    if (!map[card.rank]) map[card.rank] = [];
    map[card.rank].push(card);
  });
  const result = [];
  Object.keys(map).forEach(function(rank) {
    const list = map[rank];
    const minLen = requiredLength || 1;
    const maxLen = requiredLength || Math.min(list.length + jokerCards.length, 4);
    for (let len = minLen; len <= maxLen; len += 1) {
      const needJoker = Math.max(0, len - list.length);
      if (needJoker > jokerCards.length) continue;
      const useNormal = len - needJoker;
      chooseCombinations(list, useNormal).forEach(function(combo) {
        if (!combo.length && len > 0) return;
        chooseCombinations(jokerCards, needJoker).forEach(function(jokers) {
          result.push(combo.concat(jokers));
        });
      });
    }
  });
  if (!requiredLength) {
    for (let len = 1; len <= jokerCards.length; len += 1) {
      chooseCombinations(jokerCards, len).forEach(function(combo) {
        result.push(combo);
      });
    }
  } else if (requiredLength <= jokerCards.length) {
    chooseCombinations(jokerCards, requiredLength).forEach(function(combo) {
      result.push(combo);
    });
  }
  return result;
}

function generateStairCandidates(hand, requiredLength) {
  const jokerCards = (hand || []).filter(function(card) { return card.rank === "JOKER"; });
  const suitMap = {};
  (hand || []).forEach(function(card) {
    if (card.rank === "JOKER") return;
    if (!suitMap[card.suitCode]) suitMap[card.suitCode] = [];
    suitMap[card.suitCode].push(card);
  });
  const result = [];
  Object.keys(suitMap).forEach(function(suitCode) {
    const cards = suitMap[suitCode].slice().sort(function(a, b) {
      const aValue = getCardOrderValue(a);
      const bValue = getCardOrderValue(b);
      if (aValue !== bValue) return aValue - bValue;
      return String(a.id).localeCompare(String(b.id));
    });
    const unique = [];
    const seen = new Set();
    cards.forEach(function(card) {
      const value = getCardOrderValue(card);
      if (!seen.has(value)) {
        unique.push(card);
        seen.add(value);
      }
    });
    const minLen = requiredLength || 3;
    const maxLen = requiredLength || Math.min(unique.length + jokerCards.length, 13);
    for (let len = minLen; len <= maxLen; len += 1) {
      for (let start = 0; start <= 12; start += 1) {
        const end = start + len - 1;
        if (end > 12) break;
        const picked = [];
        const used = new Set();
        for (let value = start; value <= end; value += 1) {
          const found = unique.find(function(card) {
            return !used.has(card.id) && getCardOrderValue(card) === value;
          });
          if (found) {
            picked.push(found);
            used.add(found.id);
          }
        }
        const needJoker = len - picked.length;
        if (needJoker > jokerCards.length) continue;
        chooseCombinations(jokerCards, needJoker).forEach(function(jokers) {
          result.push(picked.concat(jokers));
        });
      }
    }
  });
  return result;
}

function generateCandidateSets(hand, settings, game) {
  const lastPlay = game && game.lastPlay ? game.lastPlay : null;
  const requiredLength = lastPlay ? lastPlay.length : 0;
  const requiredType = lastPlay ? lastPlay.type : "";
  let candidates = [];
  if (!requiredType || requiredType === "group") candidates = candidates.concat(generateGroupCandidates(hand, requiredLength || 0));
  if (settings.stairsEnabled && (!requiredType || requiredType === "stairs")) candidates = candidates.concat(generateStairCandidates(hand, requiredLength || 0));
  const dedupe = new Map();
  candidates.forEach(function(set) {
    const key = set.map(function(card) { return card.id; }).sort().join("|");
    if (!dedupe.has(key)) dedupe.set(key, set);
  });
  return Array.from(dedupe.values());
}

export function getEffectivePlayedRanks(play, cards) {
  if (!play || !Array.isArray(cards) || !cards.length) return [];
  if (play.type === "group") {
    if (play.comparePower === 13) {
      return cards.map(function() { return "JOKER"; });
    }
    const label = getRankLabelFromPower(play.comparePower);
    return cards.map(function() { return label; });
  }
  if (play.type === "stairs") {
    const startPower = Math.max(0, play.comparePower - play.length + 1);
    const result = [];
    for (let power = startPower; power <= play.comparePower; power += 1) {
      result.push(getRankLabelFromPower(power));
    }
    return result;
  }
  return cards.map(function(card) { return card && card.rank ? card.rank : ""; });
}

export function isForbiddenAgariCard(card, reversed) {
  if (!card) return false;
  if (card.rank === "JOKER") return true;
  if (card.rank === "8") return true;
  if (!reversed && card.rank === "2") return true;
  if (reversed && card.rank === "3") return true;
  return false;
}

export function isForbiddenAgariCards(cards, reversed, enabled) {
  if (!enabled) return false;
  return (cards || []).some(function(card) {
    return isForbiddenAgariCard(card, reversed);
  });
}

export function chooseAutoCards(hand, game, settings) {
  const candidates = generateCandidateSets(hand, settings, game).map(function(cards) {
    return { cards: cards, check: validatePlaySelection(cards, game, settings) };
  }).filter(function(item) { return item.check.ok; });
  if (!candidates.length) return null;

  const reversed = getEffectiveRevolution(game);
  const foulAgariEnabled = !!(settings && settings.foulAgariEnabled);
  const handSize = Array.isArray(hand) ? hand.length : 0;
  const isOpening = !(game && game.lastPlay);

  candidates.sort(function(a, b) {
    const aRemain = Math.max(0, handSize - a.cards.length);
    const bRemain = Math.max(0, handSize - b.cards.length);
    const aForbiddenFinish = aRemain === 0 && isForbiddenAgariCards(a.cards, reversed, foulAgariEnabled);
    const bForbiddenFinish = bRemain === 0 && isForbiddenAgariCards(b.cards, reversed, foulAgariEnabled);
    if (aForbiddenFinish !== bForbiddenFinish) return aForbiddenFinish ? 1 : -1;

    const aFinish = aRemain === 0;
    const bFinish = bRemain === 0;
    if (aFinish !== bFinish) return aFinish ? -1 : 1;

    const aPlay = a.check.play;
    const bPlay = b.check.play;
    const aStrength = getPlayStrengthScore(aPlay.comparePower, reversed);
    const bStrength = getPlayStrengthScore(bPlay.comparePower, reversed);
    const aJokers = a.cards.filter(function(card) { return card.rank === "JOKER"; }).length;
    const bJokers = b.cards.filter(function(card) { return card.rank === "JOKER"; }).length;
    const aIsRevolution = (aPlay.type === "group" && aPlay.length >= 4) || (aPlay.type === "stairs" && aPlay.length >= 4);
    const bIsRevolution = (bPlay.type === "group" && bPlay.length >= 4) || (bPlay.type === "stairs" && bPlay.length >= 4);
    const aIsStairs = aPlay.type === "stairs";
    const bIsStairs = bPlay.type === "stairs";

    if (isOpening && handSize >= 6) {
      if (aIsRevolution !== bIsRevolution) return aIsRevolution ? -1 : 1;
      if (aPlay.length !== bPlay.length) return bPlay.length - aPlay.length;
      if (aIsStairs !== bIsStairs) return aIsStairs ? -1 : 1;
      if (aJokers !== bJokers) return aJokers - bJokers;
      if (aStrength !== bStrength) return aStrength - bStrength;
      return aRemain - bRemain;
    }

    if (handSize >= 8) {
      if (aIsRevolution !== bIsRevolution) return aIsRevolution ? -1 : 1;
      if (aPlay.length !== bPlay.length) return bPlay.length - aPlay.length;
      if (aIsStairs !== bIsStairs) return aIsStairs ? -1 : 1;
      if (aJokers !== bJokers) return aJokers - bJokers;
      if (aStrength !== bStrength) return aStrength - bStrength;
      return aRemain - bRemain;
    }

    if (handSize >= 5) {
      if (aRemain !== bRemain) return aRemain - bRemain;
      if (aPlay.length !== bPlay.length) return bPlay.length - aPlay.length;
      if (aIsStairs !== bIsStairs) return aIsStairs ? -1 : 1;
      if (aJokers !== bJokers) return aJokers - bJokers;
      if (aStrength !== bStrength) return aStrength - bStrength;
      return 0;
    }

    if (aRemain !== bRemain) return aRemain - bRemain;
    if (aStrength !== bStrength) return aStrength - bStrength;
    if (aPlay.length !== bPlay.length) return bPlay.length - aPlay.length;
    if (aJokers !== bJokers) return aJokers - bJokers;
    return 0;
  });

  return candidates[0].cards;
}

function insertFinishOrder(game, targetId, isFoul) {
  if (!Array.isArray(game.finishOrder)) game.finishOrder = [];
  const currentOrder = game.finishOrder.filter(function(id) { return id !== targetId; });
  const fallen = new Set(Array.isArray(game.fallenPlayerIds) ? game.fallenPlayerIds : []);
  const safeIndex = currentOrder.findIndex(function(id) { return fallen.has(id); });
  if (isFoul) {
    if (safeIndex < 0) currentOrder.push(targetId);
    else currentOrder.splice(safeIndex, 0, targetId);
    game.finishOrder = currentOrder;
    return;
  }
  if (safeIndex < 0) currentOrder.push(targetId);
  else currentOrder.splice(safeIndex, 0, targetId);
  game.finishOrder = currentOrder;
}

export function finalizePlayer(game, targetId, settings, isFoul) {
  if (!Array.isArray(game.finishOrder)) game.finishOrder = [];
  if (isFoul) {
    const fallen = new Set(Array.isArray(game.fallenPlayerIds) ? game.fallenPlayerIds : []);
    fallen.add(targetId);
    game.fallenPlayerIds = Array.from(fallen);
  }
  insertFinishOrder(game, targetId, isFoul);
  let miyakoDroppedPlayerId = "";
  if (settings.miyakoOchiEnabled && game.previousChampionId && !game.miyakoDropped && game.finishOrder.length === 1 && game.finishOrder[0] !== game.previousChampionId) {
    const fallen = new Set(Array.isArray(game.fallenPlayerIds) ? game.fallenPlayerIds : []);
    fallen.add(game.previousChampionId);
    game.fallenPlayerIds = Array.from(fallen);
    game.miyakoDropped = true;
    game.miyakoDroppedPlayerId = game.previousChampionId;
    miyakoDroppedPlayerId = game.previousChampionId;
    insertFinishOrder(game, game.previousChampionId, true);
  }
  return miyakoDroppedPlayerId;
}

export function maybeFinishGame(roomData, game, nowMs) {
  const active = getActivePlayerIds(game);
  if (active.length > 1) return null;
  if (active.length === 1 && !game.finishOrder.includes(active[0])) insertFinishOrder(game, active[0], false);
  game.phase = "finished";
  game.currentTurnPlayerId = "";
  game.currentTurnStartedAtMs = 0;
  game.pendingSevenPass = null;
  game.pendingClearField = null;
  game.lockedSuitKey = "";
  game.numberLockKey = null;
  return {
    topPlayerId: game.finishOrder[0] || "",
    finishOrder: game.finishOrder || [],
    fallenPlayerIds: game.fallenPlayerIds || [],
    miyakoOchiPlayerId: game.miyakoDroppedPlayerId || "",
    roundNumber: ((roomData && roomData.lastResult && roomData.lastResult.roundNumber) || 0) + 1,
    finishedAtMs: nowMs()
  };
}

export function clearField(game, leaderId, nowMs, isCpuId) {
  game.lastPlay = null;
  game.lastPlayPlayerId = "";
  game.passedPlayerIds = [];
  game.lockedSuitKey = "";
  game.numberLockKey = null;
  game.jackBackActive = false;
  game.resolvedField = null;
  game.pendingClearField = null;
  game.ruleEffectState = null;
  game.currentTurnPlayerId = leaderId || "";
  game.currentTurnStartedAtMs = nowMs();
  game.cpuActionAtMs = isCpuId(game.currentTurnPlayerId) ? nowMs() + 1000 : 0;
}

export function beginEightCutDelay(game, leaderId, actionText, nowMs, delayMs) {
  game.pendingClearField = {
    executeAtMs: nowMs() + delayMs,
    nextPlayerId: leaderId || ""
  };
  game.currentTurnPlayerId = "";
  game.currentTurnStartedAtMs = 0;
  game.lastActionText = actionText;
}

export function advanceTurn(game, fromId, extraSteps, skipIds, nowMs, isCpuId) {
  game.currentTurnPlayerId = getNextActivePlayer(game.turnOrder, game.finishOrder, fromId, game.direction, skipIds || [], Math.max(1, 1 + (extraSteps || 0))) || "";
  game.currentTurnStartedAtMs = nowMs();
  game.cpuActionAtMs = isCpuId(game.currentTurnPlayerId) ? nowMs() + 1000 : 0;
}

export function getFiveSkipExtraSteps(fiveCount) {
  return fiveCount > 0 ? fiveCount : 0;
}

export function buildRuleEffectState(effectNames, actorId, ruleEffectImageMap, nowMs) {
  const names = Array.isArray(effectNames)
    ? effectNames.filter(function(name) { return !!ruleEffectImageMap[name]; })
    : [];
  if (!names.length) return null;
  return {
    key: String(nowMs()) + "__" + String(actorId || "") + "__" + names.join("|"),
    names: names
  };
}

export function createMutatePlay(deps) {
  const {
    nowMs,
    getServerNowMs,
    normalizeRoomSettings,
    getHostPlayerId,
    isCpuId,
    mergeMembersWithCpu,
    getMemberName,
    ruleEffectImageMap,
    getRuleEffectLockUntilMs,
    eightCutDelayMs
  } = deps;

  const baseNowMs = typeof getServerNowMs === "function" ? getServerNowMs : nowMs;

  return function mutatePlay(roomData, actorId, cardIds, actionType) {
    const safeCardIds = Array.isArray(cardIds) ? cardIds : [];
    const game = roomData.gameData;
    const settings = normalizeRoomSettings(roomData.settings || (game && game.ruleSettings));
    const members = mergeMembersWithCpu(roomData.members, roomData.settings);
    if (!game || (game.phase !== "playing" && game.phase !== "trading")) throw new Error("ゲーム中ではありません");

    if (actionType === "transfer" && game.phase === "trading") {
      actionType = "trade";
    }
    if (actionType === "trade" && game.phase === "playing" && game.pendingSevenPass) {
      actionType = "transfer";
    }

    if (actionType === "resolveTrade") {
      const tradeState = getTradeState(game);
      if (!tradeState) return { ok: false };
      tradeState.pairs.forEach(function(pair) {
        if (pair.done) return;
        const hand = getCurrentHand(game, pair.fromPlayerId);
        const autoIds = getWeakestCardIds(hand, pair.count);
        pair.selectedGiveCards = hand.filter(function(card) { return autoIds.includes(card.id); });
        pair.done = true;
      });
      const tradeResultMap = {};
      tradeState.pairs.forEach(function(pair) {
        const giveIds = pair.selectedGiveCards.map(function(card) { return card.id; });
        const giveCards = getCurrentHand(game, pair.fromPlayerId).filter(function(card) { return giveIds.includes(card.id); });
        game.hands[pair.fromPlayerId] = sortHandCards(removeCardsByIds(getCurrentHand(game, pair.fromPlayerId), giveIds).concat(pair.forcedReturnCards || []));
        game.hands[pair.toPlayerId] = sortHandCards(getCurrentHand(game, pair.toPlayerId).concat(giveCards));
        tradeResultMap[pair.fromPlayerId] = {
          toPlayerId: pair.toPlayerId,
          givenCards: giveCards.slice(),
          receivedCards: (pair.forcedReturnCards || []).slice(),
          count: pair.count
        };
        tradeResultMap[pair.toPlayerId] = {
          fromPlayerId: pair.fromPlayerId,
          receivedCards: giveCards.slice(),
          returnedCards: (pair.forcedReturnCards || []).slice(),
          count: pair.count
        };
      });
      game.lastTradeResult = {
        finishedAtMs: baseNowMs(),
        players: tradeResultMap
      };
      game.tradeState = null;
      game.phase = "playing";
      game.currentTurnPlayerId = game.turnOrder[0] || "";
      game.currentTurnStartedAtMs = baseNowMs();
      game.cpuActionAtMs = isCpuId(game.currentTurnPlayerId) ? baseNowMs() + 1000 : 0;
      game.lastActionText = "カード交換完了";
      game.ruleEffectState = null;
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    if (actionType === "trade") {
      const tradeState = getTradeState(game);
      if (!tradeState) throw new Error("交換中ではありません");
      const pair = tradeState.pairs.find(function(item) { return item.fromPlayerId === actorId; });
      if (!pair || pair.done) throw new Error("今は交換できません");
      if (safeCardIds.length !== pair.count) throw new Error(pair.count + "枚選んでください");
      const hand = getCurrentHand(game, actorId);
      const giveCards = hand.filter(function(card) { return safeCardIds.includes(card.id); });
      if (giveCards.length !== pair.count) throw new Error("渡すカードが足りません");
      pair.selectedGiveCards = giveCards;
      pair.done = true;
      if (tradeState.pairs.every(function(item) { return item.done; })) {
        return mutatePlay(roomData, actorId, [], "resolveTrade");
      }
      game.lastActionText = getMemberName(actorId, members) + " が交換カードを選びました";
      game.ruleEffectState = null;
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    if (!Array.isArray(game.finishOrder)) game.finishOrder = [];
    if (!Array.isArray(game.passedPlayerIds)) game.passedPlayerIds = [];
    if (!Array.isArray(game.turnOrder)) game.turnOrder = [];
    if (!game.hands || typeof game.hands !== "object") game.hands = {};
    if (typeof game.lockedSuitKey !== "string") game.lockedSuitKey = "";
    if (game.numberLockKey !== null && typeof game.numberLockKey !== "number") game.numberLockKey = null;
    if (typeof game.lastPlayPlayerId !== "string") game.lastPlayPlayerId = "";
    if (typeof game.pendingRuleEffectUntilMs !== "number") game.pendingRuleEffectUntilMs = 0;
    if (game.pendingRuleEffectUntilMs && baseNowMs() >= game.pendingRuleEffectUntilMs) {
      game.pendingRuleEffectUntilMs = 0;
      game.ruleEffectState = null;
    }

    if (actionType === "resolveEightCut") {
      if (!game.pendingClearField || baseNowMs() < game.pendingClearField.executeAtMs) return { ok: false };
      const nextPlayerId = game.pendingClearField.nextPlayerId || "";
      clearField(game, nextPlayerId, baseNowMs, isCpuId);
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    if (actionType === "timeout" || actionType === "auto") {
      const limit = (game.turnTimeSeconds || settings.turnTimeSeconds || 30) * 1000;
      if (actionType === "timeout") {
        if (!game.currentTurnStartedAtMs || baseNowMs() - game.currentTurnStartedAtMs < limit) return { ok: false };
        if (getHostPlayerId(roomData.members) !== actorId) return { ok: false };
      }
      if (game.pendingSevenPass) {
        const fromHand = getCurrentHand(game, game.pendingSevenPass.fromPlayerId);
        const giveIds = sortHandCards(fromHand).slice(0, game.pendingSevenPass.count).map(function(card) { return card.id; });
        return mutatePlay(roomData, game.pendingSevenPass.fromPlayerId, giveIds, "transfer");
      }
      const hand = getCurrentHand(game, game.currentTurnPlayerId);
      const autoCards = chooseAutoCards(hand, game, settings);
      if (autoCards && autoCards.length) {
        return mutatePlay(roomData, game.currentTurnPlayerId, autoCards.map(function(card) { return card.id; }), "play");
      }
      if (game.lastPlay) {
        return mutatePlay(roomData, game.currentTurnPlayerId, [], "pass");
      }
      const weakest = sortHandCards(hand).slice(0, 1).map(function(card) { return card.id; });
      return mutatePlay(roomData, game.currentTurnPlayerId, weakest, "play");
    }

    if (game.pendingClearField) throw new Error("8切り処理中です");

    if (actionType === "pass") {
      if (game.pendingSevenPass) throw new Error("先に7渡しを終えてください");
      if (!game.lastPlay) throw new Error("場札がないのでパスできません");
      if (game.currentTurnPlayerId !== actorId) throw new Error("今の手番ではありません");
      const passed = new Set(Array.isArray(game.passedPlayerIds) ? game.passedPlayerIds : []);
      passed.add(actorId);
      game.passedPlayerIds = Array.from(passed);
      const activeIds = getActivePlayerIds(game);
      if (game.passedPlayerIds.length >= Math.max(0, activeIds.length - 1)) {
        const leader = activeIds.includes(game.lastPlayPlayerId)
          ? game.lastPlayPlayerId
          : getNextActivePlayer(game.turnOrder, game.finishOrder, game.lastPlayPlayerId || actorId, game.direction, [], 1);
        clearField(game, leader, baseNowMs, isCpuId);
        game.lastActionText = getMemberName(actorId, members) + " がパス / 場が流れました";
        game.ruleEffectState = null;
      } else {
        advanceTurn(game, actorId, 0, game.passedPlayerIds, baseNowMs, isCpuId);
        game.lastActionText = getMemberName(actorId, members) + " がパス";
        game.ruleEffectState = null;
      }
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    if (actionType === "transfer") {
      if (!game.pendingSevenPass) throw new Error("7渡し中ではありません");
      if (game.pendingSevenPass.fromPlayerId !== actorId) throw new Error("渡せるのは発動した本人だけです");
      if (safeCardIds.length !== game.pendingSevenPass.count) throw new Error(game.pendingSevenPass.count + "枚選んでください");
      const fromHand = getCurrentHand(game, actorId);
      const giveCards = fromHand.filter(function(card) { return safeCardIds.includes(card.id); });
      if (giveCards.length !== game.pendingSevenPass.count) throw new Error("渡すカードが足りません");
      const pending = game.pendingSevenPass;
      if (pending.mode === "tenDump") {
        game.hands[actorId] = sortHandCards(removeCardsByIds(fromHand, safeCardIds));
        game.pendingSevenPass = null;
        let miyakoDroppedPlayerId = "";
        const foulFinish = !game.hands[actorId].length && isForbiddenAgariCards((game.lastPlay && game.lastPlay.cards) || [], getEffectiveRevolution(game), settings.foulAgariEnabled);
        if (!game.hands[actorId].length) miyakoDroppedPlayerId = finalizePlayer(game, actorId, settings, foulFinish);
        const lastResult = maybeFinishGame(roomData, game, baseNowMs);
        if (lastResult) {
          game.lastActionText = getMemberName(actorId, members) + (foulFinish ? " が10捨てを完了しました / 反則上がり" : " が10捨てを完了して上がりました") + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
          game.ruleEffectState = null;
          roomData.lastResult = lastResult;
          roomData.gameData = game;
          return { ok: true, room: roomData };
        }
        if (pending.eightCut) {
          const leader = game.finishOrder.includes(actorId) ? getNextActivePlayer(game.turnOrder, game.finishOrder, actorId, game.direction, [], 1) : actorId;
          game.resolvedField = {
            playerId: game.lastPlay.playerId,
            cards: game.lastPlay.cards,
            reason: pending.clearReason || "8切り"
          };
          beginEightCutDelay(game, leader, getMemberName(actorId, members) + " が10捨てを完了 / " + (pending.clearReason || "8切り") + "で場を流しました" + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : ""), baseNowMs, eightCutDelayMs);
          game.ruleEffectState = null;
        } else {
          game.passedPlayerIds = getSkippedPlayerIds(game.turnOrder, game.finishOrder, actorId, game.direction, [], pending.skipCount || 0);
          advanceTurn(game, actorId, pending.skipCount || 0, [], baseNowMs, isCpuId);
          if (game.currentTurnPlayerId === actorId) {
            clearField(game, actorId, baseNowMs, isCpuId);
            game.lastActionText = getMemberName(actorId, members) + " が10捨てを完了 / 場が流れました" + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
          } else {
            game.lastActionText = getMemberName(actorId, members) + " が10捨てを完了" + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
          }
          game.ruleEffectState = null;
        }
        roomData.gameData = game;
        return { ok: true, room: roomData };
      }
      const targetId = game.pendingSevenPass.toPlayerId;
      game.hands[actorId] = sortHandCards(removeCardsByIds(fromHand, safeCardIds));
      game.hands[targetId] = sortHandCards(getCurrentHand(game, targetId).concat(giveCards));
      const resolvedField = pending.eightCut && game.lastPlay ? {
        playerId: game.lastPlay.playerId,
        cards: game.lastPlay.cards,
        reason: pending.clearReason || "8切り"
      } : null;
      game.pendingSevenPass = null;
      let miyakoDroppedPlayerId = "";
      const foulFinish = !game.hands[actorId].length && isForbiddenAgariCards((game.lastPlay && game.lastPlay.cards) || [], getEffectiveRevolution(game), settings.foulAgariEnabled);
      if (!game.hands[actorId].length) miyakoDroppedPlayerId = finalizePlayer(game, actorId, settings, foulFinish);
      const lastResult = maybeFinishGame(roomData, game, baseNowMs);
      if (lastResult) {
        game.lastActionText = getMemberName(actorId, members) + (foulFinish ? " が渡し終えました / 反則上がり" : " が渡し終えて上がりました") + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
        game.ruleEffectState = null;
        roomData.lastResult = lastResult;
        roomData.gameData = game;
        return { ok: true, room: roomData };
      }
      if (pending.eightCut) {
        const leader = game.finishOrder.includes(actorId) ? getNextActivePlayer(game.turnOrder, game.finishOrder, actorId, game.direction, [], 1) : actorId;
        game.resolvedField = resolvedField;
        beginEightCutDelay(game, leader, getMemberName(actorId, members) + " が7渡しを完了 / " + (pending.clearReason || "8切り") + "で場を流しました" + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : ""), baseNowMs, eightCutDelayMs);
        game.ruleEffectState = null;
      } else {
        game.passedPlayerIds = getSkippedPlayerIds(game.turnOrder, game.finishOrder, actorId, game.direction, [], pending.skipCount || 0);
        advanceTurn(game, actorId, pending.skipCount || 0, [], baseNowMs, isCpuId);
        if (game.currentTurnPlayerId === actorId) {
          clearField(game, actorId, baseNowMs, isCpuId);
          game.lastActionText = getMemberName(actorId, members) + " が " + getMemberName(targetId, members) + " にカードを渡しました / 場が流れました" + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
        } else {
          game.lastActionText = getMemberName(actorId, members) + " が " + getMemberName(targetId, members) + " にカードを渡しました" + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
        }
        game.ruleEffectState = null;
      }
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    if (game.pendingSevenPass) throw new Error("先に7渡しを終えてください");
    if (game.currentTurnPlayerId !== actorId) throw new Error("今の手番ではありません");
    const hand = getCurrentHand(game, actorId);
    const cards = hand.filter(function(card) { return safeCardIds.includes(card.id); });
    if (cards.length !== safeCardIds.length) throw new Error("手札にないカードです");
    const checked = validatePlaySelection(cards, game, settings);
    if (!checked.ok) throw new Error(checked.reason);
    const play = checked.play;
    const beforeLastPlay = game.lastPlay;
    const spadeThreeReturnTriggered = !!(
      settings.spadeThreeReturnEnabled
      && beforeLastPlay
      && beforeLastPlay.type === "group"
      && beforeLastPlay.length === 1
      && beforeLastPlay.comparePower === 13
      && cards.length === 1
      && cards[0]
      && cards[0].rank === "3"
      && cards[0].suitCode === "S"
    );
    const previousLockedSuitKey = game.lockedSuitKey || "";
    const previousNumberLockKey = typeof game.numberLockKey === "number" ? game.numberLockKey : null;
    const previousEffectiveRevolution = getEffectiveRevolution(game);
    let forbiddenAgari = false;
    const playedRanks = cards.map(function(card) { return card.rank; });
    const effectivePlayedRanks = getEffectivePlayedRanks(play, cards);
    const messageParts = [];
    game.hands[actorId] = removeCardsByIds(hand, safeCardIds);
    game.lastPlay = {
      type: play.type,
      cards: cards,
      length: play.length,
      comparePower: play.comparePower,
      suitKey: play.suitKey,
      rankKey: play.rankKey,
      playerId: actorId,
      playedAtMs: baseNowMs()
    };
    game.lastPlayPlayerId = actorId;
    game.passedPlayerIds = [];
    game.pendingSevenPass = null;
    game.resolvedField = null;
    game.lockedSuitKey = "";
    if (settings.lockEnabled && beforeLastPlay && beforeLastPlay.suitKey === play.suitKey) {
      game.lockedSuitKey = play.suitKey;
      if (!previousLockedSuitKey) messageParts.push("マーク縛り");
    }
    if (settings.revolutionEnabled && play.type === "group" && play.length >= 4) {
      game.revolution = !game.revolution;
      messageParts.push("革命");
    }
    if (settings.stairsRevolutionEnabled && play.type === "stairs" && play.length >= 4) {
      game.revolution = !game.revolution;
      messageParts.push("階段革命");
    }
    if (settings.jackBackEnabled && effectivePlayedRanks.includes("J")) {
      game.jackBackActive = !game.jackBackActive;
      messageParts.push("Jバック");
    }
    if (settings.sixReverseEnabled && effectivePlayedRanks.includes("6")) {
      game.direction = game.direction === -1 ? 1 : -1;
      messageParts.push("6リバース");
    }
    game.numberLockKey = null;
    if (settings.numberLockEnabled && beforeLastPlay && beforeLastPlay.type === play.type && beforeLastPlay.length === play.length) {
      const previousStep = previousEffectiveRevolution ? -1 : 1;
      const nextStep = getEffectiveRevolution(game) ? -1 : 1;
      if (play.comparePower === beforeLastPlay.comparePower + previousStep) {
        const nextRequired = play.comparePower + nextStep;
        if (nextRequired >= 0 && nextRequired <= 12) {
          game.numberLockKey = nextRequired;
          if (previousNumberLockKey === null) messageParts.push("数字縛り");
        }
      }
    }
    const fiveCount = settings.skipFiveEnabled ? effectivePlayedRanks.filter(function(rank) { return rank === "5"; }).length : 0;
    const fiveSkipExtraSteps = getFiveSkipExtraSteps(fiveCount);
    const fiveSkippedPlayerIds = getSkippedPlayerIds(game.turnOrder, game.finishOrder, actorId, game.direction, [], fiveSkipExtraSteps);
    if (fiveCount > 0) messageParts.push("5飛ばし");
    const tenCount = settings.tenDumpEnabled ? effectivePlayedRanks.filter(function(rank) { return rank === "10"; }).length : 0;
    if (tenCount > 0) messageParts.push("10捨て");
    const eightTriggered = settings.eightCutEnabled && effectivePlayedRanks.includes("8");
    if (eightTriggered) messageParts.push("8切");
    if (spadeThreeReturnTriggered) messageParts.push("スペ3返し");
    const ninetyNineCarTriggered = !!(
      settings.ninetyNineCarEnabled
      && play.type === "group"
      && play.length >= 2
      && effectivePlayedRanks.every(function(rank) { return rank === "9"; })
    );
    if (ninetyNineCarTriggered) messageParts.push("99車");
    const clearTriggered = eightTriggered || ninetyNineCarTriggered || spadeThreeReturnTriggered;
    const clearReason = spadeThreeReturnTriggered ? "スペ3返し" : (ninetyNineCarTriggered ? "99車" : "8切り");
    const sevenCount = settings.sevenPassEnabled ? effectivePlayedRanks.filter(function(rank) { return rank === "7"; }).length : 0;
    if (sevenCount > 0) messageParts.push("7渡し");
    const remainingHand = getCurrentHand(game, actorId);
    forbiddenAgari = !remainingHand.length && isForbiddenAgariCards(cards, getEffectiveRevolution(game), settings.foulAgariEnabled);
    const nextTarget = getNextActivePlayer(game.turnOrder, game.finishOrder, actorId, game.direction, [], 1);
    if (tenCount > 0 && remainingHand.length > 0) {
      game.passedPlayerIds = fiveSkippedPlayerIds.slice();
      game.pendingSevenPass = {
        mode: "tenDump",
        fromPlayerId: actorId,
        toPlayerId: actorId,
        count: Math.min(tenCount, remainingHand.length),
        skipCount: fiveSkipExtraSteps,
        eightCut: !!clearTriggered,
        clearReason: clearReason
      };
      game.currentTurnPlayerId = actorId;
      game.currentTurnStartedAtMs = baseNowMs();
      game.cpuActionAtMs = isCpuId(actorId) ? baseNowMs() + 1000 : 0;
      game.lastActionText = getMemberName(actorId, members) + " が 10捨てを発動" + (messageParts.length ? " / " + messageParts.join(" / ") : "");
      game.ruleEffectState = buildRuleEffectState(messageParts, actorId, ruleEffectImageMap, baseNowMs);
      game.pendingRuleEffectUntilMs = getRuleEffectLockUntilMs(messageParts);
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }
    if (sevenCount > 0 && remainingHand.length > 0 && nextTarget && nextTarget !== actorId) {
      game.passedPlayerIds = fiveSkippedPlayerIds.slice();
      game.pendingSevenPass = {
        fromPlayerId: actorId,
        toPlayerId: nextTarget,
        count: Math.min(sevenCount, remainingHand.length),
        skipCount: fiveSkipExtraSteps,
        eightCut: !!clearTriggered,
        clearReason: clearReason
      };
      game.currentTurnPlayerId = actorId;
      game.currentTurnStartedAtMs = baseNowMs();
      game.cpuActionAtMs = isCpuId(actorId) ? baseNowMs() + 1000 : 0;
      game.lastActionText = getMemberName(actorId, members) + " が 7渡しを発動" + (messageParts.length ? " / " + messageParts.join(" / ") : "");
      game.ruleEffectState = buildRuleEffectState(messageParts, actorId, ruleEffectImageMap, baseNowMs);
      game.pendingRuleEffectUntilMs = getRuleEffectLockUntilMs(messageParts);
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    let miyakoDroppedPlayerId = "";
    if (!remainingHand.length) miyakoDroppedPlayerId = finalizePlayer(game, actorId, settings, forbiddenAgari);
    const lastResult = maybeFinishGame(roomData, game, baseNowMs);
    if (lastResult) {
      game.lastActionText = getMemberName(actorId, members) + (forbiddenAgari ? " が反則上がり" : " が上がりました") + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
      game.ruleEffectState = buildRuleEffectState(messageParts, actorId, ruleEffectImageMap, baseNowMs);
      game.pendingRuleEffectUntilMs = getRuleEffectLockUntilMs(messageParts);
      roomData.lastResult = lastResult;
      roomData.gameData = game;
      return { ok: true, room: roomData };
    }

    if (clearTriggered) {
      const leader = game.finishOrder.includes(actorId) ? getNextActivePlayer(game.turnOrder, game.finishOrder, actorId, game.direction, [], 1) : actorId;
      game.resolvedField = {
        playerId: actorId,
        cards: cards,
        reason: clearReason
      };
      beginEightCutDelay(game, leader, getMemberName(actorId, members) + " が" + (spadeThreeReturnTriggered ? "スペ3返し" : (ninetyNineCarTriggered ? "99車" : "8切")) + "で場を流しました" + (messageParts.length ? " / " + messageParts.join(" / ") : "") + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : ""), baseNowMs, eightCutDelayMs);
      game.ruleEffectState = buildRuleEffectState(messageParts, actorId, ruleEffectImageMap, baseNowMs);
      game.pendingRuleEffectUntilMs = getRuleEffectLockUntilMs(messageParts);
    } else {
      game.passedPlayerIds = fiveSkippedPlayerIds.slice();
      advanceTurn(game, actorId, fiveSkipExtraSteps, [], baseNowMs, isCpuId);
      if (game.currentTurnPlayerId === actorId) {
        clearField(game, actorId, baseNowMs, isCpuId);
        game.lastActionText = getMemberName(actorId, members) + " がカードを出しました / 場が流れました" + (messageParts.length ? " / " + messageParts.join(" / ") : "") + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
      } else {
        game.lastActionText = getMemberName(actorId, members) + " がカードを出しました" + (messageParts.length ? " / " + messageParts.join(" / ") : "") + (miyakoDroppedPlayerId ? " / " + getMemberName(miyakoDroppedPlayerId, members) + " が都落ち" : "");
      }
      game.ruleEffectState = buildRuleEffectState(messageParts, actorId, ruleEffectImageMap, baseNowMs);
      game.pendingRuleEffectUntilMs = getRuleEffectLockUntilMs(messageParts);
    }

    roomData.gameData = game;
    return { ok: true, room: roomData };
  };
}
