import React, { useState } from 'react';
import { Truck, ArrowRight, Lock } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  onEnterTestVehicle?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onEnterTestVehicle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-joppli-light flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
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
          Fleet Management Portal
        </h2>
        <p className="mt-2 text-center text-sm text-joppli-dark/60 font-medium">
          Authorized personnel only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl border border-joppli-grey sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-joppli-dark">
                Operator ID / Email
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-joppli-grey px-4 py-3 placeholder-joppli-dark/30 shadow-sm focus:border-joppli-blue focus:outline-none focus:ring-1 focus:ring-joppli-blue text-sm font-medium transition-colors"
                  placeholder="admin@joeppli.ch"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-joppli-dark">
                Passcode
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-joppli-grey px-4 py-3 placeholder-joppli-dark/30 shadow-sm focus:border-joppli-blue focus:outline-none focus:ring-1 focus:ring-joppli-blue text-sm font-medium transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-joppli-grey text-joppli-blue focus:ring-joppli-blue"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-joppli-dark/70 font-medium">
                  Remember terminal
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-bold text-joppli-blue hover:text-joppli-blue/80">
                  Forgot passcode?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-joppli-dark px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-joppli-dark/90 focus:outline-none focus:ring-2 focus:ring-joppli-dark focus:ring-offset-2 transition-all disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Authenticate Access
                  </>
                )}
              </button>
            </div>
            
            {onEnterTestVehicle && (
              <div className="mt-4 pt-4 border-t border-joppli-grey flex flex-col gap-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-joppli-dark/40 text-center">
                  Device Hardware Stand-in
                </div>
                <button
                  type="button"
                  onClick={onEnterTestVehicle}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-joppli-grey bg-joppli-light px-4 py-3 text-sm font-bold text-joppli-dark shadow-sm hover:bg-joppli-grey/40 focus:outline-none transition-all"
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
