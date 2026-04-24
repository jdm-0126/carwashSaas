import { db } from "./firebase";
import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, Timestamp, updateDoc } from "firebase/firestore";

export const createBusiness = async (userId, data) => {
  await setDoc(doc(db, "businesses", userId), {
    name:          data.name,
    slug:          data.slug,
    description:   data.description  || null,
    address:       data.address      || null,
    phone:         data.phone        || null,
    plan:          data.plan         || "starter",
    active:        data.active       ?? true,
    businessHours: data.businessHours || null,
    ownerId:       userId,
    createdAt:     Timestamp.now(),
  });
};

export const getBusiness = async (userId) => {
  const snap = await getDoc(doc(db, "businesses", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getBusinessBySlug = async (slug) => {
  const q = query(collection(db, "businesses"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getAllBusinesses = async () => {
  const snap = await getDocs(collection(db, "businesses"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateBusiness = async (userId, data) => {
  await updateDoc(doc(db, "businesses", userId), data);
};
