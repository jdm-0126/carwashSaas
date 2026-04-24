import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../services/firebase";
import { getBusiness } from "../services/businessService";
import {
  onAuthStateChanged, signInAnonymously,
  signInWithEmailAndPassword, signOut,
} from "firebase/auth";

const SUPERADMIN_EMAILS = ["jojo@pulseops.com", "jojo0126@pulseops.com"];

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState("guest");   // "superadmin" | "owner" | "guest"
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u || u.isAnonymous) {
        setRole("guest");
        setBusiness(null);
      } else if (SUPERADMIN_EMAILS.includes(u.email)) {
        setRole("superadmin");
        setBusiness(null);
      } else {
        // regular owner — load their business
        const biz = await getBusiness(u.uid);
        setRole("owner");
        setBusiness(biz);
      }
      setLoading(false);
    });
    signInAnonymously(auth);
    return () => unsub();
  }, []);

  const refreshBusiness = async () => {
    if (!user || user.isAnonymous) return;
    const biz = await getBusiness(user.uid);
    setBusiness(biz);
  };

  const loginAsOwner = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => {
    setLoading(true);
    return signOut(auth).then(() => signInAnonymously(auth));
  };

  return (
    <AuthContext.Provider value={{ user, role, business, loading, loginAsOwner, logout, refreshBusiness }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
