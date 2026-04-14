import {
  auth,
  getCurrentUser,
} from "./firebase.js";
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const db = initializeFirestore(auth.app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
const USERS_COLLECTION = "users";
const DEFAULT_COIN = 0;
const DEFAULT_AVATAR = "default";
const DEFAULT_NICKNAME = "";
const DEFAULT_AVATAR_FRAGMENT = 0;
const FIRST_GAME_SELECT_LOGIN_BONUS = 200;
const DAILY_LOGIN_BONUS_RESET_HOUR = 9;
const DAILY_LOGIN_BONUS_CARDS = {
  "1等": { coin: 500, count: 1 },
  "2等": { coin: 300, count: 4 },
  "3等": { coin: 150, count: 15 },
  "4等": { coin: 50, count: 30 },
};
const ADMIN_EMAILS = ["takoponnsama6630@gmail.com"];
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

function normalizeAvatarId(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_AVATAR;
  if (raw === DEFAULT_AVATAR) return DEFAULT_AVATAR;
  const matched = raw.match(/([0-9]+)/);
  if (matched) {
    return "avatar_" + String(Number(matched[1]));
  }
  return raw;
}

function normalizeOwnedAvatars(values) {
  const input = Array.isArray(values) ? values : [];
  const normalized = [];
  const seen = new Set();

  input.forEach(function(value) {
    const id = normalizeAvatarId(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    normalized.push(id);
  });

  if (!normalized.length) {
    return [DEFAULT_AVATAR];
  }

  return normalized;
}

function getAvatarImageById(avatarId) {
  const normalizedId = normalizeAvatarId(avatarId);
  return AVATAR_IMAGE_MAP[normalizedId] || "";
}

function buildDefaultUserData(user) {
  return {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    selectedAvatarImage: "",
    coin: DEFAULT_COIN,
    nickname: DEFAULT_NICKNAME,
    selectedAvatar: DEFAULT_AVATAR,
    ownedAvatars: [DEFAULT_AVATAR],
    avatarFragment: DEFAULT_AVATAR_FRAGMENT,
    firstGameSelectLoginBonusReceived: false,
    dailyLoginBonusLastResetKey: "",
    dailyLoginBonusReceived: false,
    dailyLoginBonusDeck: [],
    isAdmin: ADMIN_EMAILS.includes(String(user.email || "").toLowerCase()),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function normalizeUserData(uid, data = {}) {
  const ownedAvatars = normalizeOwnedAvatars(data.ownedAvatars);

  const requestedSelectedAvatar = normalizeAvatarId(data.selectedAvatar);
  const selectedAvatar = ownedAvatars.includes(requestedSelectedAvatar)
    ? requestedSelectedAvatar
    : ownedAvatars[0] || DEFAULT_AVATAR;
  const selectedAvatarImage = selectedAvatar === DEFAULT_AVATAR
    ? ""
    : (getAvatarImageById(selectedAvatar) || "");

  return {
    uid,
    name: data.name || "",
    email: data.email || "",
    photoURL: data.photoURL || "",
    selectedAvatarImage: selectedAvatarImage,
    coin: Number.isFinite(data.coin) ? data.coin : DEFAULT_COIN,
    nickname: typeof data.nickname === "string"
      ? data.nickname.trim().replace(/\s+/g, " ").slice(0, 20)
      : DEFAULT_NICKNAME,
    selectedAvatar,
    ownedAvatars,
    avatarFragment: Number.isFinite(data.avatarFragment) ? Math.max(0, Number(data.avatarFragment)) : DEFAULT_AVATAR_FRAGMENT,
    firstGameSelectLoginBonusReceived: Boolean(data.firstGameSelectLoginBonusReceived),
    dailyLoginBonusLastResetKey: typeof data.dailyLoginBonusLastResetKey === "string" ? data.dailyLoginBonusLastResetKey : "",
    dailyLoginBonusReceived: Boolean(data.dailyLoginBonusReceived),
    dailyLoginBonusDeck: Array.isArray(data.dailyLoginBonusDeck) ? data.dailyLoginBonusDeck : [],
    isAdmin: Boolean(data.isAdmin),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function requireUser(user = getCurrentUser()) {
  if (!user) {
    throw new Error("ログインが必要です");
  }
  return user;
}

function getUserRef(uid) {
  return doc(db, USERS_COLLECTION, uid);
}

export async function ensureUserData(user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const userRef = getUserRef(currentUser.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const initialData = buildDefaultUserData(currentUser);
    await setDoc(userRef, initialData);
    return normalizeUserData(currentUser.uid, {
      ...initialData,
      createdAt: null,
      updatedAt: null,
    });
  }

  const existing = snapshot.data() || {};
  const merged = {
    ...normalizeUserData(currentUser.uid, existing),
    name: currentUser.displayName || existing.name || "",
    email: currentUser.email || existing.email || "",
    photoURL: currentUser.photoURL || existing.photoURL || "",
    selectedAvatarImage: existing.selectedAvatar === DEFAULT_AVATAR ? "" : (getAvatarImageById(existing.selectedAvatar) || ""),
    nickname: typeof existing.nickname === "string" ? existing.nickname : DEFAULT_NICKNAME,
    avatarFragment: typeof existing.avatarFragment === "number" ? Math.max(0, Number(existing.avatarFragment)) : DEFAULT_AVATAR_FRAGMENT,
    firstGameSelectLoginBonusReceived: typeof existing.firstGameSelectLoginBonusReceived === "boolean"
      ? existing.firstGameSelectLoginBonusReceived
      : false,
    dailyLoginBonusLastResetKey: typeof existing.dailyLoginBonusLastResetKey === "string"
      ? existing.dailyLoginBonusLastResetKey
      : "",
    dailyLoginBonusReceived: typeof existing.dailyLoginBonusReceived === "boolean"
      ? existing.dailyLoginBonusReceived
      : false,
    dailyLoginBonusDeck: Array.isArray(existing.dailyLoginBonusDeck)
      ? existing.dailyLoginBonusDeck
      : [],
    isAdmin: typeof existing.isAdmin === "boolean"
      ? existing.isAdmin
      : ADMIN_EMAILS.includes(String(currentUser.email || "").toLowerCase()),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, {
    name: merged.name,
    email: merged.email,
    photoURL: merged.photoURL,
    selectedAvatarImage: merged.selectedAvatarImage,
    nickname: merged.nickname,
    avatarFragment: merged.avatarFragment,
    firstGameSelectLoginBonusReceived: merged.firstGameSelectLoginBonusReceived,
    dailyLoginBonusLastResetKey: merged.dailyLoginBonusLastResetKey,
    dailyLoginBonusReceived: merged.dailyLoginBonusReceived,
    dailyLoginBonusDeck: merged.dailyLoginBonusDeck,
    isAdmin: merged.isAdmin,
    updatedAt: merged.updatedAt,
  });

  return normalizeUserData(currentUser.uid, {
    ...existing,
    name: merged.name,
    email: merged.email,
    photoURL: merged.photoURL,
    selectedAvatarImage: merged.selectedAvatarImage,
    nickname: merged.nickname,
    avatarFragment: merged.avatarFragment,
    firstGameSelectLoginBonusReceived: merged.firstGameSelectLoginBonusReceived,
    dailyLoginBonusLastResetKey: merged.dailyLoginBonusLastResetKey,
    dailyLoginBonusReceived: merged.dailyLoginBonusReceived,
    dailyLoginBonusDeck: merged.dailyLoginBonusDeck,
    isAdmin: merged.isAdmin,
  });
}

export async function getUserData(user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const userRef = getUserRef(currentUser.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return ensureUserData(currentUser);
  }

  return normalizeUserData(currentUser.uid, snapshot.data());
}

export async function updateUserData(partialData = {}, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  const safeData = { ...partialData };
  delete safeData.uid;
  delete safeData.createdAt;

  if (typeof safeData.nickname === "string") {
    safeData.nickname = safeData.nickname.trim().replace(/\s+/g, " ").slice(0, 20);
  }

  delete safeData.isAdmin;

  if (Array.isArray(safeData.ownedAvatars)) {
    safeData.ownedAvatars = normalizeOwnedAvatars(safeData.ownedAvatars);
  }

  if (typeof safeData.selectedAvatar !== "undefined") {
    safeData.selectedAvatar = normalizeAvatarId(safeData.selectedAvatar);
  }

  if (
    safeData.selectedAvatar &&
    Array.isArray(safeData.ownedAvatars) &&
    !safeData.ownedAvatars.includes(safeData.selectedAvatar)
  ) {
    safeData.selectedAvatar = safeData.ownedAvatars[0] || DEFAULT_AVATAR;
  }

  if (typeof safeData.selectedAvatar !== "undefined" && typeof safeData.selectedAvatarImage === "undefined") {
    safeData.selectedAvatarImage = getAvatarImageById(safeData.selectedAvatar);
  }

  await updateDoc(userRef, {
    ...safeData,
    updatedAt: serverTimestamp(),
  });

  return getUserData(currentUser);
}

export async function addUserCoin(amount, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const value = Number(amount || 0);
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("ユーザーデータが見つかりません");
    }
    const data = normalizeUserData(currentUser.uid, snapshot.data() || {});
    const nextCoin = Math.max(0, Number(data.coin || 0) + value);
    transaction.update(userRef, {
      coin: nextCoin,
      updatedAt: serverTimestamp(),
    });
    return nextCoin;
  });

  return updateUserData({ coin: result }, currentUser);
}

export async function useUserCoin(amount, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const cost = Math.max(0, Number(amount || 0));
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("ユーザーデータが見つかりません");
    }
    const data = normalizeUserData(currentUser.uid, snapshot.data() || {});
    if ((data.coin || 0) < cost) {
      throw new Error("コインが足りません");
    }
    const nextCoin = Math.max(0, Number(data.coin || 0) - cost);
    transaction.update(userRef, {
      coin: nextCoin,
      updatedAt: serverTimestamp(),
    });
    return nextCoin;
  });

  return updateUserData({ coin: result }, currentUser);
}

