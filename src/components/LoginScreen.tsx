import React, { useState, useEffect } from 'react';
import { Truck, Lock, Mail, Key, User, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { provisionOperator } from '../lib/operators';
import { CantonFlag } from './CantonFlag';

interface LoginScreenProps {
  onLogin: () => void;
  onEnterTestVehicle?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onEnterTestVehicle }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProject, setSelectedProject] = useState<'zurich' | 'glarus'>('zurich');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Google Redirect login completion on mount
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          setIsLoading(true);
          setErrorMsg(null);
          setSuccessMsg(null);
          const user = result.user;
          const savedProject = (localStorage.getItem('joppilot_selected_project') as 'zurich' | 'glarus') || 'zurich';
          try {
            const docSnap = await getDoc(doc(db, 'operators', user.uid));
            if (!docSnap.exists()) {
              await provisionOperator(user, savedProject, 'google');
            }
            onLogin();
          } catch (error: any) {
            console.error("Error provisioning operator after redirect:", error);
            setErrorMsg("Google Authentication succeeded, but profile provisioning failed: " + (error.message || error));
          } finally {
            setIsLoading(false);
            localStorage.removeItem('joppilot_selected_project');
          }
        }
      })
      .catch((error: any) => {
        console.error("Redirect auth error:", error);
        let message = "Google Sign-In via redirect failed. ";
        if (error.code === 'auth/operation-not-allowed') {
          message += "Google authentication is not enabled in your Firebase Console (Authentication > Sign-in method).";
        } else if (error.code === 'auth/unauthorized-domain') {
          message += "This domain (e.g. localhost) is not authorized in your Firebase Console OAuth redirect domains list.";
        } else if (error.code === 'auth/web-storage-unsupported') {
          message += "Your browser's privacy settings or third-party cookie blocking prevent storing auth state.";
        } else {
          message += error.message || error;
        }
        setErrorMsg(message);
      });
  }, [onLogin]);

  const triggerGoogleRedirect = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      localStorage.setItem('joppilot_selected_project', selectedProject);
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Google redirect init error:", error);
      setErrorMsg("Failed to initialize Google Redirect Sign-In: " + (error.message || error));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin();
      } else if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const profile = await provisionOperator(userCredential.user, selectedProject, 'email');

        if (profile.status === 'approved') {
          setSuccessMsg("Registration successful! Workspace access granted.");
          setTimeout(() => {
            onLogin();
          }, 1000);
        } else {
          setSuccessMsg("Registration recorded successfully! Awaiting administrator approval.");
        }
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg("Passcode reset link sent! Please check your inbox.");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "An authentication error occurred. Please try again.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or passcode. Please check your credentials.";
      } else if (error.code === 'auth/user-not-found') {
        message = "No registered operator found with this email.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This operator email is already registered.";
      } else if (error.code === 'auth/weak-password') {
        message = "Passcode is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid operator email address.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is currently disabled in your Firebase Console. Please go to Authentication > Sign-in method to enable it!";
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // First-time Google login: create the operator profile (and queue the
      // admin approval email for non-admins) via the shared provisioning helper.
      const docSnap = await getDoc(doc(db, 'operators', user.uid));
      if (!docSnap.exists()) {
        await provisionOperator(user, selectedProject, 'google');
      }
      onLogin();
    } catch (error: any) {
      console.error("Google auth error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setIsLoading(false);
        return;
      }
      
      let message = "Google Sign-In failed. ";
      if (error.code === 'auth/operation-not-allowed') {
        message += "Google authentication is not enabled in your Firebase Console (Authentication > Sign-in method).";
      } else if (error.code === 'auth/unauthorized-domain') {
        message += "This domain (e.g. localhost) is not authorized in your Firebase Console OAuth redirect domains list.";
      } else if (error.code === 'auth/popup-blocked') {
        message += "The sign-in popup was blocked by your browser. Please allow popups, or try using redirect sign-in below.";
      } else if (error.code === 'auth/web-storage-unsupported') {
        message += "Web storage is not supported or third-party cookies are blocked. Try redirect sign-in below.";
      } else {
        message += error.message || error;
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-joppli-light flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-joppli-blue/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-black tracking-tight text-joppli-dark">jöppli</span>
            <div className="flex gap-1 mb-3 ml-1">
              <span className="w-2.5 h-2.5 bg-joppli-green rounded-full"></span>
              <span className="w-2.5 h-2.5 bg-joppli-blue rounded-full"></span>
              <span className="w-2.5 h-2.5 bg-joppli-red rounded-full"></span>
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-joppli-dark">
          {mode === 'login' ? 'Fleet Management Portal' : mode === 'register' ? 'Register New Operator' : 'Recover Passcode'}
        </h2>
        <p className="mt-2 text-center text-sm text-joppli-dark/60 font-medium">
          {mode === 'login' ? 'Authorized personnel only' : mode === 'register' ? 'Create your municipal workspace account' : 'We will send a secure reset link'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl border border-joppli-grey sm:px-10">
          
          {/* Status Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-joppli-red/5 border border-joppli-red/20 rounded-xl flex items-start gap-2.5 text-xs font-bold text-joppli-red uppercase tracking-wide">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-joppli-green/5 border border-joppli-green/20 rounded-xl flex items-start gap-2.5 text-xs font-bold text-joppli-green uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Standard Form Fields */}
            {mode !== 'forgot' && (
              <>
                <div>
                  <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-joppli-dark/70">
                    Operator ID / Email
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-joppli-dark/40">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full appearance-none rounded-xl border border-joppli-grey pl-10 pr-4 py-3 placeholder-joppli-dark/30 shadow-sm focus:border-joppli-blue focus:outline-none focus:ring-1 focus:ring-joppli-blue text-sm font-semibold transition-colors"
                      placeholder="operator@joeppli.ch"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-black uppercase tracking-widest text-joppli-dark/70">
                    Secure Passcode
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-joppli-dark/40">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full appearance-none rounded-xl border border-joppli-grey pl-10 pr-4 py-3 placeholder-joppli-dark/30 shadow-sm focus:border-joppli-blue focus:outline-none focus:ring-1 focus:ring-joppli-blue text-sm font-semibold transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Workspace Project Selection (Zürich vs Glarus) — flag cards */}
                <div>
                  <span className="block text-xs font-black uppercase tracking-widest text-joppli-dark/70">
                    Workspace City / Project
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {([
                      { id: 'zurich' as const, name: 'Zürich', sub: 'ERZ Municipal Waste' },
                      { id: 'glarus' as const, name: 'Glarus', sub: 'Municipal Waste' },
                    ]).map((ws) => {
                      const active = selectedProject === ws.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => setSelectedProject(ws.id)}
                          aria-pressed={active}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-joppli-blue ${
                            active
                              ? 'border-joppli-blue bg-joppli-blue/5 shadow-sm'
                              : 'border-joppli-grey hover:border-joppli-dark/20 hover:bg-joppli-light'
                          }`}
                        >
                          <CantonFlag project={ws.id} className="w-9 h-9 rounded-md shrink-0 shadow-sm" />
                          <span className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-joppli-dark leading-tight">{ws.name}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-joppli-dark/45 truncate">{ws.sub}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Forgot Password View Form */}
            {mode === 'forgot' && (
              <div>
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-joppli-dark/70">
                  Registered Email Address
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-joppli-dark/40">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-joppli-grey pl-10 pr-4 py-3 placeholder-joppli-dark/30 shadow-sm focus:border-joppli-blue focus:outline-none focus:ring-1 focus:ring-joppli-blue text-sm font-semibold transition-colors"
                    placeholder="your-account@email.com"
                  />
                </div>
              </div>
            )}

            {/* Helpers row */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-joppli-grey text-joppli-blue focus:ring-joppli-blue"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-joppli-dark/70 font-bold uppercase tracking-wider">
                    Remember terminal
                  </label>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="font-black text-joppli-blue hover:text-joppli-blue/80 uppercase tracking-wider"
                >
                  Forgot passcode?
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-joppli-dark px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-joppli-blue focus:outline-none transition-all disabled:opacity-70 uppercase tracking-widest cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {mode === 'login' ? 'Authenticate Access' : mode === 'register' ? 'Register Account' : 'Send Recovery Link'}
                  </>
                )}
              </button>

              {/* Real Google Auth integration */}
              {mode === 'login' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-joppli-grey bg-white hover:bg-joppli-light px-4 py-3 text-sm font-black text-joppli-dark shadow-sm transition-all cursor-pointer uppercase tracking-widest"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={triggerGoogleRedirect}
                      disabled={isLoading}
                      className="text-[10px] font-bold text-joppli-blue hover:text-joppli-blue/80 uppercase tracking-wider underline cursor-pointer"
                    >
                      Trouble signing in? Try Google Redirect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alternates toggle */}
            <div className="pt-2 text-center text-xs">
              {mode === 'login' ? (
                <p className="text-joppli-dark/60 font-bold uppercase tracking-wider">
                  New operator?{' '}
                  <button 
                    type="button" 
                    onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="font-black text-joppli-blue hover:underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <button 
                  type="button" 
                  onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="font-black text-joppli-dark/65 hover:text-joppli-dark flex items-center justify-center gap-1.5 mx-auto uppercase tracking-widest font-mono"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to operator login
                </button>
              )}
            </div>
            
            {/* Test Vehicle entry point */}
            {mode === 'login' && onEnterTestVehicle && (
              <div className="mt-4 pt-4 border-t border-joppli-grey flex flex-col gap-2">
                <div className="text-[9px] uppercase font-black tracking-widest text-joppli-dark/40 text-center">
                  Device Hardware Stand-in
                </div>
                <button
                  type="button"
                  onClick={onEnterTestVehicle}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-joppli-grey bg-joppli-light px-4 py-3 text-xs font-black text-joppli-dark shadow-sm hover:bg-joppli-grey/40 focus:outline-none transition-all uppercase tracking-widest cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-joppli-blue" />
                  Enter Test Vehicle Mode
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
