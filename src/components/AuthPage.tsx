import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  User as UserIcon, 
  MapPin, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';

interface AuthPageProps {
  onSignInGoogle: () => Promise<void>;
  onSignInEmail: (email: string, pass: string) => Promise<void>;
  onSignUpEmail: (name: string, unit: string, email: string, pass: string) => Promise<void>;
  onContinueAsGuest: () => void;
  isLoading: boolean;
}

export default function AuthPage({
  onSignInGoogle,
  onSignInEmail,
  onSignUpEmail,
  onContinueAsGuest,
  isLoading
}: AuthPageProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [unitKerja, setUnitKerja] = useState('Unit Air Kumbang 2');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Harap isi email dan password Anda.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password minimal 6 karakter.');
      return;
    }

    try {
      if (authMode === 'login') {
        await onSignInEmail(email, password);
      } else {
        if (!namaLengkap.trim()) {
          setErrorMessage('Harap isi Nama Lengkap Anda.');
          return;
        }
        await onSignUpEmail(namaLengkap, unitKerja, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMessage('Email atau password tidak sesuai. Cek kembali atau gunakan Google Login.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('Email ini sudah terdaftar. Silakan pilih tab Masuk (Login).');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage('Metode Email/Password belum diaktifkan di Firebase Console. Gunakan tombol "Masuk Cepat dengan Akun Google" di atas.');
      } else {
        setErrorMessage(err?.message || 'Terjadi kesalahan saat masuk. Coba lagi atau gunakan Google Login.');
      }
    }
  };

  const handleGoogleClick = async () => {
    setErrorMessage(null);
    try {
      await onSignInGoogle();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal login Google. Coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      
      {/* Brand & Identity Header */}
      <div className="text-center max-w-md mx-auto mb-6 space-y-2">
        <div className="inline-flex items-center justify-center mb-2">
          <img 
            src="/assets/aistudio/Bank_Mandiri_Gass_APP_Credit_Monitor_6494e849.png" 
            alt="Logo Mandiri Gass APP" 
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-xl shadow-blue-950/50 object-contain bg-white p-1 border border-white/20"
          />
        </div>
        <div className="flex items-center justify-center space-x-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Dashboard Gasss
          </h1>
          <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            SGP Micro
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">
          Sistem Monitoring Pipeline, MPS, Kalkulator kredit
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white text-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        
        {/* Toggle Login vs Register */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMessage(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              authMode === 'login'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              authMode === 'register'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>


        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 bg-rose-50 border border-rose-300 p-3 rounded-2xl text-xs text-rose-800 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* PRIMARY: 1-Click Google Sign-In */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleClick}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-blue-300 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2.5 shadow-xs transition-all active:scale-98 disabled:opacity-50"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>
            {authMode === 'login' ? 'Masuk dengan Akun Google (Instan)' : 'Daftar dengan Akun Google (Instan)'}
          </span>
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
            <span className="bg-white px-3 tracking-wider">Atau dengan Email &amp; Password</span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {authMode === 'register' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nama Lengkap *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Delva Andriawan"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Unit / Cabang Kerja *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Unit Air Kumbang Banyuasin 2"
                  value={unitKerja}
                  onChange={(e) => setUnitKerja(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Alamat Email *</span>
            </label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Kata Sandi / Password *</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-98 disabled:opacity-50 mt-2"
          >
            <span>
              {authMode === 'login' ? 'Masuk ke Dashboard' : 'Buat Akun Sekarang'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Guest Mode Fallback */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-[11px] font-bold text-slate-500 hover:text-blue-700 transition-colors inline-flex items-center space-x-1"
          >
            <span>Lanjut Mode Demo / Tamu (Offline)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* Security note footer */}
      <div className="text-center text-[11px] text-slate-400 mt-6 flex items-center justify-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Dilindungi oleh Firebase Authentication &amp; Firestore Security Rules</span>
      </div>

    </div>
  );
}