export async function unlockAvatar(avatarId, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const data = await getUserData(currentUser);
  const nextAvatarId = normalizeAvatarId(avatarId);

  if (!nextAvatarId) {
    throw new Error("アバターIDが必要です");
  }

  if (data.ownedAvatars.includes(nextAvatarId)) {
    return data;
  }

  return updateUserData({
    ownedAvatars: [...data.ownedAvatars, nextAvatarId],
  }, currentUser);
}

export async function addAvatarFragment(amount = 1, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const value = Math.max(0, Math.floor(Number(amount || 0)));
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("ユーザーデータが見つかりません");
    }
    const data = normalizeUserData(currentUser.uid, snapshot.data() || {});
    const nextAvatarFragment = Math.max(0, Number(data.avatarFragment || 0) + value);
    transaction.update(userRef, {
      avatarFragment: nextAvatarFragment,
      updatedAt: serverTimestamp(),
    });
    return nextAvatarFragment;
  });

  return updateUserData({ avatarFragment: result }, currentUser);
}

export async function unlockAvatarOrGrantFragment(avatarId, user = getCurrentUser(), fragmentAmount = 1) {
  const currentUser = requireUser(user);
  const data = await getUserData(currentUser);
  const nextAvatarId = normalizeAvatarId(avatarId);

  if (!nextAvatarId) {
    throw new Error("アバターIDが必要です");
  }

  if (data.ownedAvatars.includes(nextAvatarId)) {
    const safeFragmentAmount = Math.max(0, Math.floor(Number(fragmentAmount || 0)));
    const userData = await addAvatarFragment(safeFragmentAmount, currentUser);
    return {
      duplicated: true,
      fragmentAmount: safeFragmentAmount,
      userData,
    };
  }

  const userData = await unlockAvatar(nextAvatarId, currentUser);
  return {
    duplicated: false,
    fragmentAmount: 0,
    userData,
  };
}

