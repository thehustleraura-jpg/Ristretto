import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./styles.css";
import { AuthProvider, CatalogProvider, useAuth } from "./lib/api";
import { Landing } from "./pages/Landing";
import { VideozypherLanding } from "./pages/VideozypherLanding";
import { AuthPage } from "./pages/AuthPage";
import { Shell } from "./app/Shell";
import { CreatePage } from "./app/Create";
import { StudiosPage } from "./app/Studios";
import { CharactersPage } from "./app/Characters";
import { ToolsPage } from "./app/Tools";
import { VideozypherApp } from "./app/Videozypher";
import { HistoryPage } from "./app/History";
import { CommunityPage } from "./app/Community";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/videozypher" element={<VideozypherLanding />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/app" element={<Protected><Shell /></Protected>}>
              <Route index element={<CreatePage />} />
              <Route path="studios" element={<StudiosPage />} />
              <Route path="studios/:id" element={<StudiosPage />} />
              <Route path="characters" element={<CharactersPage />} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="videozypher" element={<VideozypherApp />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="community" element={<CommunityPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
