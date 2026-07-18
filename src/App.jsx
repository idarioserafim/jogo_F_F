import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from "@/lib/PageNotFound";
import ScrollToTop from './components/ScrollToTop';
import PageWrapper from '@/components/PageWrapper';
import StickyScoreboard from '@/components/StickyScoreboard';
import BottomNav from '@/components/BottomNav';
// Add page imports here
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

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AnimatedRoutes />
        <StickyScoreboard />
        <BottomNav />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
