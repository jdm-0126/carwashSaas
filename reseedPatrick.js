import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp } from "firebase/firestore";

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

const EMAIL    = "patrick@sudzpro.com";
const PASSWORD = "Patrick@123";

const SERVICE_PRICES = {
  economy_small: 150,  economy_large: 200,  classic_small: 250,
  classic_large: 350,  vip_small: 450,      vip_large: 600,
  engine_wash: 350,    interior_sanitize: 500, wax_polish: 600,
  full_detail_small: 1200, full_detail_large: 1500,
  mobile_basic: 400,   mobile_full: 1500,
};

const CUSTOMERS = [
  { name: "Maria Santos",    phone: "+63 917 111 0001" },
  { name: "Juan dela Cruz",  phone: "+63 917 111 0002" },
  { name: "Ana Reyes",       phone: "+63 917 111 0003" },
  { name: "Carlo Mendoza",   phone: "+63 917 111 0004" },
  { name: "Liza Villanueva", phone: "+63 917 111 0005" },
  { name: "Mark Bautista",   phone: "+63 917 111 0006" },
  { name: "Jenny Flores",    phone: "+63 917 111 0007" },
  { name: "Rico Navarro",    phone: "+63 917 111 0008" },
  { name: "Trisha Gomez",    phone: "+63 917 111 0009" },
  { name: "Paolo Ramos",     phone: "+63 917 111 0010" },
];

const SERVICES = Object.keys(SERVICE_PRICES);
const STATUSES = ["paid","paid","paid","confirmed","pending","cancelled"];
const TIMES    = ["08:00","09:00","09:30","10:00","10:30","11:00","13:00","14:00","15:00","16:00","17:00"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

const bookings = [];
for (let i = 0; i < 12; i++) bookings.push({ customer: CUSTOMERS[0], serviceId: rand(["classic_small","vip_small","economy_small"]), daysAgo: i * 7 });
for (let i = 0; i < 9;  i++) bookings.push({ customer: CUSTOMERS[1], serviceId: rand(["classic_large","vip_large"]), daysAgo: i * 9 + 2 });
for (let i = 0; i < 7;  i++) bookings.push({ customer: CUSTOMERS[2], serviceId: rand(["full_detail_small","wax_polish"]), daysAgo: i * 12 + 1 });
for (let i = 0; i < 6;  i++) bookings.push({ customer: CUSTOMERS[3], serviceId: rand(["engine_wash","interior_sanitize"]), daysAgo: i * 14 + 3 });
for (let i = 0; i < 5;  i++) bookings.push({ customer: CUSTOMERS[4], serviceId: rand(["mobile_basic","mobile_full"]), daysAgo: i * 16 + 4 });
for (let c = 5; c < CUSTOMERS.length; c++) {
  const visits = Math.floor(Math.random() * 2) + 2;
  for (let i = 0; i < visits; i++)
    bookings.push({ customer: CUSTOMERS[c], serviceId: rand(SERVICES), daysAgo: Math.floor(Math.random() * 90) });
}
// Recent booking today
bookings.push({ customer: { name: "Ben Aquino", phone: "+63 917 999 0099" }, serviceId: "classic_small", daysAgo: 0 });

async function run() {
  const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  const uid  = cred.user.uid;
  console.log("Signed in:", EMAIL, "| UID:", uid);

  console.log("Deleting old demoBusiness bookings...");
  const old = await getDocs(query(collection(db, "bookings"), where("businessId", "==", "demoBusiness")));
  for (const d of old.docs) await deleteDoc(doc(db, "bookings", d.id));
  console.log(`Deleted ${old.size} old bookings`);

  console.log(`Seeding ${bookings.length} bookings for Patrick (${uid})...`);
  for (const b of bookings) {
    const date   = dateStr(b.daysAgo);
    const status = b.daysAgo === 0 ? "pending" : rand(STATUSES);
    await addDoc(collection(db, "bookings"), {
      businessId:   uid,
      customerName: b.customer.name,
      phone:        b.customer.phone,
      serviceId:    b.serviceId,
      date,
      time:         rand(TIMES),
      status,
      price:        SERVICE_PRICES[b.serviceId] || 0,
      notes:        null,
      createdAt:    Timestamp.fromDate(new Date(date + "T08:00:00")),
    });
    console.log(`  + ${b.customer.name} — ${b.serviceId} — ${date} — ${status}`);
  }

  console.log(`Done! ${bookings.length} bookings seeded.`);
  process.exit(0);
}

run().catch((e) => { console.error("Error:", e.message); process.exit(1); });
