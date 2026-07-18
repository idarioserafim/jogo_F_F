import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from "@/lib/PageNotFound";
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import PageWrapper from '@/components/PageWrapper';
import StickyScoreboard from '@/components/StickyScoreboard';
import BottomNav from '@/components/BottomNav';
// Add page imports here
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Palpites from '@/pages/Palpites';
import Resultados from '@/pages/Resultados';
import Placar from '@/pages/Placar';
import Historico from '@/pages/Historico';
import Configuracoes from '@/pages/Configuracoes';
import Lobby from '@/pages/Lobby';
import Mesa from '@/pages/Mesa';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Add your page Route elements here */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/historico" element={<PageWrapper><Historico /></PageWrapper>} />
        <Route path="/configuracoes" element={<PageWrapper><Configuracoes /></PageWrapper>} />
        <Route path="/game/:gameId/lobby" element={<PageWrapper><Lobby /></PageWrapper>} />
        <Route path="/game/:gameId/palpites" element={<PageWrapper><Palpites /></PageWrapper>} />
        <Route path="/game/:gameId/mesa" element={<PageWrapper><Mesa /></PageWrapper>} />
        <Route path="/game/:gameId/resultados" element={<PageWrapper><Resultados /></PageWrapper>} />
        <Route path="/game/:gameId/placar" element={<PageWrapper><Placar /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><PageNotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
      <AnimatedRoutes />
      <StickyScoreboard />
      <BottomNav />
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App