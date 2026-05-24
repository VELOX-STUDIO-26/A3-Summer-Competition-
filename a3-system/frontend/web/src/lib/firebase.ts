import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";

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

// Initialize Firebase Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Google Sign In
export async function signInWithGoogle(rememberMe: boolean = false) {
  try {
    // Set persistence based on "Remember Me" checkbox
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return { 
      success: true, 
      user: {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
        photoURL: user.photoURL
      }
    };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    return { 
      success: false, 
      error: error.code === "auth/popup-closed-by-user" 
        ? "Sign in cancelled" 
        : error.message 
    };
  }
}

// Send Password Reset Email
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error("Password reset error:", error);
    let message = "Failed to send reset email";
    if (error.code === "auth/user-not-found") {
      message = "No account found with this email";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
    }
    return { success: false, error: message };
  }
}

// Sign Out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: false, error };
  }
}

// Auth State Observer
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Email/Password Sign Up
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  try {
    // Set persistence to local (remember user)
    await setPersistence(auth, browserLocalPersistence);
    
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's display name
    await updateProfile(result.user, { displayName });
    
    // Send email verification (optional but recommended)
    // await sendEmailVerification(result.user);
    
    return {
      success: true,
      user: {
        email: result.user.email,
        name: displayName,
        uid: result.user.uid,
        photoURL: result.user.photoURL
      }
    };
  } catch (error: any) {
    console.error("Email sign up error:", error);
    let message = "Sign up failed";
    
    switch (error.code) {
      case "auth/email-already-in-use":
        message = "An account with this email already exists";
        break;
      case "auth/invalid-email":
        message = "Invalid email address";
        break;
      case "auth/weak-password":
        message = "Password should be at least 6 characters";
        break;
      case "auth/operation-not-allowed":
        message = "Email/password sign up is not enabled. Please contact support.";
        break;
    }
    
    return { success: false, error: message };
  }
}

// Email/Password Sign In
export async function signInWithEmail(email: string, password: string, rememberMe: boolean = false) {
  try {
    // Set persistence based on "Remember Me"
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    return {
      success: true,
      user: {
        email: result.user.email,
        name: result.user.displayName,
        uid: result.user.uid,
        photoURL: result.user.photoURL
      }
    };
  } catch (error: any) {
    console.error("Email sign in error:", error);
    let message = "Sign in failed";
    
    switch (error.code) {
      case "auth/user-not-found":
        message = "No account found with this email";
        break;
      case "auth/wrong-password":
        message = "Incorrect password";
        break;
      case "auth/invalid-email":
        message = "Invalid email address";
        break;
      case "auth/user-disabled":
        message = "This account has been disabled";
        break;
      case "auth/invalid-credential":
        message = "Invalid email or password";
        break;
    }
    
    return { success: false, error: message };
  }
}

export { app, db, analytics, auth };
