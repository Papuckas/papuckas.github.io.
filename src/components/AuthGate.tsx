import React, { useState } from 'react';
import { LogIn, UserPlus, Car, ShieldCheck } from 'lucide-react';
import { useGame } from '../state/gameStore';

export const AuthGate: React.FC = () => {
  const { login, register } = useGame();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res =
        mode === 'login'
          ? await login(username, password)
          : await register(username, password);
      if (!res.ok) {
        setError(res.error ?? 'Nepodarilo sa prihlásiť.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0F14] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#141922] shadow-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-slate-800 bg-[#171D28]">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Car className="w-4 h-4" />
            Taktická automobilová kartová hra
          </div>
          <h1 className="font-display text-4xl font-bold text-white mt-1">Top Drivers</h1>
          <p className="text-xs text-slate-400 mt-1">
            Prihlás sa do svojho účtu alebo si vytvor nový profil jazdca. Postup, garáž aj
            balíčky sa bezpečne ukladajú na serveri.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0E1219] border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Prihlásenie
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Registrácia
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-950/50 px-3.5 py-2.5 text-xs text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5" htmlFor="auth-username">
                Používateľské meno
              </label>
              <input
                id="auth-username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="napr. PeterRS"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5" htmlFor="auth-password">
                Heslo
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={4}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimálne 4 znaky"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-[#0E1219] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {submitting
                ? 'Spracúvam...'
                : mode === 'login'
                ? 'Prihlásiť sa do Top Drivers'
                : 'Vytvoriť účet (6 áut + Plastics Pack)'}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Nový hráč automaticky získa 6 štartovacích áut, $5 000 Cash a 1 neotvorený Plastics
              Pack v garáži.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
