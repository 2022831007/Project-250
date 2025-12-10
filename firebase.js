// firebase.js
// Initialize Firebase (modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvuTIs3rF4UNCllE8zDNq9_LiRPGfuT9M",
  authDomain: "bookbuddies-22c4b.firebaseapp.com",
  projectId: "bookbuddies-22c4b",
  storageBucket: "bookbuddies-22c4b.firebasestorage.app",
  messagingSenderId: "6973857430",
  appId: "1:6973857430:web:a202a0ead0f53983b3ecb7",
  measurementId: "G-NMR9EZYWCX",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
