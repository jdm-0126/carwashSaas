import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaDSipb1mJsWQczUM28QK5d4pqk0-lexw",
  authDomain: "carwash-saas-da4b2.firebaseapp.com",
  projectId: "carwash-saas-da4b2",
  storageBucket: "carwash-saas-da4b2.firebasestorage.app",
  messagingSenderId: "455006204030",
  appId: "1:455006204030:web:3d6877ff25d5fab819282f",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const SERVICE_PRICES = {
  economy_small:     150,  economy_large:     200,
  classic_small:     250,  classic_large:     350,
  vip_small:         450,  vip_large:         600,
  engine_wash:       350,  interior_sanitize: 500,
  wax_polish:        600,  full_detail_small: 1200,
  full_detail_large: 1500, mobile_basic:      400,
  mobile_full:       1500,
};

// Frequent customers (will appear multiple times)
const CUSTOMERS = [
  { name: "Maria Santos",   phone: "+63 917 111 0001" },
  { name: "Juan dela Cruz", phone: "+63 917 111 0002" },
  { name: "Ana Reyes",      phone: "+63 917 111 0003" },
  { name: "Carlo Mendoza",  phone: "+63 917 111 0004" },
  { name: "Liza Villanueva",phone: "+63 917 111 0005" },
  { name: "Mark Bautista",  phone: "+63 917 111 0006" },
  { name: "Jenny Flores",   phone: "+63 917 111 0007" },
  { name: "Rico Navarro",   phone: "+63 917 111 0008" },
  { name: "Trisha Gomez",   phone: "+63 917 111 0009" },
  { name: "Paolo Ramos",    phone: "+63 917 111 0010" },
];

const SERVICES    = Object.keys(SERVICE_PRICES);
const STATUSES    = ["paid", "paid", "paid", "confirmed", "pending", "cancelled"];
const TIMES       = ["08:00","09:00","09:30","10:00","10:30","11:00","13:00","14:00","14:30","15:00","16:00","17:00"];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function tsFromDateStr(str) {
  return Timestamp.fromDate(new Date(str + "T08:00:00"));
}

// Build bookings — spread over 90 days, frequent customers repeat
const bookings = [];

// Maria Santos — most frequent (12 visits)
for (let i = 0; i < 12; i++) {
  bookings.push({ customer: CUSTOMERS[0], serviceId: randomFrom(["classic_small","vip_small","economy_small"]), daysAgo: i * 7 });
}
// Juan dela Cruz — 9 visits
for (let i = 0; i < 9; i++) {
  bookings.push({ customer: CUSTOMERS[1], serviceId: randomFrom(["classic_large","vip_large"]), daysAgo: i * 9 + 2 });
}
// Ana Reyes — 7 visits
for (let i = 0; i < 7; i++) {
  bookings.push({ customer: CUSTOMERS[2], serviceId: randomFrom(["full_detail_small","wax_polish"]), daysAgo: i * 12 + 1 });
}
// Carlo Mendoza — 6 visits
for (let i = 0; i < 6; i++) {
  bookings.push({ customer: CUSTOMERS[3], serviceId: randomFrom(["engine_wash","interior_sanitize"]), daysAgo: i * 14 + 3 });
}
// Liza Villanueva — 5 visits
for (let i = 0; i < 5; i++) {
  bookings.push({ customer: CUSTOMERS[4], serviceId: randomFrom(["mobile_basic","mobile_full"]), daysAgo: i * 16 + 4 });
}
// Remaining customers — 2–3 visits each
for (let c = 5; c < CUSTOMERS.length; c++) {
  const visits = Math.floor(Math.random() * 2) + 2;
  for (let i = 0; i < visits; i++) {
    bookings.push({ customer: CUSTOMERS[c], serviceId: randomFrom(SERVICES), daysAgo: Math.floor(Math.random() * 90) });
  }
}

async function seed() {
  console.log(`Seeding ${bookings.length} bookings for Patrick's carwash...`);
  for (const b of bookings) {
    const date   = dateStr(b.daysAgo);
    const status = randomFrom(STATUSES);
    const price  = SERVICE_PRICES[b.serviceId] || 0;
    await addDoc(collection(db, "bookings"), {
      businessId:   "demoBusiness",
      customerName: b.customer.name,
      phone:        b.customer.phone,
      serviceId:    b.serviceId,
      date,
      time:         randomFrom(TIMES),
      status,
      price,
      notes:        null,
      createdAt:    tsFromDateStr(date),
    });
    console.log(`✅ ${b.customer.name} — ${b.serviceId} — ${date} — ${status}`);
  }
  console.log("\nDone! Total:", bookings.length);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
