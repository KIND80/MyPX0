import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { Brain, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import OnboardingFlow from "./pages/OnboardingFlow";

const LAST_PRIVATE_PATH_KEY = "mypx_last_private_path";

export default function App() {
  const location = useLocation();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (session && location.pathname.startsWith("/dashboard")) {
      localStorage.setItem(
        LAST_PRIVATE_PATH_KEY,
        `${location.pathname}${location.search}${location.hash}`
      );
    }
  }, [location.pathname, location.search, location.hash, session]);

  const getLastPrivatePath = () => {
    return localStorage.getItem(LAST_PRIVATE_PATH_KEY) || "/dashboard";
  };

  const checkOnboarding = async (currentSession: Session | null) => {
    if (!currentSession) {
      setOnboardingDone(false);
      setCheckingOnboarding(false);
      return;
    }

    setCheckingOnboarding(true);

    try {
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("completed")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.error("Erreur onboarding:", error.message);
        setOnboardingDone(false);
        return;
      }

      if (!data) {
        const { error: insertError } = await supabase
          .from("user_onboarding")
          .insert({
            user_id: currentSession.user.id,
            completed: false,
          });

        if (insertError) {
          console.error("Erreur création onboarding:", insertError.message);
        }

        setOnboardingDone(false);
        return;
      }

      setOnboardingDone(data.completed === true);
    } catch (err) {
      console.error("Erreur inattendue onboarding:", err);
      setOnboardingDone(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const safeCheckOnboarding = async (currentSession: Session | null) => {
      await Promise.race([
        checkOnboarding(currentSession),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    };

    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) console.error("Erreur session:", error.message);
        if (!mounted) return;

        setSession(session);

        if (session) {
          await safeCheckOnboarding(session);
        } else {
          setOnboardingDone(false);
        }
      } catch (err) {
        console.error("Erreur init app:", err);

        if (mounted) {
          setSession(null);
          setOnboardingDone(false);
        }
      } finally {
        if (mounted) {
          setCheckingOnboarding(false);
          setLoading(false);
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);

      try {
        if (session) {
          await safeCheckOnboarding(session);
        } else {
          setOnboardingDone(false);
        }
      } finally {
        if (mounted) {
          setCheckingOnboarding(false);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const PrivateDashboard = () => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }

    if (!onboardingDone) {
      return <OnboardingFlow session={session} />;
    }

    return <Dashboard session={session} />;
  };

  if (loading || checkingOnboarding) {
    return <MyPXLoading checkingOnboarding={checkingOnboarding} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          !session ? <Login /> : <Navigate to={getLastPrivatePath()} replace />
        }
      />

      <Route
        path="/register"
        element={
          !session ? (
            <Register />
          ) : (
            <Navigate to={getLastPrivatePath()} replace />
          )
        }
      />

      <Route path="/dashboard/*" element={<PrivateDashboard />} />

      <Route
        path="*"
        element={
          session ? (
            <Navigate to={getLastPrivatePath()} replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

function MyPXLoading({ checkingOnboarding }: { checkingOnboarding: boolean }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f4ff] px-5 text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.22),transparent_32%),linear-gradient(135deg,#fff7ed_0%,#f5f3ff_45%,#ecfeff_100%)]" />

      <div className="absolute left-[-80px] top-[-80px] h-64 w-64 animate-pulse rounded-full bg-violet-300/40 blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] h-72 w-72 animate-pulse rounded-full bg-cyan-300/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-violet-200/60 backdrop-blur-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-300/50">
              <Brain className="h-6 w-6" />
            </div>

            <div>
              <p className="text-lg font-black tracking-tight">MyPX</p>
              <p className="text-xs font-medium text-slate-500">
                Portfolio Intelligence
              </p>
            </div>
          </div>

          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            IA active
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-violet-700">
            <Sparkles className="h-4 w-4" />
            Préparation de votre espace intelligent
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Chargement de MyPX...
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Nous synchronisons votre session, vos préférences et votre tableau
            de bord pour une expérience fluide.
          </p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-violet-50 p-3">
              <Loader2 className="mb-2 h-4 w-4 animate-spin text-violet-600" />
              <p className="text-xs font-bold text-slate-700">
                {checkingOnboarding ? "Onboarding" : "Connexion"}
              </p>
              <p className="text-[11px] text-slate-500">Vérification</p>
            </div>

            <div className="rounded-2xl bg-cyan-50 p-3">
              <ShieldCheck className="mb-2 h-4 w-4 text-cyan-600" />
              <p className="text-xs font-bold text-slate-700">Sécurité</p>
              <p className="text-[11px] text-slate-500">Session protégée</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}