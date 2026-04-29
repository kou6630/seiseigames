const HAND_NAMES = {
  PINZORO: "ピンゾロ",
  ARASHI: "アラシ",
  SHIGORO: "シゴロ",
  HIFUMI: "ヒフミ",
  MENASHI: "目なし",
};

const CPU_NAMES = ["CPU 1", "CPU 2", "CPU 3", "CPU 4", "CPU 5"];
const MAX_TOTAL_PLAYERS = 6;
const MAX_PLAYER_ROLLS = 3;

export function rollSingleDie() {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDiceSet(count = 3) {
  return Array.from({ length: count }, () => rollSingleDie());
}

export function sortDice(dice = []) {
  return [...dice].map(Number).sort((a, b) => a - b);
}

export function countDiceFaces(dice = []) {
  return sortDice(dice).reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function evaluateChinchiro(dice = []) {
  const sorted = sortDice(dice);
  const counts = countDiceFaces(sorted);
  const faces = Object.keys(counts).map(Number);
  const entries = Object.entries(counts).map(([face, count]) => ({ face: Number(face), count }));

  if (sorted.length !== 3 || sorted.some((value) => value < 1 || value > 6 || !Number.isInteger(value))) {
    return {
      dice: sorted,
      hand: "INVALID",
      handName: "不正",
      rank: -1,
      score: -1,
      strengthText: "判定不可",
      retry: false,
      payoutRate: 0,
    };
  }

  if (sorted[0] === 1 && sorted[1] === 1 && sorted[2] === 1) {
    return buildResult(sorted, "PINZORO", HAND_NAMES.PINZORO, 100, 100, "最強", false, 5);
  }

  if (entries.some((item) => item.count === 3)) {
    const tripleFace = entries.find((item) => item.count === 3)?.face || 0;
    return buildResult(
      sorted,
      "ARASHI",
      `${tripleFace}の${HAND_NAMES.ARASHI}`,
      90 + tripleFace,
      90 + tripleFace,
      `${tripleFace}ゾロ`,
      false,
      tripleFace === 1 ? 3 : 2,
    );
  }

  if (sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) {
    return buildResult(sorted, "SHIGORO", HAND_NAMES.SHIGORO, 80, 80, "強い役", false, 2);
  }

  if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
    return buildResult(sorted, "HIFUMI", HAND_NAMES.HIFUMI, 10, 10, "負け役", false, -2);
  }

  if (faces.length === 2) {
    const singleFace = entries.find((item) => item.count === 1)?.face || 0;
    return buildResult(
      sorted,
      "DEME",
      `${singleFace}の目`,
      20 + singleFace,
      singleFace,
      `${singleFace}点`,
      false,
      1,
    );
  }

  return buildResult(sorted, "MENASHI", HAND_NAMES.MENASHI, 0, 0, "振り直し", true, 0);
}

export function compareHands(leftResult, rightResult) {
  const left = normalizeResult(leftResult);
  const right = normalizeResult(rightResult);

  if (left.rank > right.rank) {
    return {
      winner: "left",
      loser: "right",
      draw: false,
      reason: `${left.handName} が ${right.handName} より強い`,
    };
  }

  if (left.rank < right.rank) {
    return {
      winner: "right",
      loser: "left",
      draw: false,
      reason: `${right.handName} が ${left.handName} より強い`,
    };
  }

  return {
    winner: "draw",
    loser: "draw",
    draw: true,
    reason: "引き分け",
  };
}

export function getBestOfRolls(rolls = []) {
  if (!Array.isArray(rolls) || !rolls.length) {
    return null;
  }

  const evaluated = rolls.map((dice) => evaluateChinchiro(dice));
  return evaluated.reduce((best, current) => {
    if (!best) return current;
    return current.rank > best.rank ? current : best;
  }, null);
}

export function createTurnResult(dice = [], turn = 1, maxTurn = MAX_PLAYER_ROLLS) {
  const safeTurn = Math.max(1, Math.min(Number(turn || 1), Number(maxTurn || MAX_PLAYER_ROLLS)));
  const safeMaxTurn = Math.max(1, Number(maxTurn || MAX_PLAYER_ROLLS));
  const result = evaluateChinchiro(dice);
  return {
    turn: safeTurn,
    maxTurn: safeMaxTurn,
    dice: result.dice,
    hand: result.hand,
    handName: result.handName,
    rank: result.rank,
    retry: result.retry && safeTurn < safeMaxTurn,
    finished: !result.retry || safeTurn >= safeMaxTurn,
    strengthText: result.strengthText,
    payoutRate: result.payoutRate,
    score: result.score,
  };
}

export function createPlayerRollState(history = [], maxTurn = MAX_PLAYER_ROLLS) {
  const rolls = Array.isArray(history) ? history : [];
  const safeMaxTurn = Math.max(1, Number(maxTurn || MAX_PLAYER_ROLLS));
  const last = rolls.length ? rolls[rolls.length - 1] : null;
  const finalResult = last && last.finished ? last : null;

  return {
    rolls,
    rollCount: rolls.length,
    maxTurn: safeMaxTurn,
    currentResult: last,
    finalResult,
    finished: Boolean(finalResult),
    canRoll: !finalResult && rolls.length < safeMaxTurn,
  };
}

export function createCpuDecision(history = [], maxTurn = MAX_PLAYER_ROLLS) {
  const state = createPlayerRollState(history, maxTurn);
  const turn = state.rollCount + 1;
  const last = state.currentResult;

  if (!last) {
    return { shouldRoll: true, reason: "初回", turn };
  }

  if (state.finished) {
    return { shouldRoll: false, reason: "役確定", turn };
  }

  if (!state.canRoll) {
    return { shouldRoll: false, reason: "上限", turn };
  }

  return { shouldRoll: true, reason: "目なし", turn };
}

export function normalizeCoin(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}

export function createCpuPlayers(count = 0, startOrder = 1, currentHumanCount = 1) {
  const humanCount = Math.max(1, Number(currentHumanCount || 1));
  const maxCpuCount = Math.max(0, MAX_TOTAL_PLAYERS - humanCount);
  const safeCount = Math.max(0, Math.min(maxCpuCount, Number(count || 0)));

  return Array.from({ length: safeCount }, (_, index) => {
    const order = startOrder + index;
    return {
      id: `cpu_${index + 1}`,
      name: CPU_NAMES[index] || `CPU ${index + 1}`,
      isCpu: true,
      avatarUrl: "",
      coin: 0,
      isParent: false,
      finalHandName: "未確定",
      joinedAt: Date.now() + index,
      order,
    };
  });
}

export function createHumanPlayer(data = {}, order = 1) {
  return {
    id: String(data.id || `player_${order}`),
    name: String(data.name || "参加者").trim() || "参加者",
    isCpu: false,
    avatarUrl: String(data.avatarUrl || "").trim(),
    coin: normalizeCoin(data.coin),
    isParent: false,
    finalHandName: "未確定",
    joinedAt: Number(data.joinedAt || Date.now()),
    order,
  };
}

export function assignParent(players = [], parentId = "") {
  return players.map((player, index) => {
    const nextPlayer = {
      ...player,
      order: Number(player.order || index + 1),
      isParent: false,
    };
    if (parentId) {
      nextPlayer.isParent = nextPlayer.id === parentId;
      return nextPlayer;
    }
    nextPlayer.isParent = index === 0;
    return nextPlayer;
  });
}

export function chooseRandomParent(players = []) {
  if (!Array.isArray(players) || !players.length) {
    return { players: [], parentId: "" };
  }

  const index = Math.floor(Math.random() * players.length);
  const parentId = String(players[index] && players[index].id || "");

  return {
    players: assignParent(players, parentId),
    parentId,
  };
}

export function rotateParent(players = []) {
  const next = chooseRandomParent(players);
  return next.players;
}

export function orderPlayersForRound(players = []) {
  if (!Array.isArray(players) || !players.length) return [];
  const parent = players.find((player) => player.isParent);
  const children = players.filter((player) => !player.isParent);
  return parent ? [parent, ...children] : [...players];
}

export function applyRoundResult(players = [], resultsMap = {}) {
  return players.map((player) => {
    const entry = resultsMap[player.id];
    const result = normalizeResult(entry);
    const rollCount = entry && typeof entry === "object" && Number(entry.rollCount || 0) > 0
      ? Number(entry.rollCount || 0)
      : 0;
    const label = result && result.handName ? result.handName : "未確定";
    return {
      ...player,
      finalHandName: rollCount ? `${label} / ${rollCount}回目` : label,
    };
  });
}

export function getPlayerById(players = [], playerId = "") {
  return players.find((player) => player.id === playerId) || null;
}

export function getParentPlayer(players = []) {
  return players.find((player) => player.isParent) || null;
}

export function rankRoundResults(resultsMap = {}) {
  const entries = Object.entries(resultsMap)
    .map(([playerId, result]) => ({ playerId, result: normalizeResult(result) }))
    .sort((left, right) => right.result.rank - left.result.rank);

  if (!entries.length) {
    return {
      winnerIds: [],
      winningResult: null,
      ordered: [],
    };
  }

  const winningRank = entries[0].result.rank;
  return {
    winnerIds: entries.filter((entry) => entry.result.rank === winningRank).map((entry) => entry.playerId),
    winningResult: entries[0].result,
    ordered: entries,
  };
}

export function getMaxTotalPlayers() {
  return MAX_TOTAL_PLAYERS;
}

export function getMaxPlayerRolls() {
  return MAX_PLAYER_ROLLS;
}

export function getMaxCpuCount(currentHumanCount = 1) {
  const humanCount = Math.max(1, Number(currentHumanCount || 1));
  return Math.max(0, MAX_TOTAL_PLAYERS - humanCount);
}

function normalizeResult(result) {
  if (result && typeof result === "object") {
    if (result.finalResult && typeof result.finalResult === "object") {
      return result.finalResult;
    }
    if (result.currentResult && typeof result.currentResult === "object") {
      return result.currentResult;
    }
  }

  if (!result || typeof result !== "object") {
    return buildResult([], "INVALID", "不正", -1, -1, "判定不可", false, 0);
  }
  return result;
}

function buildResult(dice, hand, handName, rank, score, strengthText, retry, payoutRate) {
  return {
    dice,
    hand,
    handName,
    rank,
    score,
    strengthText,
    retry,
    payoutRate,
  };
}


