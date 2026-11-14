import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import LectureWorkspace from "./pages/LectureWorkspace";
import Library from "./pages/Library";
import Login from "./pages/Login";
import NewLecture from "./pages/NewLecture";
import Onboarding from "./pages/Onboarding";
import Progress from "./pages/Progress";
import Signup from "./pages/Signup";
import Flashcards from "./pages/Flashcards";
import { Loading } from "./components/ui";

function Protected({ children }) {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loading label="Starting ORAYA…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  const { user, booting } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />

      <Route
        path="/onboarding"
        element={
          <Protected>
            <Onboarding />
          </Protected>
        }
      />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>

      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="learn/new" element={<NewLecture />} />
        <Route path="library" element={<Library />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="progress" element={<Progress />} />
        <Route path="lecture/:id" element={<LectureWorkspace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route
        path="*"
        element={
          booting ? (
            <div className="min-h-screen grid place-items-center">
              <Loading />
            </div>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}
