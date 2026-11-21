import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
};

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const configured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith("YOUR_") &&
  !firebaseConfig.projectId.startsWith("YOUR_")
);

export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export function isFirebaseConfigured() {
  return configured;
}

export async function initFirebaseServices() {
  if (!configured || !app || !auth || !db) return null;
  return { app, auth, db };
}

export async function signInWithGooglePopup(remember = true) {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signInWithEmail(email, password, remember = true) {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password, displayName, remember = true) {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function signOutUser() {
  if (!auth) return;
  return signOut(auth);
}

export function watchAuthState(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function fetchCloudClasses() {
  if (!db) return [];
  const q = query(collection(db, "classes"), orderBy("dateTime", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function addCloudClass(session) {
  if (!db) throw new Error("Firestore is not configured.");
  return addDoc(collection(db, "classes"), {
    title: session.title,
    topic: session.topic,
    dateTime: session.dateTime,
    host: session.host,
    meetUrl: session.meetUrl,
    createdBy: auth && auth.currentUser ? auth.currentUser.uid : null
  });
}
