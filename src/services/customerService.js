import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";

// data: { name, phone, email? }
export const createCustomer = async (businessId, data) => {
  await addDoc(collection(db, "customers"), {
    businessId,
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    visitCount: 1,
    lastVisit: Timestamp.now(),
    createdAt: Timestamp.now(),
  });
};

export const getCustomersByBusiness = async (businessId) => {
  const q = query(
    collection(db, "customers"),
    where("businessId", "==", businessId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
