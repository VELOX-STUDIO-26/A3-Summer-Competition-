import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA5hw3K1EPOAjSRPNRtgfi-1Gfs1wUmqfE",
  authDomain: "nobogyan.firebaseapp.com",
  projectId: "nobogyan",
  storageBucket: "nobogyan.firebasestorage.app",
  messagingSenderId: "749065921297",
  appId: "1:749065921297:web:779f5d2bffa060093162b0",
  measurementId: "G-MS0JQ9C01S"
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics (only in browser)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported: boolean) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Waitlist submission function
export async function addToWaitlist(email: string, source: string = "hero") {
  try {
    const docRef = await addDoc(collection(db, "waitlist"), {
      email: email.toLowerCase().trim(),
      source,
      createdAt: serverTimestamp(),
      status: "pending"
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return { success: false, error };
  }
}

export { app, db, analytics };
