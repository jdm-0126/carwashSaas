import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaDSipb1mJsWQczUM28QK5d4pqk0-lexw",
  authDomain: "carwash-saas-da4b2.firebaseapp.com",
  projectId: "carwash-saas-da4b2",
  storageBucket: "carwash-saas-da4b2.firebasestorage.app",
  messagingSenderId: "455006204030",
  appId: "1:455006204030:web:3d6877ff25d5fab819282f",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const EMAIL    = process.env.OWNER_EMAIL;
const PASSWORD = process.env.OWNER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Usage: OWNER_EMAIL=patrick@sudzpro.com OWNER_PASSWORD=pass node --input-type=module < setupOwner.js");
  process.exit(1);
}

async function setup() {
  const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  const uid  = cred.user.uid;
  console.log("✅ Signed in as:", EMAIL, "| UID:", uid);

  await setDoc(doc(db, "businesses", uid), {
    name:    "Patrick's Car Wash",
    slug:    "patricks-carwash",
    phone:   "+63 917 000 0001",
    address: "Quezon City, Metro Manila",
    plan:    "starter",
    active:  true,
    ownerId: uid,
    businessHours: null,
    createdAt: Timestamp.now(),
  });

  console.log("✅ Business created for Patrick — UID:", uid);
  console.log("📎 Booking URL: /book/patricks-carwash");
  process.exit(0);
}

setup().catch((e) => { console.error("❌", e.message); process.exit(1); });
