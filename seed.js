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
const db = getFirestore(app);

const bookings = [
  { customerName: "James Carter",    phone: "+1 555-101-0001", serviceId: "basic_wash",    date: "2025-05-01", time: "09:00", status: "confirmed", notes: "" },
  { customerName: "Maria Lopez",     phone: "+1 555-101-0002", serviceId: "full_detail",   date: "2025-05-01", time: "10:30", status: "confirmed", notes: "Please use eco-friendly products" },
  { customerName: "David Kim",       phone: "+1 555-101-0003", serviceId: "premium_wash",  date: "2025-05-02", time: "08:00", status: "pending",   notes: "" },
  { customerName: "Sarah Johnson",   phone: "+1 555-101-0004", serviceId: "interior_clean",date: "2025-05-02", time: "11:00", status: "confirmed", notes: "Dog hair removal needed" },
  { customerName: "Tom Williams",    phone: "+1 555-101-0005", serviceId: "basic_wash",    date: "2025-05-03", time: "14:00", status: "pending",   notes: "" },
  { customerName: "Emily Chen",      phone: "+1 555-101-0006", serviceId: "full_detail",   date: "2025-05-03", time: "15:30", status: "confirmed", notes: "" },
  { customerName: "Marcus Brown",    phone: "+1 555-101-0007", serviceId: "premium_wash",  date: "2025-05-04", time: "09:30", status: "pending",   notes: "Black SUV" },
  { customerName: "Olivia Davis",    phone: "+1 555-101-0008", serviceId: "interior_clean",date: "2025-05-04", time: "13:00", status: "confirmed", notes: "" },
  { customerName: "Ryan Martinez",   phone: "+1 555-101-0009", serviceId: "basic_wash",    date: "2025-05-05", time: "10:00", status: "cancelled", notes: "" },
  { customerName: "Priya Patel",     phone: "+1 555-101-0010", serviceId: "full_detail",   date: "2025-05-05", time: "16:00", status: "pending",   notes: "White sedan" },
];

async function seed() {
  console.log("Seeding bookings...");
  for (const booking of bookings) {
    await addDoc(collection(db, "bookings"), {
      ...booking,
      businessId: "demoBusiness",
      createdAt: Timestamp.now(),
    });
    console.log(`✅ Added: ${booking.customerName}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
