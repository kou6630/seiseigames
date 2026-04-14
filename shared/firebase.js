import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  child,
  onValue,
  off,
  get,
  set,
  update,
  remove,
  onDisconnect,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCesYWcJoOVxkrWAONVaGFDIncqzx6v3J4",
  authDomain: "seiseigames-94865.firebaseapp.com",
  projectId: "seiseigames-94865",
  storageBucket: "seiseigames-94865.firebasestorage.app",
  messagingSenderId: "1085463396110",
  appId: "1:1085463396110:web:67a89cdf6927c21d60615f",
  databaseURL: "https://seiseigames-94865-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { app, auth, db, googleProvider, ref, child, onValue, off, get, set, update, remove, onDisconnect, runTransaction };

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export function onUserChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function requireLogin(onLoggedIn, onLoggedOut) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      if (typeof onLoggedIn === "function") onLoggedIn(user);
      return;
    }
    if (typeof onLoggedOut === "function") onLoggedOut();
  });
}

