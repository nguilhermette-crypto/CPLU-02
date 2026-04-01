import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { auth, signIn } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, User as UserIcon, Loader2 } from 'lucide-react';

// Lazy load components for better initial performance
const RegisterForm = lazy(() => import('./components/RegisterForm').then(m => ({ default: m.RegisterForm })));
const HistoryList = lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const ReportSummary = lazy(() => import('./components/ReportSummary').then(m => ({ default: m.ReportSummary })));

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const AuthBarrier = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('admin@cplu.com');
  const [password, setPassword] = useState('123456');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setAuthError('Email ou senha incorretos.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-sm w-full">
          <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center text-orange-500 mx-auto mb-6">
            <UserIcon size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">Login CPLU</h2>
          <p className="text-slate-400 text-sm font-medium mb-8 text-center">Acesse o controle de frota.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Email</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                placeholder="admin@cplu.com"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Senha</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                placeholder="••••••"
                required
              />
            </div>
            
            {authError && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                <LogIn size={14} />
                {authError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
            >
              {isLoggingIn ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={22} />
                  ENTRAR
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
    <Loader2 size={48} className="animate-spin mb-4 opacity-20" />
    <p className="font-bold uppercase tracking-widest text-[10px]">Carregando página...</p>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthBarrier>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<RegisterForm />} />
                <Route path="/historico" element={<HistoryList />} />
                <Route path="/relatorios" element={<ReportSummary />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthBarrier>
      </Router>
    </AuthProvider>
  );
}
