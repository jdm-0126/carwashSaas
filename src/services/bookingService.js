import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, getCountFromServer, query, where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const PLAN_LIMITS = { starter: 10, pro: 500, enterprise: Infinity };

export const getBookingCount = async (businessId) => {
  const q    = query(collection(db, "bookings"), where("businessId", "==", businessId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
};

// Get confirmed bookings for a date to check slot availability
export const getConfirmedSlotsForDate = async (businessId, date) => {
  const q    = query(collection(db, "bookings"),
    where("businessId", "==", businessId),
    where("date", "==", date),
    where("status", "in", ["confirmed", "paid"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().time);
};

// Upload payment proof image and return URL
export const uploadPaymentProof = async (businessId, refNumber, file) => {
  const r   = ref(storage, `payments/${businessId}/${refNumber}`);
  await uploadBytes(r, file);
  return getDownloadURL(r);
};

export const createBooking = async (data) => {
  const plan  = data.plan || "starter";
  const limit = PLAN_LIMITS[plan] ?? 10;

  if (limit !== Infinity) {
    const count = await getBookingCount(data.businessId);
    if (count >= limit) throw new Error(`PLAN_LIMIT:${limit}`);
  }

  const refNumber = "SZ-" + Date.now().toString(36).toUpperCase().slice(-6);
  await addDoc(collection(db, "bookings"), {
    businessId:   data.businessId,
    serviceId:    data.serviceId,
    serviceName:  data.serviceName  || null,
    customerName: data.customerName,
    phone:        data.phone,
    vehicleSize:  data.vehicleSize  || null,
    date:         data.date,
    time:         data.time,
    notes:        data.notes        || null,
    price:        data.price        || null,
    paymentProof: data.paymentProof || null,
    paymentMethod:data.paymentMethod|| null,
    status:       data.paymentProof ? "for_review" : "pending",
    refNumber,
    createdAt:    Timestamp.now(),
  });
  return refNumber;
};

export const updateBookingStatus = async (bookingId, status) => {
  await updateDoc(doc(db, "bookings", bookingId), { status, updatedAt: Timestamp.now() });
};

export const updatePaymentProof = async (bookingId, paymentProof, paymentMethod) => {
  await updateDoc(doc(db, "bookings", bookingId), { paymentProof, paymentMethod, status: "for_review", updatedAt: Timestamp.now() });
};

export const getBookingsByBusiness = async (businessId) => {
  const q    = query(collection(db, "bookings"), where("businessId", "==", businessId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