export async function resolveAvatarGachaBatch(drawAvatarIds = [], coinCost = 0, user = getCurrentUser(), fragmentAmount = 1) {
  const currentUser = requireUser(user);
  const avatarIds = Array.isArray(drawAvatarIds)
    ? drawAvatarIds.map(normalizeAvatarId).filter(function(id) {
        return id && id !== DEFAULT_AVATAR;
      })
    : [];
  const safeCoinCost = Math.max(0, Number(coinCost || 0));
  const safeFragmentAmount = Math.max(0, Math.floor(Number(fragmentAmount || 0)));
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("ユーザーデータが見つかりません");
    }

    const data = normalizeUserData(currentUser.uid, snapshot.data() || {});
    if (Number(data.coin || 0) < safeCoinCost) {
      throw new Error("コインが足りません");
    }

    const ownedSet = new Set(normalizeOwnedAvatars(data.ownedAvatars));
    const duplicatedAvatarIds = [];
    const unlockedAvatarIds = [];
    let fragmentTotal = Math.max(0, Number(data.avatarFragment || 0));

    avatarIds.forEach(function(avatarId) {
      if (ownedSet.has(avatarId)) {
        duplicatedAvatarIds.push(avatarId);
        fragmentTotal += safeFragmentAmount;
        return;
      }
      ownedSet.add(avatarId);
      unlockedAvatarIds.push(avatarId);
    });

    const nextCoin = Math.max(0, Number(data.coin || 0) - safeCoinCost);
    const nextOwnedAvatars = Array.from(ownedSet);

    transaction.update(userRef, {
      coin: nextCoin,
      ownedAvatars: nextOwnedAvatars,
      avatarFragment: fragmentTotal,
      updatedAt: serverTimestamp(),
    });

    return {
      duplicatedAvatarIds,
      unlockedAvatarIds,
      fragmentAmount: safeFragmentAmount,
      userData: normalizeUserData(currentUser.uid, {
        ...data,
        coin: nextCoin,
        ownedAvatars: nextOwnedAvatars,
        avatarFragment: fragmentTotal,
      }),
    };
  });
}

