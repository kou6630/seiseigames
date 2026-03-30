import {
  auth,
  getCurrentUser,
} from "./firebase.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const db = getFirestore();
const USERS_COLLECTION = "users";
const DEFAULT_COIN = 0;
const DEFAULT_AVATAR = "default";
const DEFAULT_NICKNAME = "";

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
    nickname: typeof data.nickname === "string" ? data.nickname : DEFAULT_NICKNAME,
    selectedAvatar,
    ownedAvatars,
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
  return doc(getFirestore(auth.app), USERS_COLLECTION, uid);
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
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, {
    name: merged.name,
    email: merged.email,
    photoURL: merged.photoURL,
    selectedAvatarImage: merged.selectedAvatarImage,
    nickname: merged.nickname,
    updatedAt: merged.updatedAt,
  });

  return normalizeUserData(currentUser.uid, existing);
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

export { db, USERS_COLLECTION, DEFAULT_COIN, DEFAULT_AVATAR, DEFAULT_NICKNAME };
