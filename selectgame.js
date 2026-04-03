import {
  signInWithGoogle,
  signOutUser,
  onUserChanged,
} from "./shared/firebase.js";
import {
  getUserData,
  updateUserData,
} from "./shared/userDate.js";

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

const SELECTGAME_VOLUME_STORAGE_KEY = "selectgame_bgm_volume_v1";

let currentUser = null;
let currentProfile = null;
let isAdminUser = false;
let adminUsers = [];
let adminSelectedUid = "";
let stopOnlineUsersSubscription = null;
let selectgameBgmAudio = null;
let selectgameAudioUnlocked = false;
let selectgameSettingsButton = null;
let selectgameSettingsOverlay = null;
let selectgameVolumeSlider = null;
let selectgameVolumeValue = null;
const SELECTGAME_BGM_PATH = "./audio/bgm/seiseigame.wav";

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

function clampSelectgameVolume(value) {
  if (!Number.isFinite(Number(value))) return 100;
  return Math.max(0, Math.min(100, Number(value)));
}

function getStoredSelectgameVolume() {
  try {
    const raw = localStorage.getItem(SELECTGAME_VOLUME_STORAGE_KEY);
    return clampSelectgameVolume(raw == null ? 100 : Number(raw));
  } catch (error) {
    console.error(error);
    return 100;
  }
}

function saveStoredSelectgameVolume(value) {
  const safeValue = clampSelectgameVolume(value);
  try {
    localStorage.setItem(SELECTGAME_VOLUME_STORAGE_KEY, String(safeValue));
  } catch (error) {
    console.error(error);
  }
  return safeValue;
}

function applySelectgameBgmVolume() {
  if (!selectgameBgmAudio) return;
  selectgameBgmAudio.volume = getStoredSelectgameVolume() / 100;
}

function ensureSelectgameBgm() {
  if (selectgameBgmAudio) return selectgameBgmAudio;
  try {
    const audio = new Audio(SELECTGAME_BGM_PATH);
    audio.loop = true;
    audio.preload = "auto";
    audio.playsInline = true;
    selectgameBgmAudio = audio;
    applySelectgameBgmVolume();
  } catch (error) {
    console.error(error);
  }
  return selectgameBgmAudio;
}

function primeSelectgameBgmFromGesture() {
  const audio = ensureSelectgameBgm();
  if (!audio || selectgameAudioUnlocked) return;
  try {
    applySelectgameBgmVolume();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function() {
        selectgameAudioUnlocked = true;
        audio.pause();
        audio.currentTime = 0;
      }).catch(function(error) {
        console.error(error);
      });
      return;
    }
    selectgameAudioUnlocked = true;
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    console.error(error);
  }
}

