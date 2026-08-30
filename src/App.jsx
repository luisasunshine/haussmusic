import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AuthPage from '@/pages/AuthPage';
import LabelDashboard from '@/pages/LabelDashboard';
import LabelManagement from '@/pages/LabelManagement';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ background: 'var(--v-abyss)' }}>
        {/* Anel de cromo girando — a primeira coisa que o usuário vê já é
            a linguagem visual do resto do app. */}
        <div className="relative w-14 h-14">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(216,216,226,0.15) 40%, #ffffff 75%, transparent 100%)',
              animation: 'v-spin-slow 1.1s linear infinite',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))',
            }}
          />
          <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <p className="v-chrome-text v-display text-sm font-bold tracking-[0.35em]">VELVET</p>
      </div>
    );
  }

  // Nothing is reachable without an account — bounce anonymous visitors
  // straight to login/register.
  if (!isAuthenticated && location.pathname !== '/AuthPage') {
    return <Navigate to="/AuthPage" replace />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/LabelDashboard" element={
        <LayoutWrapper currentPageName="LabelDashboard">
          <LabelDashboard />
        </LayoutWrapper>
      } />
      <Route path="/LabelManagement" element={
        <LayoutWrapper currentPageName="LabelManagement">
          <LabelManagement />
        </LayoutWrapper>
      } />
      <Route path="/AuthPage" element={<AuthPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App