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
const adminEntryBtn = document.getElementById("adminEntryBtn");
const adminScreen = document.getElementById("adminScreen");
const adminCloseBtn = document.getElementById("adminCloseBtn");
const adminSearchInput = document.getElementById("adminSearchInput");
const adminUserList = document.getElementById("adminUserList");
const adminSelectedUser = document.getElementById("adminSelectedUser");
const adminCoinInput = document.getElementById("adminCoinInput");
const adminAddCoinBtn = document.getElementById("adminAddCoinBtn");
const adminRemoveCoinBtn = document.getElementById("adminRemoveCoinBtn");
const adminStatus = document.getElementById("adminStatus");

let currentUser = null;
let currentProfile = null;
let isAdminUser = false;
let adminUsers = [];
let adminSelectedUid = "";
let stopOnlineUsersSubscription = null;

const ADMIN_EMAILS = ["takoponnsama6630@gmail.com"];

function setMessage(text = "") {
  if (message) {
    message.textContent = text;
  }
}

function sanitizeNickname(value = "") {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 20);
}

function getFallbackNickname(user) {
  const fromName = sanitizeNickname(user && user.displayName ? user.displayName : "");
  if (fromName) return fromName;

  const email = String(user && user.email ? user.email : "");
  const fromEmail = sanitizeNickname(email.split("@")[0] || "");
  if (fromEmail) return fromEmail;

  return "ゲスト";
}

function isAdminAccount(user) {
  if (!user) return false;
  return ADMIN_EMAILS.includes(String(user.email || "").toLowerCase());
}

function setAdminEntryVisible(visible) {
  if (!adminEntryBtn) return;
  adminEntryBtn.classList.toggle("show", Boolean(visible));
}

function setAdminStatus(text = "") {
  if (adminStatus) {
    adminStatus.textContent = text;
  }
}

function openAdminScreen() {
  if (adminScreen) {
    adminScreen.classList.add("show");
  }
}

function closeAdminScreen() {
  if (stopOnlineUsersSubscription) {
    stopOnlineUsersSubscription();
    stopOnlineUsersSubscription = null;
  }
  if (adminScreen) {
    adminScreen.classList.remove("show");
  }
}

function resetAdminView() {
  adminUsers = [];
  adminSelectedUid = "";
  if (adminSearchInput) adminSearchInput.value = "";
  if (adminCoinInput) adminCoinInput.value = "";
  if (adminSelectedUser) adminSelectedUser.textContent = "対象ユーザーを選んでください。";
  if (adminUserList) adminUserList.innerHTML = '<div class="admin-empty">読み込み前です。</div>';
  setAdminStatus("");
}

function renderAdminUsers(keyword = "") {
  if (!adminUserList) return;

  const search = String(keyword || "").trim().toLowerCase();
  const filtered = adminUsers.filter((user) => {
    if (!search) return true;
    const text = `${user.nickname || ""} ${user.name || ""} ${user.email || ""}`.toLowerCase();
    return text.includes(search);
  });

  if (!filtered.length) {
    adminUserList.innerHTML = '<div class="admin-empty">該当ユーザーがいません。</div>';
    return;
  }

  adminUserList.innerHTML = filtered.map((user) => {
    const label = user.nickname || user.name || "名前なし";
    const email = user.email || "オンライン中";
    const coin = Number.isFinite(Number(user.coin)) ? Number(user.coin) : null;
    return `
      <button type="button" class="admin-user-item" data-admin-user="${user.uid}">
        <div class="admin-user-main">
          <div class="admin-user-name">${label}</div>
          <div class="admin-user-sub">${email}</div>
        </div>
        <div class="admin-user-coin">${coin === null ? "オンライン中" : `コイン: ${coin}`}</div>
      </button>
    `;
  }).join("");

  adminUserList.querySelectorAll("[data-admin-user]").forEach((button) => {
    button.addEventListener("click", () => {
      adminSelectedUid = button.getAttribute("data-admin-user") || "";
      const target = adminUsers.find((user) => user.uid === adminSelectedUid);
      if (!target) return;
      if (adminSelectedUser) {
        adminSelectedUser.textContent = `${target.nickname || target.name || "名前なし"} / ${target.email || "オンライン中"} / ${Number.isFinite(Number(target.coin)) ? `コイン: ${Number(target.coin)}` : "オンライン中"}`;
      }
      setAdminStatus("");
    });
  });
}

async function loadAdminUsers() {
  if (!isAdminUser) return;
  if (stopOnlineUsersSubscription) {
    stopOnlineUsersSubscription();
    stopOnlineUsersSubscription = null;
  }
  adminUsers = [];
  if (adminUserList) {
    adminUserList.innerHTML = '<div class="admin-empty">通信を使わない設定のため、オンライン一覧は停止中です。</div>';
  }
  setAdminStatus("一覧取得は停止中です。");
}

