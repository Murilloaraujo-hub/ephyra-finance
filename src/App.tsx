import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  authDebug,
  checkAuth,
  requestPasswordReset,
  signInWithEmail,
  signOutExplicitly,
  signUpWithEmail,
  updateRecoveredPassword,
  type AuthNotice,
  type AuthState,
} from "./lib/auth";
import { supabase } from "./lib/supabase";

type AuthFormMode = "login" | "signup" | "forgot";
type AuthView = AuthFormMode | "update-password";
type DashboardSection =
  | "overview"
  | "transactions"
  | "goals"
  | "market"
  | "achievements"
  | "assistant"
  | "settings";

type IconName =
  | "brand"
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "arrow"
  | "home"
  | "receipt"
  | "target"
  | "trend"
  | "award"
  | "sparkles"
  | "settings"
  | "logout"
  | "shield"
  | "user"
  | "key"
  | "check"
  | "arrowLeft"
  | "close";

const iconContent: Record<IconName, ReactNode> = {
  brand: (
    <>
      <path d="M21 5.5c-7.5.4-12.1 3.6-13.8 9.4-1 3.5.3 6.4 3.4 7.6 3.2 1.2 6.9-.8 8.2-4.3 1.3-3.5-.2-7.1-4-8.6" />
      <path d="M4 22c2.5-5.1 6.2-8.7 11.2-10.8" />
      <path d="M8.8 14.9c.3 2.4 1.8 4.1 4.5 5.1" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.4 0 10 6 10 6a16.6 16.6 0 0 1-3 3.6M6.2 6.3C3.5 8 2 12 2 12s3.6 6 10 6c.9 0 1.8-.1 2.6-.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z" />,
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6M9 16h2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  trend: (
    <>
      <path d="m3 16 6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="m8.2 13-1.2 8 5-2.5 5 2.5-1.2-8M12 5v6m-3-3h6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
      <path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.2.9-1.5 2.6-1.4-.6a7.5 7.5 0 0 1-1.6.9l-.2 1.5h-3l-.2-1.5a7.5 7.5 0 0 1-1.6-.9l-1.4.6-1.5-2.6 1.2-.9a7 7 0 0 1 0-1.8l-1.2-.9 1.5-2.6 1.4.6a7.5 7.5 0 0 1 1.6-.9l.2-1.5h3l.2 1.5a7.5 7.5 0 0 1 1.6.9l1.4-.6 1.5 2.6-1.2.9a7 7 0 0 1 0 1.8Z" transform="translate(-1.5 -1.5) scale(1.125)" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5m5 5H3" />
      <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="5" />
      <path d="m11.5 11.5 8-8L22 6l-2 2 2 2-2 2-2-2-3 3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  arrowLeft: <path d="M20 12H5m6 6-6-6 6-6" />,
  close: <path d="m18 6-12 12M6 6l12 12" />,
};

function Icon({ name, size = 20, strokeWidth = 1.7 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconContent[name]}
    </svg>
  );
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-lockup${inverse ? " brand-lockup-inverse" : ""}`}>
      <span className="brand-symbol"><Icon name="brand" size={25} strokeWidth={1.65} /></span>
      <span className="brand-wordmark">ephyra<span>FINANCE</span></span>
    </span>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() =>
    supabase ? { status: "loading" } : { status: "unconfigured" },
  );
  const [authView, setAuthView] = useState<AuthView>("login");
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const checkSequence = useRef(0);

  const refreshAuth = useCallback(async () => {
    const sequence = ++checkSequence.current;
    const state = await checkAuth();
    if (mounted.current && sequence === checkSequence.current) setAuth(state);
    return state;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuth({ status: "unconfigured" });
      return;
    }

    mounted.current = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authDebug("auth_event", {
        event,
        hasSession: Boolean(session),
        hasUser: Boolean(session?.user?.id),
        hasAccessToken: Boolean(session?.access_token),
      });

      if (event === "SIGNED_OUT") {
        checkSequence.current += 1;
        setAuth({ status: "anonymous" });
        setAuthView("login");
        setNotice({ kind: "success", message: "A sessão foi encerrada." });
        return;
      }

      if (event === "PASSWORD_RECOVERY") {
        setAuthView("update-password");
        setNotice(null);
      }

      // Defer SDK calls until the synchronous auth listener has returned.
      if (event !== "INITIAL_SESSION") {
        window.setTimeout(() => {
          if (mounted.current) void refreshAuth();
        }, 0);
      }
    });

    void refreshAuth();

    return () => {
      mounted.current = false;
      checkSequence.current += 1;
      subscription.unsubscribe();
    };
  }, [refreshAuth]);

  const handleLogin = async (email: string, password: string) => {
    setBusy(true);
    setNotice(null);
    const result = await signInWithEmail(email, password);
    if (result.ok) {
      setAuth(result.auth);
      setNotice(null);
    } else {
      if (result.auth) setAuth(result.auth);
      setNotice({ kind: "error", message: result.message });
    }
    setBusy(false);
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    setBusy(true);
    setNotice(null);
    const result = await signUpWithEmail(name, email, password);

    if (result.ok && result.kind === "authenticated") {
      setAuth(result.auth);
      setNotice(null);
    } else if (result.ok && result.kind === "confirmation_required") {
      setAuth({ status: "anonymous" });
      setAuthView("login");
      setNotice({
        kind: "success",
        message: `Conta criada. Verifique ${result.email} para confirmar seu e-mail antes de entrar.`,
      });
    } else {
      if (result.auth) setAuth(result.auth);
      setNotice({ kind: "error", message: result.message });
    }
    setBusy(false);
  };

  const handlePasswordResetRequest = async (email: string) => {
    setBusy(true);
    setNotice(null);
    const result = await requestPasswordReset(email);
    setNotice(
      result.ok
        ? {
            kind: "success",
            message: "Se houver uma conta para este e-mail, enviaremos um link seguro para redefinir sua senha.",
          }
        : { kind: "error", message: result.message ?? "Não foi possível enviar o link." },
    );
    setBusy(false);
  };

  const handlePasswordUpdate = async (password: string) => {
    setBusy(true);
    setNotice(null);
    const result = await updateRecoveredPassword(password);
    if (result.auth) setAuth(result.auth);

    if (result.ok) {
      setAuthView("login");
      setNotice({ kind: "success", message: result.message ?? "Senha atualizada com sucesso." });
    } else {
      setNotice({ kind: "error", message: result.message });
    }
    setBusy(false);
  };

  const handleExplicitSignOut = async () => {
    setBusy(true);
    const result = await signOutExplicitly();
    if (result.ok) {
      setAuth({ status: "anonymous" });
      setAuthView("login");
      setNotice({ kind: "success", message: "A sessão foi encerrada." });
    } else {
      setNotice({ kind: "error", message: result.message ?? "Não foi possível encerrar a sessão." });
    }
    setBusy(false);
  };

  const changeAuthView = (view: AuthView) => {
    setAuthView(view);
    setNotice(null);
  };

  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "unconfigured") return <ConfigurationScreen />;
  if (auth.status === "unavailable") {
    return (
      <SessionProblem
        message={auth.message}
        notice={notice}
        busy={busy}
        onRetry={() => void refreshAuth()}
        onSignOut={() => void handleExplicitSignOut()}
      />
    );
  }

  if (auth.status === "authenticated") {
    if (authView === "update-password") {
      return (
        <PasswordUpdateScreen
          busy={busy}
          notice={notice}
          onSubmit={(password) => void handlePasswordUpdate(password)}
          onCancel={() => changeAuthView("login")}
        />
      );
    }

    return (
      <Dashboard
        user={auth.user}
        session={auth.session}
        notice={notice}
        busy={busy}
        onClearNotice={() => setNotice(null)}
        onSignOut={() => void handleExplicitSignOut()}
        onPasswordReset={() => void handlePasswordResetRequest(auth.user.email ?? "")}
      />
    );
  }

  if (authView === "update-password") {
    return (
      <RecoveryLinkProblem
        notice={notice}
        onBackToLogin={() => changeAuthView("login")}
        onRetry={() => void refreshAuth()}
      />
    );
  }

  return (
    <AuthScreen
      key={authView}
      mode={authView}
      notice={notice}
      busy={busy}
      onModeChange={changeAuthView}
      onLogin={(email, password) => void handleLogin(email, password)}
      onSignUp={(name, email, password) => void handleSignUp(name, email, password)}
      onPasswordReset={(email) => void handlePasswordResetRequest(email)}
    />
  );
}

function AuthScreen({
  mode,
  notice,
  busy,
  onModeChange,
  onLogin,
  onSignUp,
  onPasswordReset,
}: {
  mode: AuthFormMode;
  notice: AuthNotice | null;
  busy: boolean;
  onModeChange: (mode: AuthView) => void;
  onLogin: (email: string, password: string) => void;
  onSignUp: (name: string, email: string, password: string) => void;
  onPasswordReset: (email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [localError, setLocalError] = useState("");

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");
    if (isSignup && password !== confirmPassword) {
      setLocalError("As senhas não coincidem. Confira e tente novamente.");
      return;
    }
    if (isForgot) onPasswordReset(email);
    else if (isSignup) onSignUp(name, email, password);
    else onLogin(email, password);
  };

  const heading = isForgot
    ? "Recupere seu acesso"
    : isSignup
      ? "Comece pela sua conta"
      : "Entre na sua Ephyra";
  const subheading = isForgot
    ? "Enviaremos um link seguro para o e-mail cadastrado."
    : isSignup
      ? "Um lugar mais claro para cuidar do seu dinheiro."
      : "Que bom ter você de volta. Seu espaço está esperando.";

  return (
    <main className="auth-layout">
      <section className="auth-showcase" aria-label="Conheça a Ephyra Finance">
        <div className="showcase-noise" />
        <header className="showcase-header">
          <Brand inverse />
          <span className="showcase-caption">FINANÇAS COM INTENÇÃO</span>
        </header>

        <div className="showcase-main">
          <p className="showcase-eyebrow"><span /> MAIS CLAREZA, MENOS RUÍDO</p>
          <h1>Seu dinheiro acompanha <em>quem você quer ser.</em></h1>
          <p className="showcase-description">
            Um jeito mais consciente de entender suas escolhas e construir o próximo capítulo.
          </p>

          <div className="visual-chart" aria-hidden="true">
            <div className="visual-chart-heading">
              <span>UM PASSO DE CADA VEZ</span>
              <span className="chart-spark"><Icon name="trend" size={17} /> progresso</span>
            </div>
            <svg className="auth-chart" viewBox="0 0 600 154" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-area" x1="300" y1="16" x2="300" y2="154" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a8d0a6" stopOpacity=".2" />
                  <stop offset="1" stopColor="#a8d0a6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 118H600M0 77H600M0 36H600" stroke="white" strokeOpacity=".1" strokeDasharray="3 7" />
              <path d="M0 131C38 126 51 103 92 108C129 112 138 82 178 88C217 94 231 54 274 69C312 83 322 56 365 60C404 64 421 38 456 47C495 56 511 23 548 32C571 38 584 23 600 17V154H0V131Z" fill="url(#chart-area)" />
              <path className="chart-line" d="M0 131C38 126 51 103 92 108C129 112 138 82 178 88C217 94 231 54 274 69C312 83 322 56 365 60C404 64 421 38 456 47C495 56 511 23 548 32C571 38 584 23 600 17" stroke="#c0dfac" strokeWidth="2.4" strokeLinecap="round" />
              <circle className="chart-point" cx="548" cy="32" r="4" fill="#d9e8b1" />
            </svg>
            <div className="chart-labels"><span>HOJE</span><span>NO SEU RITMO</span><span>O PRÓXIMO PASSO</span></div>
          </div>
        </div>

        <footer className="showcase-footer">
          <span>Pequenas decisões. Um futuro mais seu.</span>
          <span className="showcase-footer-mark"><Icon name="shield" size={16} /> Sua conta, protegida.</span>
        </footer>
        <span className="showcase-orb showcase-orb-one" />
        <span className="showcase-orb showcase-orb-two" />
      </section>

      <section className="auth-content">
        <div className="mobile-brand"><Brand /></div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <p className="auth-kicker">{isForgot ? "RECUPERAÇÃO SEGURA" : isSignup ? "BEM-VINDA À EPHYRA" : "SEU ESPAÇO FINANCEIRO"}</p>
            <h2>{heading}</h2>
            <p>{subheading}</p>
          </div>

          {notice && <NoticeBanner notice={notice} />}
          {localError && <NoticeBanner notice={{ kind: "error", message: localError }} />}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <label className="field-group" htmlFor="signup-name">
                <span>Como podemos chamar você?</span>
                <span className="input-wrap">
                  <Icon name="user" size={18} />
                  <input id="signup-name" type="text" name="name" autoComplete="name" placeholder="Seu nome" value={name} onChange={(event) => setName(event.target.value)} required disabled={busy} />
                </span>
              </label>
            )}

            <label className="field-group" htmlFor={`${mode}-email`}>
              <span>Endereço de e-mail</span>
              <span className="input-wrap">
                <Icon name="mail" size={18} />
                <input id={`${mode}-email`} type="email" name="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} />
              </span>
            </label>

            {!isForgot && (
              <label className="field-group" htmlFor={`${mode}-password`}>
                <span>Senha</span>
                <span className="input-wrap">
                  <Icon name="lock" size={18} />
                  <input id={`${mode}-password`} type={passwordVisible ? "text" : "password"} name="password" autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "Pelo menos 8 caracteres" : "Digite sua senha"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isSignup ? 8 : undefined} required disabled={busy} />
                  <button className="input-action" type="button" aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setPasswordVisible((visible) => !visible)}>
                    <Icon name={passwordVisible ? "eyeOff" : "eye"} size={18} />
                  </button>
                </span>
              </label>
            )}

            {isSignup && (
              <label className="field-group" htmlFor="signup-confirm-password">
                <span>Confirme sua senha</span>
                <span className="input-wrap">
                  <Icon name="lock" size={18} />
                  <input id="signup-confirm-password" type={passwordVisible ? "text" : "password"} name="confirm-password" autoComplete="new-password" placeholder="Digite a senha novamente" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required disabled={busy} />
                </span>
              </label>
            )}

            {mode === "login" && (
              <div className="form-options">
                <span><Icon name="shield" size={15} /> Acesso protegido</span>
                <button type="button" className="text-button" onClick={() => onModeChange("forgot")}>Esqueci minha senha</button>
              </div>
            )}

            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? <span className="button-spinner" /> : null}
              <span>{busy ? "Aguarde..." : isForgot ? "Enviar link de recuperação" : isSignup ? "Criar minha conta" : "Entrar na Ephyra"}</span>
              {!busy && <Icon name="arrow" size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            {isForgot ? (
              <>Lembrou sua senha? <button type="button" className="text-button" onClick={() => onModeChange("login")}>Voltar para entrar</button></>
            ) : isSignup ? (
              <>Já tem uma conta? <button type="button" className="text-button" onClick={() => onModeChange("login")}>Entrar</button></>
            ) : (
              <>Ainda não tem conta? <button type="button" className="text-button" onClick={() => onModeChange("signup")}>Criar uma conta</button></>
            )}
          </div>

          <p className="auth-privacy"><Icon name="lock" size={14} /> Sua senha é validada e gerenciada pelo Supabase Auth.</p>
        </div>
        <footer className="auth-content-footer">© {new Date().getFullYear()} Ephyra Finance</footer>
      </section>
    </main>
  );
}

function PasswordUpdateScreen({
  busy,
  notice,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  notice: AuthNotice | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");
    if (password !== confirmPassword) {
      setLocalError("As senhas não coincidem. Confira e tente novamente.");
      return;
    }
    onSubmit(password);
  };

  return (
    <main className="standalone-page">
      <div className="standalone-top"><Brand /></div>
      <section className="standalone-panel">
        <span className="standalone-icon"><Icon name="key" size={23} /></span>
        <p className="auth-kicker">LINK DE RECUPERAÇÃO VALIDADO</p>
        <h1>Crie uma nova senha</h1>
        <p className="standalone-description">Escolha uma senha nova para proteger sua conta Ephyra.</p>
        {notice && <NoticeBanner notice={notice} />}
        {localError && <NoticeBanner notice={{ kind: "error", message: localError }} />}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-group" htmlFor="new-password">
            <span>Nova senha</span>
            <span className="input-wrap">
              <Icon name="lock" size={18} />
              <input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" placeholder="Pelo menos 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required disabled={busy} />
              <button className="input-action" type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible((value) => !value)}><Icon name={visible ? "eyeOff" : "eye"} size={18} /></button>
            </span>
          </label>
          <label className="field-group" htmlFor="confirm-new-password">
            <span>Confirme a nova senha</span>
            <span className="input-wrap">
              <Icon name="lock" size={18} />
              <input id="confirm-new-password" type={visible ? "text" : "password"} autoComplete="new-password" placeholder="Digite a senha novamente" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required disabled={busy} />
            </span>
          </label>
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? <span className="button-spinner" /> : null}<span>{busy ? "Atualizando..." : "Atualizar senha"}</span>{!busy && <Icon name="arrow" size={18} />}
          </button>
        </form>
        <button type="button" className="back-button" onClick={onCancel}><Icon name="arrowLeft" size={16} /> Voltar</button>
      </section>
      <p className="standalone-footer">© {new Date().getFullYear()} Ephyra Finance</p>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <Brand />
      <span className="loading-ring" />
      <p>Verificando sua sessão segura...</p>
    </main>
  );
}

function ConfigurationScreen() {
  return (
    <main className="system-page">
      <Brand />
      <section className="system-panel">
        <span className="system-icon"><Icon name="settings" size={25} /></span>
        <p className="auth-kicker">CONFIGURAÇÃO NECESSÁRIA</p>
        <h1>Conecte seu projeto Supabase</h1>
        <p>O fluxo de autenticação está pronto, mas faltam as variáveis públicas do projeto neste ambiente.</p>
        <div className="env-list"><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div>
        <p className="system-footnote">Configure-as no ambiente local e nas variáveis de build da Vercel. Consulte <strong>AUTH_SETUP.md</strong>.</p>
      </section>
    </main>
  );
}

function SessionProblem({
  message,
  notice,
  busy,
  onRetry,
  onSignOut,
}: {
  message: string;
  notice: AuthNotice | null;
  busy: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="system-page">
      <Brand />
      <section className="system-panel">
        <span className="system-icon system-icon-warning"><Icon name="shield" size={25} /></span>
        <p className="auth-kicker">SESSÃO PRESERVADA</p>
        <h1>Não foi possível confirmar o acesso</h1>
        <p>{message}</p>
        {notice && <NoticeBanner notice={notice} />}
        <div className="system-actions">
          <button className="primary-button" type="button" onClick={onRetry} disabled={busy}>{busy ? "Verificando..." : "Tentar novamente"}{!busy && <Icon name="arrow" size={18} />}</button>
          <button className="secondary-button" type="button" onClick={onSignOut} disabled={busy}>Encerrar esta sessão</button>
        </div>
        <p className="system-footnote">Se a conexão estiver instável, seus tokens não serão apagados automaticamente.</p>
      </section>
    </main>
  );
}

function RecoveryLinkProblem({ notice, onBackToLogin, onRetry }: { notice: AuthNotice | null; onBackToLogin: () => void; onRetry: () => void }) {
  return (
    <main className="system-page">
      <Brand />
      <section className="system-panel">
        <span className="system-icon system-icon-warning"><Icon name="key" size={25} /></span>
        <p className="auth-kicker">RECUPERAÇÃO DE SENHA</p>
        <h1>Este link não abriu uma sessão</h1>
        <p>O link pode ter expirado ou ainda estar sendo validado. Tente verificar novamente ou solicite outro link pela tela de login.</p>
        {notice && <NoticeBanner notice={notice} />}
        <div className="system-actions">
          <button className="primary-button" type="button" onClick={onRetry}>Verificar novamente <Icon name="arrow" size={18} /></button>
          <button className="secondary-button" type="button" onClick={onBackToLogin}>Voltar para entrar</button>
        </div>
      </section>
    </main>
  );
}

const dashboardNav: { id: DashboardSection; label: string; icon: IconName }[] = [
  { id: "overview", label: "Visão geral", icon: "home" },
  { id: "transactions", label: "Transações", icon: "receipt" },
  { id: "goals", label: "Metas", icon: "target" },
  { id: "market", label: "Mercado", icon: "trend" },
  { id: "achievements", label: "Conquistas", icon: "award" },
  { id: "assistant", label: "Assistente", icon: "sparkles" },
];

const sectionCopy: Record<DashboardSection, { title: string; description: string; prompt: string }> = {
  overview: {
    title: "Visão geral",
    description: "Um ponto de partida claro para cuidar do seu dinheiro.",
    prompt: "Quando seus dados financeiros estiverem conectados, sua visão completa aparecerá aqui.",
  },
  transactions: {
    title: "Transações",
    description: "Acompanhe entradas e saídas com mais contexto.",
    prompt: "A API de transações não está presente neste repositório. Nenhum lançamento fictício será exibido.",
  },
  goals: {
    title: "Metas",
    description: "Transforme planos em próximos passos possíveis.",
    prompt: "A API de metas não está presente neste repositório. Suas metas só devem aparecer quando conectadas ao banco com RLS.",
  },
  market: {
    title: "Mercado",
    description: "Acompanhe o mercado com informação atualizada.",
    prompt: "Uma fonte de cotações não está configurada nesta implantação. Não exibimos preços desatualizados como se fossem atuais.",
  },
  achievements: {
    title: "Conquistas",
    description: "Reconheça cada passo da sua jornada financeira.",
    prompt: "XP, moedas e conquistas ainda não têm serviço de dados conectado neste projeto.",
  },
  assistant: {
    title: "Assistente financeiro",
    description: "Ideias para tomar decisões mais conscientes.",
    prompt: "O serviço do assistente financeiro não está configurado neste repositório.",
  },
  settings: {
    title: "Configurações",
    description: "Gerencie o acesso e a segurança da sua conta.",
    prompt: "Sua sessão é mantida pelo Supabase Auth e pode ser encerrada somente por você.",
  },
};

function Dashboard({
  user,
  session,
  notice,
  busy,
  onClearNotice,
  onSignOut,
  onPasswordReset,
}: {
  user: User;
  session: Session;
  notice: AuthNotice | null;
  busy: boolean;
  onClearNotice: () => void;
  onSignOut: () => void;
  onPasswordReset: () => void;
}) {
  const [section, setSection] = useState<DashboardSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const accountName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim().split(" ")[0]
      : user.email?.split("@")[0] || "por aqui";
  const activeCopy = sectionCopy[section];
  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "gerenciada automaticamente";

  const chooseSection = (next: DashboardSection) => {
    setSection(next);
    setMobileNavOpen(false);
    onClearNotice();
  };

  return (
    <main className="workspace-shell">
      {mobileNavOpen && <button className="mobile-nav-scrim" aria-label="Fechar navegação" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`workspace-sidebar${mobileNavOpen ? " workspace-sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Brand /></div>
        <div className="sidebar-caption">ESPAÇO FINANCEIRO</div>
        <nav className="workspace-nav" aria-label="Navegação principal">
          {dashboardNav.map((item) => (
            <button className={`nav-link${section === item.id ? " nav-link-active" : ""}`} type="button" key={item.id} onClick={() => chooseSection(item.id)} aria-current={section === item.id ? "page" : undefined}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>{section === item.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button className={`nav-link${section === "settings" ? " nav-link-active" : ""}`} type="button" onClick={() => chooseSection("settings")} aria-current={section === "settings" ? "page" : undefined}>
          <Icon name="settings" size={19} /><span>Configurações</span>
        </button>
        <div className="sidebar-account">
          <span className="account-avatar">{accountName.slice(0, 1).toUpperCase()}</span>
          <span className="account-text"><strong>{accountName}</strong><small>{user.email}</small></span>
          <button className="logout-icon-button" type="button" aria-label="Sair da conta" onClick={onSignOut} disabled={busy}><Icon name="logout" size={18} /></button>
        </div>
        <div className="sidebar-footnote"><Icon name="shield" size={14} /> Sessão protegida</div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <button className="mobile-menu-button" type="button" aria-label="Abrir navegação" onClick={() => setMobileNavOpen(true)}><span /><span /><span /></button>
          <div className="topbar-crumb"><span>Ephyra</span><span className="crumb-slash">/</span><strong>{activeCopy.title}</strong></div>
          <div className="topbar-account"><span className="topbar-status-dot" /><span>Sessão ativa</span><span className="topbar-divider" /><span className="topbar-email">{user.email}</span></div>
        </header>

        <div className="workspace-scroll">
          <div className="dashboard-content">
            {notice && <NoticeBanner notice={notice} onDismiss={onClearNotice} />}
            <div className="dashboard-heading">
              <div>
                <p className="dashboard-eyebrow">SEU ESPAÇO EPHYRA</p>
                <h1>{section === "overview" ? `Olá, ${accountName}.` : activeCopy.title}</h1>
                <p>{activeCopy.description}</p>
              </div>
              <div className="date-caption"><span className="date-caption-dot" /> CONTA AUTENTICADA</div>
            </div>

            {section === "overview" ? (
              <OverviewContent user={user} expiresAt={expiresAt} onNavigate={chooseSection} />
            ) : section === "settings" ? (
              <SettingsContent user={user} expiresAt={expiresAt} busy={busy} onPasswordReset={onPasswordReset} onSignOut={onSignOut} />
            ) : (
              <ModuleEmptyState section={section} prompt={activeCopy.prompt} onBack={() => chooseSection("overview")} />
            )}
            <footer className="workspace-footer"><span>Ephyra Finance</span><span>Feito para decisões mais conscientes.</span></footer>
          </div>
        </div>
      </section>
    </main>
  );
}

function OverviewContent({ user, expiresAt, onNavigate }: { user: User; expiresAt: string; onNavigate: (section: DashboardSection) => void }) {
  return (
    <>
      <section className="welcome-panel">
        <div className="welcome-copy">
          <p className="welcome-label"><span /> UM NOVO OLHAR PARA O SEU DINHEIRO</p>
          <h2>Clareza para o agora.<br /><em>Espaço para o que vem.</em></h2>
          <p>Sua conta está pronta. Conecte os dados financeiros da sua implantação para começar a acompanhar sua jornada.</p>
          <button className="welcome-link" type="button" onClick={() => onNavigate("transactions")}>Conhecer transações <Icon name="arrow" size={17} /></button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="welcome-orbit orbit-a" /><span className="welcome-orbit orbit-b" /><span className="welcome-orbit orbit-c" />
          <span className="welcome-core"><Icon name="brand" size={46} strokeWidth={1.3} /></span>
          <span className="welcome-dot dot-a" /><span className="welcome-dot dot-b" /><span className="welcome-dot dot-c" />
        </div>
        <div className="welcome-index">01 <span>/</span> 01</div>
      </section>

      <div className="overview-columns">
        <section className="data-section">
          <div className="section-heading-row">
            <div><p className="section-overline">SEU DINHEIRO, EM CONTEXTO</p><h2>Visão financeira</h2></div>
            <button className="subtle-link" type="button" onClick={() => onNavigate("transactions")}>Ver transações <Icon name="arrow" size={16} /></button>
          </div>
          <div className="empty-chart">
            <div className="empty-chart-grid" />
            <div className="empty-chart-center">
              <span className="empty-chart-icon"><Icon name="trend" size={20} /></span>
              <strong>Seus dados financeiros aparecerão aqui</strong>
              <span>Não há API de transações conectada nesta implantação.</span>
            </div>
            <div className="chart-axis-labels"><span>INÍCIO</span><span>AGORA</span></div>
          </div>
        </section>

        <section className="identity-section">
          <div className="section-heading-row">
            <div><p className="section-overline">ACESSO E IDENTIDADE</p><h2>Sua conta</h2></div>
            <span className="identity-status"><span /> ATIVA</span>
          </div>
          <div className="identity-email-row">
            <span className="identity-avatar"><Icon name="user" size={19} /></span>
            <span><small>Conectada como</small><strong>{user.email}</strong></span>
          </div>
          <div className="identity-detail"><span>Validação</span><strong><Icon name="check" size={15} /> Supabase Auth</strong></div>
          <div className="identity-detail"><span>Próxima renovação</span><strong>{expiresAt}</strong></div>
          <div className="identity-note"><Icon name="shield" size={16} /><span>Seu acesso é mantido pelo Supabase. A identidade confirmada é a origem de futuras consultas protegidas.</span></div>
        </section>
      </div>

      <section className="start-section">
        <div className="start-heading">
          <div><p className="section-overline">COMECE POR AQUI</p><h2>Seu próximo passo</h2></div>
          <span className="start-counter">0<span> / 3</span></span>
        </div>
        <div className="start-track"><span /></div>
        <div className="start-items">
          <button type="button" className="start-item" onClick={() => onNavigate("transactions")}>
            <span className="start-item-number">01</span><span className="start-item-copy"><strong>Entenda seus movimentos</strong><small>Registre entradas e despesas no seu ritmo.</small></span><Icon name="arrow" size={17} />
          </button>
          <button type="button" className="start-item" onClick={() => onNavigate("goals")}>
            <span className="start-item-number">02</span><span className="start-item-copy"><strong>Defina uma meta</strong><small>Transforme um desejo em um plano concreto.</small></span><Icon name="arrow" size={17} />
          </button>
          <button type="button" className="start-item" onClick={() => onNavigate("settings")}>
            <span className="start-item-number">03</span><span className="start-item-copy"><strong>Cuide da sua conta</strong><small>Revise o acesso e as opções de segurança.</small></span><Icon name="arrow" size={17} />
          </button>
        </div>
      </section>
    </>
  );
}

function SettingsContent({ user, expiresAt, busy, onPasswordReset, onSignOut }: { user: User; expiresAt: string; busy: boolean; onPasswordReset: () => void; onSignOut: () => void }) {
  return (
    <section className="settings-panel">
      <div className="settings-intro">
        <span className="settings-icon"><Icon name="shield" size={22} /></span>
        <div><p className="section-overline">SEGURANÇA DA CONTA</p><h2>Seu acesso, sob seu controle.</h2></div>
      </div>
      <div className="settings-row"><span>Conta Supabase</span><strong>{user.email}</strong></div>
      <div className="settings-row"><span>Estado da sessão</span><strong className="session-label"><span /> Autenticada</strong></div>
      <div className="settings-row"><span>Renovação prevista</span><strong>{expiresAt}</strong></div>
      <div className="settings-actions">
        <button className="secondary-button" type="button" onClick={onPasswordReset} disabled={busy || !user.email}><Icon name="key" size={17} /> Enviar link para redefinir senha</button>
        <button className="danger-button" type="button" onClick={onSignOut} disabled={busy}><Icon name="logout" size={17} /> Encerrar sessão neste dispositivo</button>
      </div>
      <p className="settings-footnote">O encerramento remove apenas a sessão deste dispositivo por meio de Supabase Auth. Nenhum dado de sessão é apagado durante a inicialização.</p>
    </section>
  );
}

function ModuleEmptyState({ section, prompt, onBack }: { section: DashboardSection; prompt: string; onBack: () => void }) {
  const module = dashboardNav.find((item) => item.id === section);
  const icon = module?.icon ?? "settings";
  return (
    <section className="module-empty-state">
      <span className="module-empty-icon"><Icon name={icon} size={23} /></span>
      <p className="section-overline">ÁREA PROTEGIDA EPHYRA</p>
      <h2>{sectionCopy[section].title}</h2>
      <p>{prompt}</p>
      <button className="secondary-button" type="button" onClick={onBack}>Voltar à visão geral <Icon name="arrow" size={17} /></button>
    </section>
  );
}

function NoticeBanner({ notice, onDismiss }: { notice: AuthNotice; onDismiss?: () => void }) {
  return (
    <div className={`notice-banner notice-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
      <span className="notice-icon"><Icon name={notice.kind === "success" ? "check" : "close"} size={16} /></span>
      <span>{notice.message}</span>
      {onDismiss && <button type="button" aria-label="Fechar mensagem" onClick={onDismiss}><Icon name="close" size={15} /></button>}
    </div>
  );
}
