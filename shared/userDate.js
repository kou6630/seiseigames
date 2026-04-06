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
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const db = initializeFirestore(auth.app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
const USERS_COLLECTION = "users";
const DEFAULT_COIN = 0;
const DEFAULT_AVATAR = "default";
const DEFAULT_NICKNAME = "";
const FIRST_GAME_SELECT_LOGIN_BONUS = 200;
const DAILY_LOGIN_BONUS_RESET_HOUR = 9;
const DAILY_LOGIN_BONUS_CARDS = {
  "1等": { coin: 3000, count: 1 },
  "2等": { coin: 1500, count: 4 },
  "3等": { coin: 500, count: 15 },
  "4等": { coin: 100, count: 30 },
};
const ADMIN_EMAILS = ["takoponnsama6630@gmail.com"];

function buildDefaultUserData(user) {
  return {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    selectedAvatarImage: user.photoURL || "",
    coin: DEFAULT_COIN,
    nickname: DEFAULT_NICKNAME,
    selectedAvatar: DEFAULT_AVATAR,
    ownedAvatars: [DEFAULT_AVATAR],
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
  const ownedAvatars = Array.isArray(data.ownedAvatars) && data.ownedAvatars.length
    ? data.ownedAvatars
    : [DEFAULT_AVATAR];

  const selectedAvatar = data.selectedAvatar && ownedAvatars.includes(data.selectedAvatar)
    ? data.selectedAvatar
    : ownedAvatars[0] || DEFAULT_AVATAR;

  return {
    uid,
    name: data.name || "",
    email: data.email || "",
    photoURL: data.photoURL || "",
    selectedAvatarImage: data.selectedAvatarImage || data.photoURL || "",
    coin: Number.isFinite(data.coin) ? data.coin : DEFAULT_COIN,
    nickname: typeof data.nickname === "string"
      ? data.nickname.trim().replace(/\s+/g, " ").slice(0, 20)
      : DEFAULT_NICKNAME,
    selectedAvatar,
    ownedAvatars,
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
    selectedAvatarImage: existing.selectedAvatarImage || currentUser.photoURL || existing.photoURL || "",
    nickname: typeof existing.nickname === "string" ? existing.nickname : DEFAULT_NICKNAME,
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

  if (Array.isArray(safeData.ownedAvatars) && safeData.ownedAvatars.length === 0) {
    safeData.ownedAvatars = [DEFAULT_AVATAR];
  }

  if (
    safeData.selectedAvatar &&
    Array.isArray(safeData.ownedAvatars) &&
    !safeData.ownedAvatars.includes(safeData.selectedAvatar)
  ) {
    safeData.selectedAvatar = safeData.ownedAvatars[0] || DEFAULT_AVATAR;
  }

  await updateDoc(userRef, {
    ...safeData,
    updatedAt: serverTimestamp(),
  });

  return getUserData(currentUser);
}

export async function addUserCoin(amount, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const data = await getUserData(currentUser);
  const nextCoin = Math.max(0, (data.coin || 0) + Number(amount || 0));
  return updateUserData({ coin: nextCoin }, currentUser);
}

export async function useUserCoin(amount, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const cost = Math.max(0, Number(amount || 0));
  const data = await getUserData(currentUser);

  if ((data.coin || 0) < cost) {
    throw new Error("コインが足りません");
  }

  return updateUserData({ coin: data.coin - cost }, currentUser);
}

export async function unlockAvatar(avatarId, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const data = await getUserData(currentUser);
  const nextAvatarId = String(avatarId || "").trim();

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

export async function selectAvatar(avatarId, user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const data = await getUserData(currentUser);
  const nextAvatarId = String(avatarId || "").trim();

  if (!data.ownedAvatars.includes(nextAvatarId)) {
    throw new Error("未所持のアバターは選べません");
  }

  return updateUserData({ selectedAvatar: nextAvatarId }, currentUser);
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
  const snapshot = await getDoc(targetRef);

  if (!snapshot.exists()) {
    throw new Error("対象ユーザーが見つかりません");
  }

  const targetData = normalizeUserData(uid, snapshot.data() || {});
  const nextCoin = Math.max(0, (targetData.coin || 0) + Number(amount || 0));

  await updateDoc(targetRef, {
    coin: nextCoin,
    updatedAt: serverTimestamp(),
  });

  return normalizeUserData(uid, {
    ...targetData,
    coin: nextCoin,
  });
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
  const snapshot = await getDoc(targetRef);

  if (!snapshot.exists()) {
    throw new Error("対象ユーザーが見つかりません");
  }

  const targetData = normalizeUserData(uid, snapshot.data() || {});
  const nextCoin = Math.max(0, (targetData.coin || 0) - cost);

  await updateDoc(targetRef, {
    coin: nextCoin,
    updatedAt: serverTimestamp(),
  });

  return normalizeUserData(uid, {
    ...targetData,
    coin: nextCoin,
  });
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
  const [fromSnapshot, toSnapshot] = await Promise.all([
    getDoc(fromRef),
    getDoc(toRef),
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

  await Promise.all([
    updateDoc(fromRef, {
      coin: Math.max(0, Number(fromData.coin || 0) - safeAmount),
      updatedAt: serverTimestamp(),
    }),
    updateDoc(toRef, {
      coin: Math.max(0, Number(toData.coin || 0) + safeAmount),
      updatedAt: serverTimestamp(),
    }),
  ]);

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
}

export async function grantFirstGameSelectLoginBonus(user = getCurrentUser()) {
  const currentUser = requireUser(user);
  const userRef = getUserRef(currentUser.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await ensureUserData(currentUser);
    return grantFirstGameSelectLoginBonus(currentUser);
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

  await updateDoc(userRef, {
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
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await ensureUserData(currentUser);
    return grantDailyLoginBonus(currentUser, selectedCard);
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
      await updateDoc(userRef, {
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

  await updateDoc(userRef, {
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
