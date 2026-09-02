import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { applyTheme } from "./lib/db";
import { useFirebaseData } from "./lib/useFirebaseData";
import { useAuth } from "./lib/useAuth";
import Login from "./screens/Login";
import Shell from "./screens/Shell";
import { TvMain, TvFinal, TvResults, TvRanking } from "./screens/Tv";
import { Toasts } from "./lib/ui";

function Gate({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return null;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { club } = useFirebaseData();
  useEffect(() => { if (club) applyTheme(club); }, [club]);

  return (
    <HashRouter>
      <ScrollTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/screen/main/:tid" element={<TvMain />} />
        <Route path="/screen/final/:tid" element={<TvFinal />} />
        <Route path="/screen/results/:tid" element={<TvResults />} />
        <Route path="/screen/ranking" element={<TvRanking />} />
        <Route path="/app/:section?/:p1?/:p2?" element={<Gate><Shell /></Gate>} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
      <Toasts />
    </HashRouter>
  );
}