function ensureSelectgameSettingsUi() {
  if (selectgameSettingsOverlay && selectgameSettingsButton) return;
  if (!gameSelectScreen) return;

  if (!selectgameSettingsButton) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "音量";
    button.style.position = "absolute";
    button.style.top = "18px";
    button.style.right = "18px";
    button.style.width = "88px";
    button.style.height = "42px";
    button.style.border = "1px solid rgba(255,255,255,0.14)";
    button.style.borderRadius = "12px";
    button.style.background = "rgba(20,16,36,0.82)";
    button.style.color = "#f8f5ff";
    button.style.fontSize = "14px";
    button.style.fontWeight = "900";
    button.style.zIndex = "3";
    button.addEventListener("click", function(event) {
      event.stopPropagation();
      openSelectgameSettings();
    });
    gameSelectScreen.appendChild(button);
    selectgameSettingsButton = button;
  }

  if (!selectgameSettingsOverlay) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";
    overlay.style.background = "rgba(3,6,16,0.62)";
    overlay.style.backdropFilter = "blur(10px)";
    overlay.style.zIndex = "20";

    const modal = document.createElement("div");
    modal.style.width = "min(100%, 420px)";
    modal.style.padding = "20px";
    modal.style.borderRadius = "22px";
    modal.style.border = "1px solid rgba(255,255,255,0.12)";
    modal.style.background = "rgba(18,10,36,0.96)";
    modal.style.boxShadow = "0 26px 80px rgba(0,0,0,0.42)";

    const title = document.createElement("div");
    title.textContent = "ゲームセレクト音量";
    title.style.fontSize = "20px";
    title.style.fontWeight = "900";
    title.style.color = "#f8f5ff";
    title.style.marginBottom = "14px";

    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gap = "8px";

    const labelRow = document.createElement("div");
    labelRow.style.display = "flex";
    labelRow.style.alignItems = "center";
    labelRow.style.justifyContent = "space-between";
    labelRow.style.gap = "8px";

    const label = document.createElement("div");
    label.textContent = "BGM";
    label.style.fontSize = "14px";
    label.style.fontWeight = "800";
    label.style.color = "#f8f5ff";

    const value = document.createElement("div");
    value.style.fontSize = "13px";
    value.style.color = "rgba(248,245,255,0.78)";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.style.width = "100%";
    slider.addEventListener("input", function() {
      const safeValue = saveStoredSelectgameVolume(slider.value);
      value.textContent = String(safeValue);
      applySelectgameBgmVolume();
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "閉じる";
    closeButton.style.width = "100%";
    closeButton.style.height = "46px";
    closeButton.style.marginTop = "16px";
    closeButton.style.border = "1px solid rgba(255,255,255,0.14)";
    closeButton.style.borderRadius = "14px";
    closeButton.style.background = "rgba(255,255,255,0.08)";
    closeButton.style.color = "#f8f5ff";
    closeButton.style.fontSize = "15px";
    closeButton.style.fontWeight = "900";
    closeButton.addEventListener("click", function() {
      closeSelectgameSettings();
    });

    labelRow.appendChild(label);
    labelRow.appendChild(value);
    row.appendChild(labelRow);
    row.appendChild(slider);
    modal.appendChild(title);
    modal.appendChild(row);
    modal.appendChild(closeButton);
    overlay.appendChild(modal);
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) closeSelectgameSettings();
    });
    document.body.appendChild(overlay);
    selectgameSettingsOverlay = overlay;
    selectgameVolumeSlider = slider;
    selectgameVolumeValue = value;
  }
}

function openSelectgameSettings() {
  ensureSelectgameSettingsUi();
  if (!selectgameSettingsOverlay) return;
  const currentVolume = getStoredSelectgameVolume();
  if (selectgameVolumeSlider) selectgameVolumeSlider.value = String(currentVolume);
  if (selectgameVolumeValue) selectgameVolumeValue.textContent = String(currentVolume);
  selectgameSettingsOverlay.style.display = "flex";
}

function closeSelectgameSettings() {
  if (!selectgameSettingsOverlay) return;
  selectgameSettingsOverlay.style.display = "none";
}

function syncSelectgameSettingsVisibility() {
  ensureSelectgameSettingsUi();
  if (!selectgameSettingsButton) return;
  const open = !!(gameSelectScreen && gameSelectScreen.classList.contains("show"));
  selectgameSettingsButton.style.display = open ? "inline-flex" : "none";
  selectgameSettingsButton.style.alignItems = "center";
  selectgameSettingsButton.style.justifyContent = "center";
  if (!open) closeSelectgameSettings();
}

function playSelectgameBgm() {
  const audio = ensureSelectgameBgm();
  if (!audio) return;
  try {
    applySelectgameBgmVolume();
    if (!audio.paused) return;
    audio.play().then(function() {
      selectgameAudioUnlocked = true;
    }).catch(function(error) {
      console.error(error);
    });
  } catch (error) {
    console.error(error);
  }
}

