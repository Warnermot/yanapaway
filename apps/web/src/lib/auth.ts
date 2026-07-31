import { signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const TOKEN_KEY = "yanapaway_firebase_token";
const USER_KEY = "yanapaway_firebase_user";

export function uidToUserId(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0;
  }
  return Math.abs(hash);
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
  }));
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): { uid: string; email: string; displayName: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId(): number | null {
  const user = getStoredUser();
  if (!user) return null;
  return uidToUserId(user.uid);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      }));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    callback(user);
  });
}
