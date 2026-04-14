const HAND_NAMES = {
  PINZORO: "ピンゾロ",
  ARASHI: "アラシ",
  SHIGORO: "シゴロ",
  HIFUMI: "ヒフミ",
  MENASHI: "目なし",
};

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
    const pairFace = entries.find((item) => item.count === 2)?.face || 0;
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

export function createTurnResult(dice = [], turn = 1, maxTurn = 3) {
  const result = evaluateChinchiro(dice);
  return {
    turn,
    maxTurn,
    dice: result.dice,
    hand: result.hand,
    handName: result.handName,
    rank: result.rank,
    retry: result.retry && turn < maxTurn,
    finished: !result.retry || turn >= maxTurn,
    strengthText: result.strengthText,
    payoutRate: result.payoutRate,
    score: result.score,
  };
}

export function createCpuDecision(history = [], maxTurn = 3) {
  const turn = Array.isArray(history) ? history.length + 1 : 1;
  const last = Array.isArray(history) && history.length ? history[history.length - 1] : null;

  if (!last) {
    return { shouldRoll: true, reason: "初回" };
  }

  if (!last.retry) {
    return { shouldRoll: false, reason: "役確定" };
  }

  if (turn > maxTurn) {
    return { shouldRoll: false, reason: "上限" };
  }

  return { shouldRoll: true, reason: "目なし" };
}

function normalizeResult(result) {
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
