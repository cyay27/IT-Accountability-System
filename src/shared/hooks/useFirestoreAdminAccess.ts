import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, adminUid, isAdminUidConfigured, isFirebaseConfigured } from "../firebase/firebase";

export const useFirestoreAdminAccess = () => {
  const [canQueryFirestore, setCanQueryFirestore] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !isAdminUidConfigured) {
      setCanQueryFirestore(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCanQueryFirestore(Boolean(user && user.uid === adminUid));
    });

    return () => unsubscribe();
  }, []);

  return canQueryFirestore;
};