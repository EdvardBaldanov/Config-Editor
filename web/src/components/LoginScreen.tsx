import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { Settings } from '../types';
import { translations } from '../utils/i18n';

interface LoginScreenProps {
  settings: Settings;
  onLogin: (user: string, pass: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ settings, onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[settings.language] || translations.ru;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-base p-4 select-none">
      <div className="w-full max-w-md bg-base-surface border border-base-border rounded-3xl shadow-2xl overflow-hidden p-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          {settings.hasCustomIcon ? (
            <img
              src={`/api/branding/icon?t=${Date.now()}`}
              alt="Logo"
              className="w-16 h-16 rounded-2xl object-contain bg-black/20 p-2 mb-4 border border-base-border shadow-lg"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl text-slate-900 mb-4"
              style={{ backgroundColor: settings.accentColor }}
            >
              {(settings.appTitle || 'CS').substring(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {settings.appTitle}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>{t.authSubtitle}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 dark:text-red-300 text-center font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
              {t.username}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-slate-900 transition-all shadow-md active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: settings.accentColor }}
          >
            <span>{loading ? '...' : t.signIn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Config Studio • Linux Web Editor
        </p>
      </div>
    </div>
  );
};
