import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyDaDSipb1mJsWQczUM28QK5d4pqk0-lexw",
  authDomain: "carwash-saas-da4b2.firebaseapp.com",
  projectId: "carwash-saas-da4b2",
  storageBucket: "carwash-saas-da4b2.firebasestorage.app",
  messagingSenderId: "455006204030",
  appId: "1:455006204030:web:3d6877ff25d5fab819282f",
});
const auth = getAuth(app);
const db   = getFirestore(app);

const SERVICES = [
  {
    name: "Motorcycle Wash",
    sizes: { "Sub-Compact": 250, "Small": 300 },
    inclusions: ["Exterior wash", "Tire cleaning", "Chain wipe"],
  },
  {
    name: "Premium Car Wash",
    sizes: { "Sub-Compact": 300, "Small": 350, "Medium": 400, "Large": 450, "X-Large": 500 },
    inclusions: ["Exterior wash", "Interior vacuum", "Dashboard wipe", "Glass cleaner", "Tire shine"],
  },
  {
    name: "Back to Zero",
    sizes: { "Sub-Compact": 200, "Small": 250, "Medium": 250, "Large": 300, "X-Large": 350 },
    inclusions: ["Full exterior wash", "Clay bar treatment", "Surface decontamination"],
  },
  {
    name: "Engine Wash",
    sizes: { "Sub-Compact": 350, "Small": 400, "Medium": 450, "Large": 500, "X-Large": 500 },
    inclusions: ["Engine bay degreasing", "Engine bay rinse", "Engine bay wipe"],
  },
  {
    name: "Acid Rain Removal",
    sizes: { "Sub-Compact": 250, "Small": 250, "Medium": 300, "Large": 300, "X-Large": 400 },
    inclusions: ["Chemical treatment", "Paint decontamination", "Surface polish"],
  },
  {
    name: "Asphalt Removal",
    sizes: { "Sub-Compact": 300, "Small": 350, "Medium": 400, "Large": 450, "X-Large": 500 },
    inclusions: ["Tar & asphalt removal", "Paint-safe solvent", "Surface rinse"],
  },
  {
    name: "Hand Wax",
    sizes: { "Sub-Compact": 200, "Small": 250, "Medium": 300, "Large": 350, "X-Large": 400 },
    inclusions: ["Hand wax application", "Buff & shine", "Paint protection"],
  },
  {
    name: "Buffing Wax",
    sizes: { "Sub-Compact": 400, "Small": 500, "Medium": 550, "Large": 600, "X-Large": 700 },
    inclusions: ["Machine buffing", "Wax application", "High-gloss finish"],
  },
];

async function seed() {
  const cred = await signInWithEmailAndPassword(auth, "patrick@sudzpro.com", "Patrick@123");
  const uid  = cred.user.uid;
  console.log("Signed in:", cred.user.email, "| UID:", uid);

  // Delete existing services
  const existing = await getDocs(query(collection(db, "services"), where("businessId", "==", uid)));
  for (const d of existing.docs) await deleteDoc(doc(db, "services", d.id));
  console.log(`Deleted ${existing.size} old services`);

  // Add new services
  for (const svc of SERVICES) {
    await addDoc(collection(db, "services"), {
      businessId: uid,
      name:       svc.name,
      sizes:      svc.sizes,
      inclusions: svc.inclusions,
      isPackage:  true,
      createdAt:  Timestamp.now(),
    });
    console.log(`✅ ${svc.name}`);
  }

  console.log(`\nDone! ${SERVICES.length} services seeded for Patrick.`);
  process.exit(0);
}

seed().catch((e) => { console.error("Error:", e.message); process.exit(1); });