function stopSelectgameBgm() {
  if (!selectgameBgmAudio) return;
  try {
    selectgameBgmAudio.pause();
    selectgameBgmAudio.currentTime = 0;
  } catch (error) {
    console.error(error);
  }
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

async function getAdminDataModule() {
  return import("./shared/userDate.js");
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
    adminUserList.innerHTML = '<div class="admin-empty">読み込み中です。</div>';
  }
  setAdminStatus("");

  const adminModule = await getAdminDataModule();
  const getAllUsersData = adminModule && typeof adminModule.getAllUsersData === "function"
    ? adminModule.getAllUsersData
    : null;

  if (!getAllUsersData) {
    if (adminUserList) {
      adminUserList.innerHTML = '<div class="admin-empty">一覧取得の接続に失敗しました。</div>';
    }
    setAdminStatus("一覧取得の接続に失敗しました。");
    return;
  }

  const list = await getAllUsersData(currentUser);
  adminUsers = Array.isArray(list) ? list : [];
  renderAdminUsers(adminSearchInput ? adminSearchInput.value : "");
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

  const adminModule = await getAdminDataModule();
  const addUserCoinByUid = adminModule && typeof adminModule.addUserCoinByUid === "function"
    ? adminModule.addUserCoinByUid
    : null;
  const useUserCoinByUid = adminModule && typeof adminModule.useUserCoinByUid === "function"
    ? adminModule.useUserCoinByUid
    : null;

  if ((mode === "add" && !addUserCoinByUid) || (mode !== "add" && !useUserCoinByUid)) {
    setAdminStatus("コイン操作の接続に失敗しました。");
    return;
  }

  setAdminStatus("更新中です。");

  const updated = mode === "add"
    ? await addUserCoinByUid(adminSelectedUid, amount, currentUser)
    : await useUserCoinByUid(adminSelectedUid, amount, currentUser);

  adminUsers = adminUsers.map((user) => user.uid === updated.uid ? updated : user);
  renderAdminUsers(adminSearchInput ? adminSearchInput.value : "");

  if (adminSelectedUser) {
    adminSelectedUser.textContent = `${updated.nickname || updated.name || "名前なし"} / ${updated.email || "オンライン中"} / ${Number.isFinite(Number(updated.coin)) ? `コイン: ${Number(updated.coin)}` : "オンライン中"}`;
  }

  if (currentUser && updated.uid === currentUser.uid) {
    currentProfile = {
      ...(currentProfile || {}),
      ...updated,
      isAdmin: true,
    };
    applyProfileToGameSelect(currentProfile, currentUser);
  }

  if (adminCoinInput) adminCoinInput.value = "";
  setAdminStatus(mode === "add" ? "コインを付与しました。" : "コインを没収しました。");
}

async function loadProfile(user) {
  try {
    const data = await getUserData(user);
    currentProfile = data;
    isAdminUser = Boolean(data && data.isAdmin) || isAdminAccount(user);
    applyProfileToGameSelect(data, user);
    return data;
  } catch (error) {
    console.error(error);
    const fallback = {
      nickname: "",
      coin: 0,
      isAdmin: isAdminAccount(user),
    };
    currentProfile = fallback;
    isAdminUser = fallback.isAdmin;
    applyProfileToGameSelect(fallback, user);
    return fallback;
  }
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
  const nickname = profile && profile.nickname ? profile.nickname : "ニックネーム未設定";
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

async function ensureNicknameBeforeOpen() {
  if (!currentUser) return false;
  const data = await loadProfile(currentUser);
  const nickname = sanitizeNickname((data && data.nickname) || "");
  if (nickname) return true;
  openNicknameModal("");
  return false;
}

function openGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.add("show");
  }
  syncSelectgameSettingsVisibility();
  playSelectgameBgm();
}

function closeGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.remove("show");
  }
  syncSelectgameSettingsVisibility();
  stopSelectgameBgm();
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
    primeSelectgameBgmFromGesture();
    try {
      const canOpen = await ensureNicknameBeforeOpen();
      if (!canOpen) {
        stopSelectgameBgm();
        return;
      }
      closeAdminScreen();
      openGameSelectScreen();
    } catch (error) {
      console.error(error);
      stopSelectgameBgm();
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
      await updateUserData({ nickname }, currentUser);
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

document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    stopSelectgameBgm();
    return;
  }
  if (gameSelectScreen && gameSelectScreen.classList.contains("show")) {
    playSelectgameBgm();
  }
});

window.addEventListener("beforeunload", function() {
  stopSelectgameBgm();
});

syncSelectgameSettingsVisibility();

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
