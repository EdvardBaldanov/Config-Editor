import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { SecretMeta, SecretsStatus, SecretType, SecretScope } from '../../../types';
import { api } from '../../../services/api';

interface SecretsTabProps {
  authEnabled: boolean;
  onNavigateToSecurity: () => void;
  language: string;
  t: any;
}

export const SecretsTab: React.FC<SecretsTabProps> = ({
  authEnabled,
  onNavigateToSecurity,
  language,
  t,
}) => {
  const [secretsList, setSecretsList] = useState<SecretMeta[]>([]);
  const [secretsStatus, setSecretsStatus] = useState<SecretsStatus | null>(null);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  // Unlock Modal
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Secret Editor Modal
  const [isSecretEditorOpen, setIsSecretEditorOpen] = useState(false);
  const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
  const [secretTitle, setSecretTitle] = useState('');
  const [secretId, setSecretId] = useState('');
  const [secretType, setSecretType] = useState<SecretType>('password');
  const [secretScope, setSecretScope] = useState<SecretScope>('shared');
  const [secretValue, setSecretValue] = useState('');
  const [secretEditorError, setSecretEditorError] = useState('');
  const [isSavingSecret, setIsSavingSecret] = useState(false);

  const loadSecrets = async () => {
    setIsLoadingSecrets(true);
    try {
      const [status, list] = await Promise.all([
        api.getSecretsStatus(),
        api.listSecrets(),
      ]);
      setSecretsStatus(status);
      setSecretsList(list);
    } catch (err) {
      console.error('Failed to load secrets:', err);
    } finally {
      setIsLoadingSecrets(false);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, []);

  const handleUnlockSecrets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) return;
    setIsUnlocking(true);
    setUnlockError('');
    try {
      const res = await api.unlockSecrets(unlockPassword);
      if (res.success) {
        setIsUnlockModalOpen(false);
        setUnlockPassword('');
        await loadSecrets();
      }
    } catch (err: any) {
      setUnlockError(err.message || 'Error unlocking secrets');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleToggleRevealSecret = async (item: SecretMeta) => {
    if (revealedSecrets[item.id] !== undefined) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    setRevealingId(item.id);
    try {
      const value = await api.getSecretValue(item.id);
      setRevealedSecrets((prev) => ({ ...prev, [item.id]: value }));
    } catch (err: any) {
      if (err.message && err.message.includes('privileged')) {
        setIsUnlockModalOpen(true);
      } else {
        alert(`Ошибка получения секрета: ${err.message}`);
      }
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopySecretValue = async (item: SecretMeta) => {
    try {
      let val = revealedSecrets[item.id];
      if (val === undefined) {
        val = await api.getSecretValue(item.id);
      }
      await navigator.clipboard.writeText(val);
      setCopiedSecretId(item.id);
      setTimeout(() => setCopiedSecretId(null), 2000);
    } catch (err: any) {
      if (err.message && err.message.includes('privileged')) {
        setIsUnlockModalOpen(true);
      } else {
        alert(`Ошибка копирования: ${err.message}`);
      }
    }
  };

  const handleOpenCreateSecret = () => {
    setEditingSecretId(null);
    setSecretTitle('');
    setSecretId('');
    setSecretType('password');
    setSecretScope('shared');
    setSecretValue('');
    setSecretEditorError('');
    setIsSecretEditorOpen(true);
  };

  const handleOpenEditSecret = async (item: SecretMeta) => {
    setEditingSecretId(item.id);
    setSecretTitle(item.title);
    setSecretId(item.id);
    setSecretType(item.type);
    setSecretScope(item.scope);
    setSecretEditorError('');

    try {
      let val = revealedSecrets[item.id];
      if (val === undefined) {
        val = await api.getSecretValue(item.id);
      }
      setSecretValue(val);
      setIsSecretEditorOpen(true);
    } catch (err: any) {
      if (err.message && err.message.includes('privileged')) {
        setIsUnlockModalOpen(true);
      } else {
        alert(`Ошибка редактирования секрета: ${err.message}`);
      }
    }
  };

  const handleDeleteSecret = async (item: SecretMeta) => {
    if (!confirm(`Вы действительно хотите удалить секрет "${item.title}"?`)) return;
    try {
      await api.deleteSecret(item.id);
      await loadSecrets();
    } catch (err: any) {
      alert(`Ошибка удаления секрета: ${err.message}`);
    }
  };

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretTitle.trim()) {
      setSecretEditorError('Название секрета обязательно');
      return;
    }
    if (!secretValue) {
      setSecretEditorError('Значение секрета обязательно');
      return;
    }

    setIsSavingSecret(true);
    setSecretEditorError('');

    try {
      await api.saveSecret({
        id: secretId.trim() || undefined,
        title: secretTitle.trim(),
        type: secretType,
        scope: secretScope,
        value: secretValue,
      });
      setIsSecretEditorOpen(false);
      await loadSecrets();
    } catch (err: any) {
      setSecretEditorError(err.message || 'Ошибка сохранения');
    } finally {
      setIsSavingSecret(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      {/* Header info banner */}
      <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t.secretsTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.secretsSubtitle}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-accent/10 border border-accent/30 text-accent font-semibold">
              <ShieldCheck size={13} />
              <span>{secretsStatus?.backend || 'Windows Credential Manager'}</span>
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-base-border flex items-center space-x-2 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>{t.zeroSecretNotice}</span>
        </div>
      </div>

      {/* Condition 1: Password protection disabled */}
      {!authEnabled && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {t.authRequiredToManage}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t.authRequiredHelp}
            </p>
            <button
              type="button"
              onClick={onNavigateToSecurity}
              className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/40 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Shield size={13} />
              <span>{t.tabSecurity}</span>
            </button>
          </div>
        </div>
      )}

      {/* Condition 2: Password protection enabled, but Privileged Mode locked */}
      {authEnabled && !secretsStatus?.privilegedActive && (
        <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-black/30 border border-base-border text-gray-400">
              <Lock size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                {t.privilegedLocked}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {t.privilegedLockedHelp}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setUnlockError('');
              setUnlockPassword('');
              setIsUnlockModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition flex items-center space-x-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <Unlock size={14} />
            <span>{t.unlockSecretsBtn}</span>
          </button>
        </div>
      )}

      {/* Condition 3: Password protection enabled and Privileged Mode ACTIVE */}
      {authEnabled && secretsStatus?.privilegedActive && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={15} />
            <span>{t.privilegedActiveBadge} (15m)</span>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateSecret}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>{t.addSecretBtn}</span>
          </button>
        </div>
      )}

      {/* Secrets List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Key size={14} className="text-accent" />
            <span>{t.tabSecrets} ({secretsList.length})</span>
          </label>
          <button
            type="button"
            onClick={loadSecrets}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition cursor-pointer"
            title={t.refresh}
          >
            <RefreshCw size={13} className={isLoadingSecrets ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoadingSecrets && secretsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 border border-base-border rounded-2xl bg-black/10 flex items-center justify-center space-x-2">
            <RefreshCw size={14} className="animate-spin text-accent" />
            <span>Loading secrets...</span>
          </div>
        ) : secretsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 border border-base-border rounded-2xl bg-black/10 flex flex-col items-center justify-center space-y-1.5">
            <Key className="w-8 h-8 text-gray-500 opacity-60 mb-1" />
            <span className="font-medium text-gray-300">{t.noSecretsFound}</span>
            <span className="text-[11px] text-gray-500">
              {authEnabled
                ? 'Нажмите «Добавить секрет», чтобы сохранить учетные данные в хранилище.'
                : 'Включите защиту паролем для добавления учетных данных.'}
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {secretsList.map((item) => {
              const isRevealed = revealedSecrets[item.id] !== undefined;
              const valueStr = isRevealed ? revealedSecrets[item.id] : '••••••••••••••••••••••••';
              const isCopied = copiedSecretId === item.id;

              const typeIcon =
                item.type === 'ssh_key' ? (
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                ) : item.type === 'token' ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                );

              const typeLabel =
                item.type === 'ssh_key'
                  ? t.secretTypeSSHKey
                  : item.type === 'token'
                  ? t.secretTypeToken
                  : t.secretTypePassword;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-base-border bg-gray-50/50 dark:bg-black/20 hover:border-gray-500/30 transition space-y-3"
                >
                  {/* Top row: Title + badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-black/30 border border-base-border shrink-0">
                        {typeIcon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono truncate">
                          ID: <span className="text-gray-300">{item.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          item.scope === 'shared'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        }`}
                        title={
                          item.scope === 'shared'
                            ? 'Общий секрет для серверов и хостов'
                            : 'Секрет конкретного плагина'
                        }
                      >
                        {item.scope === 'shared' ? '🌐 Shared' : `🧩 ${item.pluginId || 'Plugin'}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/30 text-gray-300 border border-base-border">
                        {typeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Middle row: Masked/Revealed secret container */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-base-border font-mono text-xs">
                    <div className="flex-1 truncate pr-3 select-all">
                      {isRevealed ? (
                        <span className="text-emerald-400 font-mono text-[11px] whitespace-pre-wrap break-all">
                          {valueStr}
                        </span>
                      ) : (
                        <span className="text-gray-500 select-none tracking-widest text-[11px]">
                          {valueStr}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Timestamps & Action buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-base-border/50 text-[10px] text-gray-400">
                    <div>
                      {item.updatedAt && (
                        <span>
                          {language === 'en' ? 'Updated' : 'Обновлен'}:{' '}
                          {new Date(item.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* Reveal / Hide */}
                      <button
                        type="button"
                        onClick={() => handleToggleRevealSecret(item)}
                        disabled={revealingId === item.id}
                        className="px-2.5 py-1 rounded-lg border border-base-border hover:border-gray-400 text-[11px] flex items-center space-x-1 text-gray-300 hover:text-white bg-black/20 transition disabled:opacity-50 cursor-pointer"
                        title={isRevealed ? t.hideSecret : t.revealSecret}
                      >
                        {revealingId === item.id ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : isRevealed ? (
                          <EyeOff size={11} />
                        ) : (
                          <Eye size={11} />
                        )}
                        <span>{isRevealed ? t.hideSecret : t.revealSecret}</span>
                      </button>

                      {/* Copy value */}
                      <button
                        type="button"
                        onClick={() => handleCopySecretValue(item)}
                        className="px-2.5 py-1 rounded-lg border border-base-border hover:border-accent text-[11px] flex items-center space-x-1 text-gray-300 hover:text-white bg-black/20 transition cursor-pointer"
                        title={t.copiedToClipboard}
                      >
                        {isCopied ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{isCopied ? t.copied : 'Copy'}</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditSecret(item)}
                        className="p-1 rounded-lg border border-base-border hover:border-gray-400 text-gray-300 hover:text-white bg-black/20 transition cursor-pointer"
                        title={language === 'en' ? 'Edit secret' : 'Редактировать секрет'}
                      >
                        <Edit3 size={11} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSecret(item)}
                        className="p-1 rounded-lg border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-rose-300 bg-rose-500/10 transition cursor-pointer"
                        title={t.delete}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-base-surface border border-base-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                <Lock className="w-4 h-4 text-accent" />
                <span>{t.unlockModalTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnlockModalOpen(false);
                  setUnlockError('');
                  setUnlockPassword('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.privilegedLockedHelp}
            </p>

            <form onSubmit={handleUnlockSecrets} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder={t.unlockPasswordPlaceholder}
                  autoFocus
                  className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
                {unlockError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{unlockError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlockModalOpen(false);
                    setUnlockError('');
                    setUnlockPassword('');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking || !unlockPassword}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                >
                  {isUnlocking ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>{t.unlocking}</span>
                    </>
                  ) : (
                    <>
                      <Unlock size={12} />
                      <span>{t.unlockSubmit}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Secret Modal */}
      {isSecretEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-base-surface border border-base-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                <Key className="w-4 h-4 text-accent" />
                <span>{editingSecretId ? t.editSecretModalTitle : t.addSecretModalTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSecretEditorOpen(false);
                  setSecretEditorError('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveSecret} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t.secretTitleLabel}
                </label>
                <input
                  type="text"
                  value={secretTitle}
                  onChange={(e) => setSecretTitle(e.target.value)}
                  placeholder={t.secretTitlePlaceholder}
                  autoFocus
                  className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* ID Identifier */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t.secretIdLabel}
                </label>
                <input
                  type="text"
                  value={secretId}
                  onChange={(e) => setSecretId(e.target.value)}
                  placeholder={t.secretIdPlaceholder}
                  disabled={!!editingSecretId}
                  className={`w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent ${
                    editingSecretId ? 'opacity-60 cursor-not-allowed bg-black/10' : ''
                  }`}
                />
                {!editingSecretId && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {language === 'en'
                      ? 'Leave blank to generate automatically from title'
                      : 'Оставьте пустым для автогенерации из названия'}
                  </p>
                )}
              </div>

              {/* Secret Type & Scope grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    {t.secretTypeLabel}
                  </label>
                  <select
                    value={secretType}
                    onChange={(e) => setSecretType(e.target.value as SecretType)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  >
                    <option value="password">{t.secretTypePassword}</option>
                    <option value="ssh_key">{t.secretTypeSSHKey}</option>
                    <option value="token">{t.secretTypeToken}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    {t.secretScopeLabel}
                  </label>
                  <select
                    value={secretScope}
                    onChange={(e) => setSecretScope(e.target.value as SecretScope)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  >
                    <option value="shared">{t.secretScopeShared}</option>
                    <option value="plugin">{t.secretScopePlugin}</option>
                  </select>
                </div>
              </div>

              {/* Secret Value */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t.secretValueLabel}
                </label>
                {secretType === 'ssh_key' ? (
                  <textarea
                    rows={4}
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent resize-y"
                  />
                ) : (
                  <input
                    type="password"
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder={t.secretValuePlaceholder}
                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  />
                )}
              </div>

              {secretEditorError && (
                <p className="text-[11px] text-rose-500 font-medium">{secretEditorError}</p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-base-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsSecretEditorOpen(false);
                    setSecretEditorError('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSecret}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition disabled:opacity-50 flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  {isSavingSecret ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>{t.savingSecret}</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>{t.saveSecretBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
