"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Ambil tambahan data (seperti peran 'admin' atau 'member') dari Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ ...firebaseUser, ...userDoc.data() });
          } else {
            setUser(firebaseUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // Mode Demo Tanpa Database
  const loginAsDemoAdmin = () => {
    setUser({ uid: "demo-admin", email: "admin@demo.com", peran: "admin", nama: "Admin KKN (Demo)" });
  };

  const loginAsDemoMember = () => {
    setUser({ uid: "demo-member", email: "member@demo.com", peran: "member", nama: "Anggota (Demo)" });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, loginAsDemoAdmin, loginAsDemoMember }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
