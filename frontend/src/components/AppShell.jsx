import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Layers,
  LogOut,
  Plus,
  Sparkles,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Sparkles },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/progress", label: "Progress", icon: BarChart3 },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const accountButton = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        accountButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [menuOpen]);

  const initials = (user?.name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/dashboard" className="shrink-0" aria-label="ORAYA home">
            <Logo size="sm" />
          </Link>

          <nav
            aria-label="Main"
            className="ml-4 hidden items-center gap-1 md:flex"
          >
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${
                    isActive
                      ? "bg-sage-soft text-sage-ink"
                      : "text-muted hover:bg-sunken hover:text-ink"
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/learn/new"
              aria-label="New lecture"
              className={`btn ${location.pathname === "/dashboard" ? "btn-secondary" : "btn-primary"} !px-3 sm:!px-5`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">New lecture</span>
            </Link>

            <div className="relative">
              <button
                type="button"
                ref={accountButton}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-sm font-bold text-ink"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Account menu for ${user?.name || user?.email}`}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {initials}
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-sm font-bold">{user?.name}</p>
                      <p className="truncate text-xs text-muted">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      autoFocus
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-surface2"
                      onClick={() => {
                        logout();
                        navigate("/");
                      }}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <nav
          aria-label="Main (mobile)"
          className="grid grid-cols-4 gap-1 px-3 pb-2 md:hidden"
        >
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold ${
                  isActive ? "bg-sage-soft text-sage-ink" : "text-muted"
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
