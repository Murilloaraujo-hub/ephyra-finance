import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "authenticated"; session: Session; user: User }
  | { status: "unavailable"; session: Session | null; message: string };

export type AuthNotice = { kind: "success" | "error"; message: string };

export type AuthActionResult =
  | {
      ok: true;
      auth: Extract<AuthState, { status: "authenticated" }>;
    }
  | { ok: false; message: string; auth?: AuthState };

export type PasswordUpdateResult =
  | { ok: true; auth: AuthState; message?: string }
  | { ok: false; message: string; auth?: AuthState };

export type SignUpResult =
  | {
      ok: true;
      kind: "authenticated";
      auth: Extract<AuthState, { status: "authenticated" }>;
    }
  | { ok: true; kind: "confirmation_required"; email: string }
  | { ok: false; message: string; auth?: AuthState };

type SafeDebugDetails = Record<string, boolean | number | string>;

// Development traces contain state flags only, never credentials or tokens.
export function authDebug(event: string, details: SafeDebugDetails = {}) {
  if (import.meta.env.DEV) {
    console.info(`[Ephyra auth] ${event}`, details);
  }
}

function getErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }
  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Confirme seu e-mail pelo link enviado antes de entrar.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  if (lower.includes("password should be at least") || lower.includes("weak password")) {
    return "Escolha uma senha mais forte e tente novamente.";
  }

  return message || "Não foi possível concluir a solicitação. Tente novamente.";
}

function unavailable(
  message: string,
  session: Session | null = null,
): Extract<AuthState, { status: "unavailable" }> {
  return { status: "unavailable", session, message };
}

/** The only routine that decides whether a stored Supabase session is usable. */
export async function checkAuth(): Promise<AuthState> {
  if (!supabase) return { status: "unconfigured" };

  try {
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;

    authDebug("session_read", {
      hasSession: Boolean(session),
      hasUser: Boolean(session?.user?.id),
      hasAccessToken: Boolean(session?.access_token),
      hasError: Boolean(error),
    });

    if (error) {
      return unavailable(getErrorMessage(error), session);
    }
    if (!session) {
      return { status: "anonymous" };
    }
    if (!session.user?.id || !session.access_token) {
      return unavailable(
        "A sessão encontrada está incompleta. Tente validar novamente antes de entrar.",
        session,
      );
    }

    authDebug("session_verified", {
      hasSession: true,
      hasUser: true,
      hasAccessToken: true,
    });
    return { status: "authenticated", session, user: session.user };
  } catch {
    authDebug("session_check_exception", { stage: "session_check" });
    return unavailable(
      "Não foi possível consultar a sessão agora. Verifique sua conexão e tente novamente.",
    );
  }
}

function sessionUnavailableResult(
  state: AuthState,
  session: Session,
  userId: string,
): AuthActionResult {
  if (state.status === "authenticated" && state.user.id === userId) {
    return { ok: true, auth: state };
  }

  const message =
    state.status === "unavailable"
      ? state.message
      : "O Supabase aceitou a operação, mas a sessão persistida ainda não pôde ser confirmada. Tente novamente sem fechar esta página.";

  // Keep the returned session available for retry; never clear storage on a check failure.
  return {
    ok: false,
    message,
    auth: unavailable(message, session),
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  if (!supabase) return { ok: false, message: "O Supabase ainda não está configurado." };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    authDebug("sign_in_response", {
      accepted: !error,
      hasUser: Boolean(data.user?.id),
      hasSession: Boolean(data.session),
      hasAccessToken: Boolean(data.session?.access_token),
    });

    if (error) return { ok: false, message: getErrorMessage(error) };
    if (!data.user?.id || !data.session?.access_token) {
      const message =
        "O login não retornou uma sessão autenticada. Verifique a confirmação de e-mail da conta e tente novamente.";
      return {
        ok: false,
        message,
        auth: unavailable(message, data.session),
      };
    }

    const state = await checkAuth();
    authDebug("sign_in_session_check", {
      authenticated: state.status === "authenticated",
      hasUser: state.status === "authenticated",
      hasSession:
        state.status === "authenticated" ||
        (state.status === "unavailable" && Boolean(state.session)),
      hasAccessToken:
        state.status === "authenticated" ||
        (state.status === "unavailable" && Boolean(state.session?.access_token)),
    });
    return sessionUnavailableResult(state, data.session, data.user.id);
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<SignUpResult> {
  if (!supabase) return { ok: false, message: "O Supabase ainda não está configurado." };

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim() },
      },
    });

    authDebug("sign_up_response", {
      accepted: !error,
      hasUser: Boolean(data.user?.id),
      hasSession: Boolean(data.session),
      hasAccessToken: Boolean(data.session?.access_token),
    });

    if (error) return { ok: false, message: getErrorMessage(error) };
    if (!data.user?.id) {
      return {
        ok: false,
        message: "O Supabase não retornou um usuário para esta solicitação.",
      };
    }

    // With email confirmation enabled, Supabase correctly returns a user and no session.
    if (!data.session) {
      return { ok: true, kind: "confirmation_required", email: email.trim() };
    }
    if (!data.session.access_token) {
      const message = "A conta foi criada, mas a sessão ainda não pôde ser confirmada.";
      return {
        ok: false,
        message,
        auth: unavailable(message, data.session),
      };
    }

    const state = await checkAuth();
    authDebug("sign_up_session_check", {
      authenticated: state.status === "authenticated",
      hasUser: state.status === "authenticated",
      hasSession:
        state.status === "authenticated" ||
        (state.status === "unavailable" && Boolean(state.session)),
      hasAccessToken:
        state.status === "authenticated" ||
        (state.status === "unavailable" && Boolean(state.session?.access_token)),
    });

    if (state.status === "authenticated" && state.user.id === data.user.id) {
      return { ok: true, kind: "authenticated", auth: state };
    }

    const message =
      state.status === "unavailable"
        ? state.message
        : "A conta foi criada, mas a sessão persistida ainda não pôde ser confirmada. Tente entrar novamente.";
    return {
      ok: false,
      message,
      auth: unavailable(message, data.session),
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!supabase) return { ok: false, message: "O Supabase ainda não está configurado." };

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) return { ok: false, message: getErrorMessage(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function updateRecoveredPassword(
  password: string,
): Promise<PasswordUpdateResult> {
  if (!supabase) return { ok: false, message: "O Supabase ainda não está configurado." };

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: getErrorMessage(error) };
    const state = await checkAuth();
    return {
      ok: true,
      auth: state,
      message:
        state.status === "anonymous"
          ? "A senha foi atualizada. Entre com a nova senha."
          : state.status === "unavailable"
            ? "A senha foi atualizada, mas a sessão ainda não pôde ser confirmada."
            : undefined,
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function signOutExplicitly(): Promise<{ ok: boolean; message?: string }> {
  if (!supabase) return { ok: true };

  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { ok: false, message: getErrorMessage(error) };
    authDebug("explicit_sign_out", { completed: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}