export async function selectAvatar(avatarId, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const data = await getUserData(currentUser);
  const nextAvatarId = normalizeAvatarId(avatarId);

  if (!data.ownedAvatars.includes(nextAvatarId)) {
    throw new Error("未所持のアバターは選べません");
  }

  return updateUserData({
    selectedAvatar: nextAvatarId,
    selectedAvatarImage: getAvatarImageById(nextAvatarId),
  }, currentUser);
}

export async function getAllUsersData(user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const currentData = await getUserData(currentUser);

  if (!currentData.isAdmin) {
    throw new Error("権限がありません");
  }

  try {
    const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js");
    const snapshot = await getDocs(query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => normalizeUserData(item.id, item.data() || {}));
  } catch (error) {
    console.error(error);
    return [currentData];
  }
}

export async function addUserCoinByUid(targetUid, amount, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const currentData = await getUserData(currentUser);

  if (!currentData.isAdmin) {
    throw new Error("権限がありません");
  }

  const uid = String(targetUid || "").trim();
  if (!uid) {
    throw new Error("対象ユーザーが必要です");
  }

  const targetRef = getUserRef(uid);
  const value = Number(amount || 0);

  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(targetRef);
    if (!snapshot.exists()) {
      throw new Error("対象ユーザーが見つかりません");
    }
    const targetData = normalizeUserData(uid, snapshot.data() || {});
    const nextCoin = Math.max(0, Number(targetData.coin || 0) + value);
    transaction.update(targetRef, {
      coin: nextCoin,
      updatedAt: serverTimestamp(),
    });
    return {
      ...targetData,
      coin: nextCoin,
    };
  });

  return normalizeUserData(uid, result);
}

export async function useUserCoinByUid(targetUid, amount, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const currentData = await getUserData(currentUser);

  if (!currentData.isAdmin) {
    throw new Error("権限がありません");
  }

  const uid = String(targetUid || "").trim();
  if (!uid) {
    throw new Error("対象ユーザーが必要です");
  }

  const cost = Math.max(0, Number(amount || 0));
  const targetRef = getUserRef(uid);

  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(targetRef);
    if (!snapshot.exists()) {
      throw new Error("対象ユーザーが見つかりません");
    }
    const targetData = normalizeUserData(uid, snapshot.data() || {});
    const nextCoin = Math.max(0, Number(targetData.coin || 0) - cost);
    transaction.update(targetRef, {
      coin: nextCoin,
      updatedAt: serverTimestamp(),
    });
    return {
      ...targetData,
      coin: nextCoin,
    };
  });

  return normalizeUserData(uid, result);
}