async function applyAdminCoin(mode) {
  if (!isAdminUser) return;
  if (!adminSelectedUid) {
    setAdminStatus("対象ユーザーを選んでください。");
    return;
  }
  const amount = Math.max(0, Math.floor(Number(adminCoinInput ? adminCoinInput.value : 0)));
  if (!amount) {
    setAdminStatus("コイン数を入力してください。");
    return;
  }
  setAdminStatus("通信を止めているため、コイン操作は停止中です。");
}

function getProfileStorageKey(user) {
  return `seiseigames_profile_${user.uid}`;
}

function loadStoredProfile(user) {
  try {
    const raw = localStorage.getItem(getProfileStorageKey(user));
    if (!raw) {
      return { nickname: "", coin: 0, isAdmin: isAdminAccount(user) };
    }
    const data = JSON.parse(raw);
    return {
      nickname: typeof data.nickname === "string" ? data.nickname : "",
      coin: Number.isFinite(data.coin) ? data.coin : 0,
      isAdmin: typeof data.isAdmin === "boolean" ? data.isAdmin : isAdminAccount(user),
    };
  } catch (error) {
    console.error(error);
    return { nickname: "", coin: 0, isAdmin: isAdminAccount(user) };
  }
}

function saveStoredProfile(user, partialData = {}) {
  const current = loadStoredProfile(user);
  const next = {
    ...current,
    ...partialData,
    isAdmin: isAdminAccount(user),
  };
  localStorage.setItem(getProfileStorageKey(user), JSON.stringify(next));
  return next;
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

function applyProfileToGameSelect(profile, user) {
  const nickname = profile && profile.nickname ? profile.nickname : getFallbackNickname(user);
  const coin = Number((profile && profile.coin) || 0);

  if (userName) {
    userName.textContent = nickname;
  }
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
  isAdminUser = Boolean(data.isAdmin) || isAdminAccount(user);
  applyProfileToGameSelect(data, user);
  return data;
}

async function ensureNicknameBeforeOpen() {
  if (!currentUser) return false;
  const data = await loadProfile(currentUser);
  const nickname = sanitizeNickname((data && data.nickname) || "");
  if (nickname) return true;

  const fallbackName = getFallbackNickname(currentUser);
  if (fallbackName) {
    applyProfileToGameSelect({
      ...(currentProfile || {}),
      nickname: fallbackName,
      coin: currentProfile && Number.isFinite(Number(currentProfile.coin)) ? Number(currentProfile.coin) : 0,
    }, currentUser);
    return true;
  }

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
  isAdminUser = false;

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
  setAdminEntryVisible(false);
  closeAdminScreen();
  resetAdminView();
  closeNicknameModal();
  closeGameSelectScreen();
}

async function updateLoggedInView(user) {
  currentUser = user;
  isAdminUser = isAdminAccount(user);

  if (statusDot) statusDot.classList.add("ok");
  if (statusText) statusText.textContent = "ログイン中";
  menuCards.forEach((card) => card.classList.remove("locked"));
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
  if (userBox) userBox.classList.add("show");
  if (userPhoto) userPhoto.src = user.photoURL || "";
  if (userName) userName.textContent = user.displayName || "名前なし";
  if (userEmail) userEmail.textContent = user.email || "メールなし";
  setAdminEntryVisible(isAdminUser);

  const profile = await loadProfile(user);
  setAdminEntryVisible(Boolean(profile && profile.isAdmin) || isAdminAccount(user));
  resetAdminView();
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
      closeAdminScreen();
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
    closeAdminScreen();
    closeGameSelectScreen();
  });
}

if (adminEntryBtn) {
  adminEntryBtn.addEventListener("click", async () => {
    if (!isAdminUser) return;
    resetAdminView();
    openAdminScreen();
    try {
      await loadAdminUsers();
    } catch (error) {
      console.error(error);
      if (adminUserList) {
        adminUserList.innerHTML = '<div class="admin-empty">オンライン一覧の読み込みに失敗しました。</div>';
      }
      setAdminStatus("オンライン一覧の読み込みに失敗しました。");
    }
  });
}

if (adminCloseBtn) {
  adminCloseBtn.addEventListener("click", () => {
    closeAdminScreen();
  });
}

if (adminSearchInput) {
  adminSearchInput.addEventListener("input", () => {
    renderAdminUsers(adminSearchInput.value);
  });
}

if (adminAddCoinBtn) {
  adminAddCoinBtn.addEventListener("click", async () => {
    try {
      await applyAdminCoin("add");
    } catch (error) {
      console.error(error);
      setAdminStatus(error && error.message ? error.message : "コイン付与に失敗しました。");
    }
  });
}

if (adminRemoveCoinBtn) {
  adminRemoveCoinBtn.addEventListener("click", async () => {
    try {
      await applyAdminCoin("remove");
    } catch (error) {
      console.error(error);
      setAdminStatus(error && error.message ? error.message : "コイン没収に失敗しました。");
    }
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
