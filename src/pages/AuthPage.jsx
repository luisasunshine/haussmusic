import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import VelvetBackdrop from '@/components/fx/VelvetBackdrop';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    display_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        const response = await base44.functions.invoke('auth/register', {
          email: formData.email,
          password: formData.password,
          username: formData.username,
          display_name: formData.display_name
        });

        if (response.data.success) {
          toast.success('Conta criada! Faça login para continuar.');
          setMode('login');
          setFormData({ ...formData, password: '' });
        } else {
          toast.error(response.data.error || 'Erro ao criar conta');
        }
      } else {
        const response = await base44.functions.invoke('auth/login', {
          login: formData.email, // pode ser email ou username
          password: formData.password
        });

        if (response.data.success) {
          toast.success('Login realizado com sucesso!');
          // Redirecionar para home ou fazer login via Base44
          window.location.href = '/';
        } else {
          toast.error(response.data.error || 'Erro ao fazer login');
        }
      }
    } catch (error) {
      toast.error('Erro na conexão. Tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(async (profile) => {
    try {
      await base44.auth.loginWithGoogle(profile);
      toast.success('Login realizado com sucesso!');
      window.location.href = '/';
    } catch (error) {
      toast.error('Erro ao entrar com Google. Tente novamente.');
      console.error(error);
    }
  }, []);

  const handleGoogleError = useCallback(() => {
    toast.error('Não foi possível conectar com o Google.');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--v-void)' }}>
      {/* Poeira de prata em profundidade — a mesma do resto do app, para a
          porta de entrada já ser a linguagem visual da casa. */}
      <VelvetBackdrop />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.10, 0.22, 0.10] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -left-1/4 w-[32rem] h-[32rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #d8d8e2, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1.25, 1, 1.25], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 -right-1/4 w-[32rem] h-[32rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #8f8f9d, transparent 70%)' }}
        />
      </div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="v-glass-strong v-chrome-edge rounded-3xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-8 gap-3">
            <motion.img
              src="/logo.png"
              alt=""
              initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
              className="w-32 h-32 object-contain"
              style={{ filter: 'drop-shadow(0 8px 26px rgba(216,216,226,0.35))' }}
            />
            <h1 className="v-chrome-text v-chrome-text-live text-2xl font-black tracking-[0.22em]">
              VELVET MUSIC
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                mode === 'login'
                  ? 'btn-green !rounded-xl'
                  : 'text-velvet-dim hover:text-velvet-text'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                mode === 'register'
                  ? 'btn-green !rounded-xl'
                  : 'text-velvet-dim hover:text-velvet-text'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm text-velvet-dim mb-2 block">Nome de exibição</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-velvet-faint" />
                      <Input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="Seu nome"
                        className="pl-11 h-11 rounded-xl bg-white/[0.045] border-white/[0.10] text-velvet-text placeholder:text-velvet-faint focus-visible:ring-velvet-silver/50 focus-visible:border-velvet-silver/40 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-velvet-dim mb-2 block">Nome de usuário (opcional)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-velvet-faint" />
                      <Input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="@username"
                        className="pl-11 h-11 rounded-xl bg-white/[0.045] border-white/[0.10] text-velvet-text placeholder:text-velvet-faint focus-visible:ring-velvet-silver/50 focus-visible:border-velvet-silver/40 transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-sm text-velvet-dim mb-2 block">
                {mode === 'login' ? 'Email ou usuário' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-velvet-faint" />
                <Input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={mode === 'login' ? 'email ou @username' : 'seu@email.com'}
                  required
                  className="pl-11 h-11 rounded-xl bg-white/[0.045] border-white/[0.10] text-velvet-text placeholder:text-velvet-faint focus-visible:ring-velvet-silver/50 focus-visible:border-velvet-silver/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-velvet-dim mb-2 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-velvet-faint" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="pl-11 h-11 rounded-xl bg-white/[0.045] border-white/[0.10] text-velvet-text placeholder:text-velvet-faint focus-visible:ring-velvet-silver/50 focus-visible:border-velvet-silver/40 transition-colors"
                />
              </div>
              {mode === 'register' && (
                <p className="text-xs text-velvet-faint mt-1.5">Mínimo 6 caracteres</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="btn-green w-full h-12 text-base tracking-wide"
            >
              {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 v-rule" />
            <span className="text-xs uppercase tracking-[0.2em] text-velvet-faint">ou</span>
            <div className="flex-1 v-rule" />
          </div>

          {/* Google login */}
          <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        </div>
      </motion.div>
    </div>
  );
}