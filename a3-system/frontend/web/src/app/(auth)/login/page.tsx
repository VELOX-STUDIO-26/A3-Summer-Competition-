"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import Image from "next/image";
import { loginWithGoogle } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { signInWithGoogle, signInWithEmail, resetPassword } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { setStudentId, setProfile, setUserName, setUserEmail, logout } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Step 1: Authenticate with Firebase
      const firebaseResult = await signInWithEmail(formData.email, formData.password, rememberMe);
      
      if (!firebaseResult.success) {
        setError(firebaseResult.error || "Login failed");
        return;
      }

      // Step 2: Sync with backend (creates profile if needed)
      const data = await loginWithGoogle({
        email: firebaseResult.user!.email!,
        name: firebaseResult.user!.name || firebaseResult.user!.email!.split("@")[0],
        firebase_uid: firebaseResult.user!.uid,
        photo_url: firebaseResult.user!.photoURL || undefined,
      });

      // Clear any existing user data first
      logout();
      // Set new user data
      setStudentId(data.student_id);
      setProfile(data.profile);
      setUserName(data.name || data.email.split("@")[0]);
      setUserEmail(data.email);
      
      // Check if user is new (empty profile = needs profiling)
      const isNewUser = !data.profile?.goals?.length && !data.profile?.knowledge_base?.length;
      
      if (isNewUser) {
        router.push("/profile-chat");
      } else {
        router.push("/notebook");
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const isNetworkError = e?.code === "ERR_NETWORK" || e?.message?.includes("Network Error");

      if (isNetworkError) {
        setError("Cannot connect to server. Please make sure the backend is running.");
      } else {
        setError(typeof detail === "string" ? detail : "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogle(rememberMe);
      
      if (!result.success) {
        setError(result.error || "Google sign in failed");
        return;
      }

      // Now register/login with our backend
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
      
      // Check if user is new (empty profile = needs profiling)
      const isNewUser = !data.profile?.goals?.length && !data.profile?.knowledge_base?.length;
      
      if (isNewUser) {
        router.push("/profile-chat");
      } else {
        router.push("/notebook");
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Google login failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);

    if (!resetEmail) {
      setResetStatus({ type: "error", message: "Please enter your email address" });
      return;
    }

    const result = await resetPassword(resetEmail);
    
    if (result.success) {
      setResetStatus({ type: "success", message: "Password reset email sent! Check your inbox." });
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetStatus(null);
        setResetEmail("");
      }, 3000);
    } else {
      setResetStatus({ type: "error", message: result.error || "Failed to send reset email" });
    }
  };

  return (
    <>
      {/* Mobile Logo */}
      <div className="lg:hidden flex items-center gap-2 mb-8">
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
        Welcome Back
      </h2>
      <p className="text-charcoal-400 mb-8">
        Continue your personalized learning journey.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-2">
            Email address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-lg border border-sand-300 bg-white text-deep-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
            required
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-deep-charcoal">
              Password
            </label>
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-sage-600 hover:text-sage-700 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
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

        {/* Remember Me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-sand-300 text-sage-600 focus:ring-sage-500/20"
          />
          <label htmlFor="remember" className="text-sm text-charcoal-400">
            Remember me
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-lg bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
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
          onClick={handleGoogleLogin}
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

      {/* Register Link */}
      <p className="text-center mt-6 text-sm text-charcoal-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-sage-600 font-medium hover:text-sage-700 transition-colors">
          Create one
        </Link>
      </p>

      {/* Social Proof */}
      <div className="mt-8 pt-6 border-t border-sand-200">
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

      {/* Forgot Password Modal - Using React Portal */}
      {mounted && showForgotPassword && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowForgotPassword(false);
              setResetStatus(null);
              setResetEmail("");
            }}
          />
          {/* Modal content */}
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetStatus(null);
                setResetEmail("");
              }}
              className="absolute top-4 right-4 text-charcoal-400 hover:text-deep-charcoal transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-deep-charcoal mb-2">
              Reset Password
            </h3>
            <p className="text-sm text-charcoal-400 mb-6">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            {resetStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                resetStatus.type === "success" 
                  ? "bg-green-50 border border-green-200 text-green-600" 
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}>
                {resetStatus.message}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-deep-charcoal mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-sand-300 bg-white text-deep-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetStatus(null);
                    setResetEmail("");
                  }}
                  className="flex-1 py-3 rounded-lg border border-sand-300 text-charcoal-500 font-medium hover:bg-sand-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
