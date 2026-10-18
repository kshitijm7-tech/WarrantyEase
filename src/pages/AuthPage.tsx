import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePreferences, showToast } = useWarranties();

  // Mode: 'signin' or 'signup'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1-Click Demo Access
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updatePreferences({
        name: 'Demo User',
        email: 'demo@example.com',
      });
      showToast('Welcome to WarrantyEase Demo Workspace.', 'success');
      navigate('/overview');
    } catch {
      setError('Unable to load demo workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide your email address and password.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      // Update local profile with provided user data
      const displayName = mode === 'signup' ? name.trim() : email.split('@')[0];
      await updatePreferences({
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email: email.trim(),
      });

      showToast(
        mode === 'signup' ? 'Account created successfully!' : `Welcome back, ${displayName}!`,
        'success'
      );
      navigate('/overview');
    } catch {
      setError('Authentication failed. Please verify your credentials or try Demo Mode.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-between text-[#202733] font-sans">
      {/* Top Header */}
      <header className="h-16 px-6 lg:px-12 flex items-center justify-between border-b border-[#E5E9EF] bg-white">
        <Link 
          to="/" 
          className="flex items-center gap-2.5 text-[#202733] font-bold text-base tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3157D5] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span>WarrantyEase</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687385] hover:text-[#202733] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </Link>
      </header>

      {/* Main Form Centerpiece */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E9EF] shadow-lg p-6 sm:p-8 space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#202733]">
              {mode === 'signin' ? 'Sign in to WarrantyEase' : 'Create your account'}
            </h1>
            <p className="text-xs text-[#687385]">
              {mode === 'signin' 
                ? 'Access your saved warranties, invoices, and claim dossiers.'
                : 'Start tracking purchases and receiving automated warranty reminders.'}
            </p>
          </div>

          {/* 1-Click Instant Demo Button */}
          <div className="p-3.5 rounded-xl border border-[#D5E2FF] bg-[#EEF3FF] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3157D5]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Want to test without signing up?
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#D5E2FF]">
                1-Click Access
              </span>
            </div>
            <p className="text-[11px] text-[#202733] leading-relaxed">
              Explore all 12 pre-loaded products, sample invoice documents, and the grounded Warranty Assistant immediately.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full mt-1 py-2 px-3 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <span>Continue with Instant Demo Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E5E9EF] w-full" />
            <span className="bg-white px-3 text-[11px] text-[#687385] uppercase tracking-wider font-semibold">
              Or continue with email
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center p-1 rounded-lg border border-[#E5E9EF] bg-[#F7F8FA] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#202733] shadow-2xs'
                  : 'text-[#687385] hover:text-[#202733]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#202733] shadow-2xs'
                  : 'text-[#687385] hover:text-[#202733]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg bg-[#FDECEC] border border-[#F9D0CE] flex items-start gap-2.5 text-xs text-[#C03935]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#202733] mb-1">
                  Full Name <span className="text-[#C03935]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#687385] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Email Address <span className="text-[#C03935]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#687385] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#202733]">
                  Password <span className="text-[#C03935]">*</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('demo@example.com');
                      setPassword('demo123456');
                      showToast('Demo credentials pre-filled.', 'info');
                    }}
                    className="text-[11px] text-[#3157D5] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#687385] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687385] hover:text-[#202733]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#687385] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
                />
                <span>Remember this browser</span>
              </label>

              <span className="text-[11px] text-[#18794E] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SSL Encrypted
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#202733] hover:bg-[#111620] rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Privacy Note */}
          <div className="pt-2 border-t border-[#E5E9EF] text-center text-[11px] text-[#687385]">
            By continuing, you agree to WarrantyEase terms of service and client-side data privacy policy.
          </div>
        </div>
      </div>

      {/* Quiet Footer */}
      <footer className="h-14 border-t border-[#E5E9EF] bg-white px-6 flex items-center justify-between text-[11px] text-[#687385]">
        <div>© {new Date().getFullYear()} WarrantyEase Inc.</div>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-[#202733] transition-colors">Product Overview</Link>
          <a href="#security" className="hover:text-[#202733] transition-colors">Security Architecture</a>
        </div>
      </footer>
    </div>
  );
};
