"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { loginWithGoogle } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { signInWithGoogle, signUpWithEmail } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const { setStudentId, setProfile, setUserName, setUserEmail, logout } = useAppStore();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    university: "",
    password: "",
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogle(true);
      
      if (!result.success) {
        setError(result.error || "Google sign up failed");
        return;
      }

      const data = await loginWithGoogle({
        email: result.user!.email!,
        name: result.user!.name || result.user!.email!.split("@")[0],
        firebase_uid: result.user!.uid,
        photo_url: result.user!.photoURL || undefined,
      });

      logout();
      setStudentId(data.student_id);
      setProfile(data.profile);
      setUserName(data.name || data.email.split("@")[0]);
      setUserEmail(data.email);
      setFormData({ ...formData, name: data.name || "", email: data.email });
      setStep("verify");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Google signup failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Step 1: Create Firebase Auth account
      const firebaseResult = await signUpWithEmail(formData.email, formData.password, formData.name);
      
      if (!firebaseResult.success) {
        setError(firebaseResult.error || "Registration failed");
        return;
      }

      // Step 2: Create backend profile
      const data = await loginWithGoogle({
        email: firebaseResult.user!.email!,
        name: firebaseResult.user!.name || formData.name,
        firebase_uid: firebaseResult.user!.uid,
        photo_url: firebaseResult.user!.photoURL || undefined,
      });
      
      // Clear any existing user data and set new user
      logout();
      console.log("Registration successful, student_id:", data.student_id);
      setStudentId(data.student_id);
      setProfile(data.profile || null);
      setUserName(data.name || formData.name);
      setUserEmail(data.email || formData.email);
      
      setStep("verify");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const isNetworkError = e?.code === "ERR_NETWORK" || e?.message?.includes("Network Error");

      if (isNetworkError) {
        setError("Cannot connect to server. Please make sure the backend is running.");
      } else {
        setError(typeof detail === "string" ? detail : "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-sage-600" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-deep-charcoal mb-3">
          Account Created!
        </h2>
        <p className="text-charcoal-400 mb-6">
          Welcome, <span className="text-deep-charcoal font-medium">{formData.name}</span>!
          <br />
          Let&apos;s build your personalized learning profile.
        </p>
        <Link
          href="/profile-chat"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors"
        >
          Start Profile Setup
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <button
          onClick={() => setStep("form")}
          className="block mx-auto mt-4 text-sm text-charcoal-400 hover:text-deep-charcoal transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Logo */}
      <div className="lg:hidden flex items-center gap-2 mb-6">
        <Image 
          src="/nobogyan-logo.png" 
          alt="NOBOGYAN" 
          width={40}
          height={40}
          className="w-10 h-10"
        />
        <span className="font-serif font-semibold text-deep-charcoal">NOBOGYAN</span>
      </div>

      <h2 className="text-2xl font-serif font-bold text-deep-charcoal mb-2">
        Create Your Account
      </h2>
      <p className="text-charcoal-400 mb-6">
        Start your personalized learning journey today.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            className="w-full px-4 py-3 rounded-lg border border-sand-300 bg-white text-deep-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-2">
            Email address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@university.edu"
            className="w-full px-4 py-3 rounded-lg border border-sand-300 bg-white text-deep-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
            required
          />
        </div>

        {/* University */}
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-2">
            University / Institution
          </label>
          <input
            type="text"
            value={formData.university}
            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
            placeholder="Stanford University"
            className="w-full px-4 py-3 rounded-lg border border-sand-300 bg-white text-deep-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Create a secure password"
              className="w-full px-4 py-3 pr-12 rounded-lg border border-sand-300 bg-white text-deep-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-300 hover:text-charcoal-500"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-lg bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-sand-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-sand-50 text-charcoal-300">Or</span>
        </div>
      </div>

      {/* Social Login */}
      <div className="w-full">
        <button 
          type="button"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading || isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-sand-300 text-charcoal-500 hover:bg-sand-100 hover:border-sage-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continue with Google
        </button>
      </div>

      {/* Login Link */}
      <p className="text-center mt-5 text-sm text-charcoal-400">
        Already have an account?{" "}
        <Link href="/login" className="text-sage-600 font-medium hover:text-sage-700 transition-colors">
          Sign in
        </Link>
      </p>

      {/* Social Proof */}
      <div className="mt-6 pt-5 border-t border-sand-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-deep-charcoal">Trusted by Learners</p>
            <p className="text-xs text-charcoal-300">AI-powered learning.</p>
          </div>
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {["#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C"].map((color, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-sand-50 flex items-center justify-center text-[9px] text-white font-medium"
                  style={{ backgroundColor: color }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="ml-2 px-2 py-0.5 rounded-full bg-sage-600 text-white text-xs font-medium">
              +10K
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