export async function resetUserAvatarByUid(targetUid, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const currentData = await getUserData(currentUser);

  if (!currentData.isAdmin) {
    throw new Error("権限がありません");
  }

  const uid = String(targetUid || "").trim();
  if (!uid) {
    throw new Error("対象ユーザーが必要です");
  }

  const targetRef = getUserRef(uid);

  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(targetRef);
    if (!snapshot.exists()) {
      throw new Error("対象ユーザーが見つかりません");
    }
    const targetData = normalizeUserData(uid, snapshot.data() || {});
    const nextData = {
      ...targetData,
      selectedAvatar: DEFAULT_AVATAR,
      selectedAvatarImage: "",
      ownedAvatars: [DEFAULT_AVATAR],
      avatarFragment: DEFAULT_AVATAR_FRAGMENT,
    };
    transaction.update(targetRef, {
      selectedAvatar: DEFAULT_AVATAR,
      selectedAvatarImage: "",
      ownedAvatars: [DEFAULT_AVATAR],
      avatarFragment: DEFAULT_AVATAR_FRAGMENT,
      updatedAt: serverTimestamp(),
    });
    return nextData;
  });

  return normalizeUserData(uid, result);
}

export async function transferUserCoinByUid(fromUid, toUid, amount, user = getCurrentUser()) {
  requireUser(user);

  const from = String(fromUid || "").trim();
  const to = String(toUid || "").trim();
  const value = Math.max(0, Number(amount || 0));

  if (!from || !to) {
    throw new Error("対象ユーザーが必要です");
  }
  if (from === to || !value) {
    return null;
  }

  const fromRef = getUserRef(from);
  const toRef = getUserRef(to);

  return runTransaction(db, async (transaction) => {
    const [fromSnapshot, toSnapshot] = await Promise.all([
      transaction.get(fromRef),
      transaction.get(toRef),
    ]);

    if (!fromSnapshot.exists() || !toSnapshot.exists()) {
      throw new Error("対象ユーザーが見つかりません");
    }

    const fromData = normalizeUserData(from, fromSnapshot.data() || {});
    const toData = normalizeUserData(to, toSnapshot.data() || {});
    const safeAmount = Math.min(Math.max(0, Number(fromData.coin || 0)), value);

    if (!safeAmount) {
      return {
        from: fromData,
        to: toData,
        amount: 0,
      };
    }

    transaction.update(fromRef, {
      coin: Math.max(0, Number(fromData.coin || 0) - safeAmount),
      updatedAt: serverTimestamp(),
    });
    transaction.update(toRef, {
      coin: Math.max(0, Number(toData.coin || 0) + safeAmount),
      updatedAt: serverTimestamp(),
    });

    return {
      from: normalizeUserData(from, {
        ...fromData,
        coin: Math.max(0, Number(fromData.coin || 0) - safeAmount),
      }),
      to: normalizeUserData(to, {
        ...toData,
        coin: Math.max(0, Number(toData.coin || 0) + safeAmount),
      }),
      amount: safeAmount,
    };
  });
}

export async function grantFirstGameSelectLoginBonus(user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("ユーザーデータが見つかりません");
    }

    const data = normalizeUserData(currentUser.uid, snapshot.data() || {});

    if (data.firstGameSelectLoginBonusReceived) {
      return {
        awarded: false,
        amount: 0,
        userData: data,
      };
    }

    const nextCoin = Math.max(0, Number(data.coin || 0) + FIRST_GAME_SELECT_LOGIN_BONUS);

    transaction.update(userRef, {
      coin: nextCoin,
      firstGameSelectLoginBonusReceived: true,
      updatedAt: serverTimestamp(),
    });

    return {
      awarded: true,
      amount: FIRST_GAME_SELECT_LOGIN_BONUS,
      userData: normalizeUserData(currentUser.uid, {
        ...data,
        coin: nextCoin,
        firstGameSelectLoginBonusReceived: true,
      }),
    };
  });
}

