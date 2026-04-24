import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDaDSipb1mJsWQczUM28QK5d4pqk0-lexw",
  authDomain: "carwash-saas-da4b2.firebaseapp.com",
  projectId: "carwash-saas-da4b2",
  storageBucket: "carwash-saas-da4b2.firebasestorage.app",
  messagingSenderId: "455006204030",
  appId: "1:455006204030:web:3d6877ff25d5fab819282f",
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);
