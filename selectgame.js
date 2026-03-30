import {
  signInWithGoogle,
  signOutUser,
  onUserChanged,
} from "./shared/firebase.js";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userBox = document.getElementById("userBox");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const message = document.getElementById("message");
const menuCards = document.querySelectorAll(".menu-card");
const gameSelectCard = document.getElementById("gameSelectCard");
const avatarGachaCard = document.getElementById("avatarGachaCard");
const gameSelectScreen = document.getElementById("gameSelectScreen");
const gameSelectUserPhoto = document.getElementById("gameSelectUserPhoto");
const gameSelectUserName = document.getElementById("gameSelectUserName");
const gameSelectUserSub = document.getElementById("gameSelectUserSub");
const gameSelectHomeBtn = document.getElementById("gameSelectHomeBtn");
const nicknameModal = document.getElementById("nicknameModal");
const nicknameInput = document.getElementById("nicknameInput");
const nicknameError = document.getElementById("nicknameError");
const nicknameSaveBtn = document.getElementById("nicknameSaveBtn");

let currentUser = null;
let currentProfile = null;

function setMessage(text = "") {
  if (message) {
    message.textContent = text;
  }
}

function sanitizeNickname(value = "") {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 20);
}

function openNicknameModal(defaultValue = "") {
  if (!nicknameModal || !nicknameInput || !nicknameError) return;
  nicknameError.textContent = "";
  nicknameInput.value = defaultValue;
  nicknameModal.classList.add("show");
  requestAnimationFrame(() => nicknameInput.focus());
}

function closeNicknameModal() {
  if (!nicknameModal || !nicknameError) return;
  nicknameModal.classList.remove("show");
  nicknameError.textContent = "";
}

function getProfileStorageKey(user) {
  return `seiseigames_profile_${user.uid}`;
}

function loadStoredProfile(user) {
  try {
    const raw = localStorage.getItem(getProfileStorageKey(user));
    if (!raw) {
      return { nickname: "", coin: 0 };
    }
    const data = JSON.parse(raw);
    return {
      nickname: typeof data.nickname === "string" ? data.nickname : "",
      coin: Number.isFinite(data.coin) ? data.coin : 0,
    };
  } catch (error) {
    console.error(error);
    return { nickname: "", coin: 0 };
  }
}

function saveStoredProfile(user, partialData = {}) {
  const current = loadStoredProfile(user);
  const next = {
    ...current,
    ...partialData,
  };
  localStorage.setItem(getProfileStorageKey(user), JSON.stringify(next));
  return next;
}

function applyProfileToGameSelect(profile, user) {
  const nickname = profile && profile.nickname ? profile.nickname : (user && user.displayName ? user.displayName : "名前なし");
  const coin = Number((profile && profile.coin) || 0);

  if (gameSelectUserName) {
    gameSelectUserName.textContent = nickname;
  }
  if (gameSelectUserSub) {
    gameSelectUserSub.textContent = `コイン: ${coin}`;
  }
  if (gameSelectUserPhoto) {
    gameSelectUserPhoto.style.background = "rgba(255, 255, 255, 0.08)";
  }
}

async function loadProfile(user) {
  const data = loadStoredProfile(user);
  currentProfile = data;
  applyProfileToGameSelect(data, user);
  return data;
}

async function ensureNicknameBeforeOpen() {
  if (!currentUser) return false;
  const data = await loadProfile(currentUser);
  const nickname = sanitizeNickname((data && data.nickname) || "");
  if (nickname) return true;
  openNicknameModal(currentUser.displayName || "");
  return false;
}

function openGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.add("show");
  }
}

function closeGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.remove("show");
  }
}

function updateLoggedOutView() {
  currentUser = null;
  currentProfile = null;

  if (statusDot) statusDot.classList.remove("ok");
  if (statusText) statusText.textContent = "未ログイン";
  menuCards.forEach((card) => card.classList.add("locked"));
  if (loginBtn) loginBtn.style.display = "inline-flex";
  if (logoutBtn) logoutBtn.style.display = "none";
  if (userBox) userBox.classList.remove("show");
  if (userPhoto) userPhoto.src = "";
  if (userName) userName.textContent = "---";
  if (userEmail) userEmail.textContent = "---";
  if (gameSelectUserName) gameSelectUserName.textContent = "---";
  if (gameSelectUserSub) gameSelectUserSub.textContent = "コイン: 0";
  closeNicknameModal();
  closeGameSelectScreen();
}

async function updateLoggedInView(user) {
  currentUser = user;

  if (statusDot) statusDot.classList.add("ok");
  if (statusText) statusText.textContent = "ログイン中";
  menuCards.forEach((card) => card.classList.remove("locked"));
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
  if (userBox) userBox.classList.add("show");
  if (userPhoto) userPhoto.src = user.photoURL || "";
  if (userName) userName.textContent = user.displayName || "名前なし";
  if (userEmail) userEmail.textContent = user.email || "メールなし";
  if (gameSelectUserName) gameSelectUserName.textContent = user.displayName || "名前なし";
  if (gameSelectUserSub) gameSelectUserSub.textContent = "コイン: 0";

  await loadProfile(user);
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    setMessage("");
    loginBtn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setMessage("ログインに失敗しました。設定を確認してください。");
    } finally {
      loginBtn.disabled = false;
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    setMessage("");
    logoutBtn.disabled = true;
    try {
      await signOutUser();
    } catch (error) {
      console.error(error);
      setMessage("ログアウトに失敗しました。");
    } finally {
      logoutBtn.disabled = false;
    }
  });
}

if (gameSelectCard) {
  gameSelectCard.addEventListener("click", async () => {
    if (gameSelectCard.classList.contains("locked")) return;
    setMessage("");
    try {
      const canOpen = await ensureNicknameBeforeOpen();
      if (!canOpen) return;
      openGameSelectScreen();
    } catch (error) {
      console.error(error);
      setMessage("読み込みに失敗しました。");
    }
  });
}

if (avatarGachaCard) {
  avatarGachaCard.addEventListener("click", () => {
    if (avatarGachaCard.classList.contains("locked")) return;
    setMessage("アバターガチャはこれからつなげます。");
  });
}

if (gameSelectHomeBtn) {
  gameSelectHomeBtn.addEventListener("click", () => {
    closeGameSelectScreen();
  });
}

if (nicknameSaveBtn) {
  nicknameSaveBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const nickname = sanitizeNickname(nicknameInput ? nicknameInput.value : "");
    if (!nickname) {
      if (nicknameError) nicknameError.textContent = "ニックネームを入力してください。";
      return;
    }

    nicknameSaveBtn.disabled = true;
    if (nicknameError) nicknameError.textContent = "";

    try {
      saveStoredProfile(currentUser, { nickname });
      await loadProfile(currentUser);
      closeNicknameModal();
      openGameSelectScreen();
    } catch (error) {
      console.error(error);
      if (nicknameError) nicknameError.textContent = "登録に失敗しました。";
    } finally {
      nicknameSaveBtn.disabled = false;
    }
  });
}

onUserChanged(async (user) => {
  setMessage("");
  if (user) {
    try {
      await updateLoggedInView(user);
    } catch (error) {
      console.error(error);
      setMessage("読み込みに失敗しました。");
    }
    return;
  }
  updateLoggedOutView();
});
