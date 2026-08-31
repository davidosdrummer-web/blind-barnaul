import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { db, useDb, applyTheme, tickTimers } from "./lib/db";
import { Toasts } from "./lib/ui";
import Login from "./screens/Login";
import Shell from "./screens/Shell";
import { TvMain, TvFinal, TvResults, TvRanking } from "./screens/Tv";

applyTheme(db.get().club);

function Gate({ children }: { children: React.ReactNode }) {
  const s = useDb();
  if (!s.session.uid) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const s = useDb();
  useEffect(() => { applyTheme(s.club); }, [s.club]);
  useEffect(() => {
    const i = setInterval(tickTimers, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <HashRouter>
      <ScrollTop />
      <Routes>
        <Route path="/login" element={s.session.uid ? <Navigate to="/app/home" replace /> : <Login />} />
        <Route path="/screen/main/:tid" element={<TvMain />} />
        <Route path="/screen/final/:tid" element={<TvFinal />} />
        <Route path="/screen/results/:tid" element={<TvResults />} />
        <Route path="/screen/ranking" element={<TvRanking />} />
        <Route path="/app/:section?/:p1?/:p2?" element={<Gate><Shell /></Gate>} />
        <Route path="*" element={<Navigate to={s.session.uid ? "/app/home" : "/login"} replace />} />
      </Routes>
      <Toasts />
    </HashRouter>
  );
}