function getDailyLoginBonusResetKey(date = new Date()) {
  const jstNow = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const resetBase = new Date(jstNow);

  if (resetBase.getUTCHours() < DAILY_LOGIN_BONUS_RESET_HOUR) {
    resetBase.setUTCDate(resetBase.getUTCDate() - 1);
  }

  const year = resetBase.getUTCFullYear();
  const month = String(resetBase.getUTCMonth() + 1).padStart(2, "0");
  const day = String(resetBase.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyLoginBonusCoin(rank) {
  return DAILY_LOGIN_BONUS_CARDS[rank] ? DAILY_LOGIN_BONUS_CARDS[rank].coin : 0;
}

function buildDailyLoginBonusDeck() {
  const deck = Object.entries(DAILY_LOGIN_BONUS_CARDS).flatMap(([rank, info]) => {
    return Array.from({ length: info.count }, function() {
      return rank;
    });
  });

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }

  return deck;
}

export async function grantDailyLoginBonus(user = getCurrentUser(), selectedCard = null) {
  const currentUser = requireUser(user);
  const userRef = getUserRef(currentUser.uid);

  await ensureUserData(currentUser);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("ユーザーデータが見つかりません");
    }

    const data = normalizeUserData(currentUser.uid, snapshot.data() || {});
    const resetKey = getDailyLoginBonusResetKey();
    const alreadyReceivedToday = data.dailyLoginBonusLastResetKey === resetKey && data.dailyLoginBonusReceived;

    if (!selectedCard) {
      if (alreadyReceivedToday) {
        return {
          available: false,
          awarded: false,
          userData: data,
        };
      }

      const nextDeck = data.dailyLoginBonusLastResetKey !== resetKey || !Array.isArray(data.dailyLoginBonusDeck) || data.dailyLoginBonusDeck.length !== 50
        ? buildDailyLoginBonusDeck()
        : data.dailyLoginBonusDeck;

      if (
        data.dailyLoginBonusLastResetKey !== resetKey ||
        data.dailyLoginBonusReceived ||
        !Array.isArray(data.dailyLoginBonusDeck) ||
        data.dailyLoginBonusDeck.length !== 50
      ) {
        transaction.update(userRef, {
          dailyLoginBonusLastResetKey: resetKey,
          dailyLoginBonusReceived: false,
          dailyLoginBonusDeck: nextDeck,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        available: true,
        awarded: false,
        resetKey,
        userData: normalizeUserData(currentUser.uid, {
          ...data,
          dailyLoginBonusLastResetKey: resetKey,
          dailyLoginBonusReceived: false,
          dailyLoginBonusDeck: nextDeck,
        }),
      };
    }

    if (alreadyReceivedToday) {
      return {
        available: false,
        awarded: false,
        userData: data,
      };
    }

    const selectedIndex = Number(selectedCard && selectedCard.index);
    const deck = Array.isArray(data.dailyLoginBonusDeck) && data.dailyLoginBonusDeck.length === 50
      ? data.dailyLoginBonusDeck
      : buildDailyLoginBonusDeck();
    const rank = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < deck.length
      ? String(deck[selectedIndex] || "").trim()
      : "";
    const amount = getDailyLoginBonusCoin(rank);
    if (!amount) {
      throw new Error("ログインボーナスの内容が不正です");
    }

    const nextCoin = Math.max(0, Number(data.coin || 0) + amount);

    transaction.update(userRef, {
      coin: nextCoin,
      dailyLoginBonusLastResetKey: resetKey,
      dailyLoginBonusReceived: true,
      dailyLoginBonusDeck: [],
      updatedAt: serverTimestamp(),
    });

    return {
      available: false,
      awarded: true,
      rank,
      amount,
      userData: normalizeUserData(currentUser.uid, {
        ...data,
        coin: nextCoin,
        dailyLoginBonusLastResetKey: resetKey,
        dailyLoginBonusReceived: true,
        dailyLoginBonusDeck: [],
      }),
    };
  });
}

export {
  db,
  USERS_COLLECTION,
  DEFAULT_COIN,
  DEFAULT_AVATAR,
  DEFAULT_NICKNAME,
  FIRST_GAME_SELECT_LOGIN_BONUS,
  DAILY_LOGIN_BONUS_RESET_HOUR,
  DAILY_LOGIN_BONUS_CARDS,
};




