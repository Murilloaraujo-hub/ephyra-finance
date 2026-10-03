"""Funções compartilhadas pelas Serverless Functions do Ephyra Finance.

O arquivo começa com "_" para que o Vercel NÃO o publique como endpoint.
Nenhum segredo é registrado em log: apenas códigos de status.
"""
import base64
import json
import os
import re
import sys

import requests

MAX_BODY_BYTES = 4_000_000          # o Vercel aceita no máximo ~4,5 MB por requisição
MAX_ITEMS_PER_LIST = 50_000
TIMEOUT = 10                        # segundos por chamada ao Supabase


class ApiError(Exception):
    def __init__(self, status, code, extra=None):
        super().__init__(code)
        self.status = status
        self.code = code
        self.extra = extra or {}


# ----------------------------------------------------------------- ambiente
def _env(name):
    value = (os.environ.get(name) or "").strip()
    return value or None


def supabase_url():
    url = (_env("SUPABASE_URL") or "").rstrip("/")
    if not re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", url):
        raise ApiError(503, "server_not_configured")
    return url


def _jwt_role(key):
    try:
        payload = key.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload)).get("role")
    except Exception:
        return None


def anon_key():
    key = _env("SUPABASE_ANON_KEY")
    if not key:
        raise ApiError(503, "server_not_configured")
    # Nunca devolva ao navegador uma chave administrativa por engano.
    if key.startswith("sb_secret_") or _jwt_role(key) == "service_role":
        raise ApiError(503, "server_misconfigured")
    return key


def admin_headers():
    key = _env("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        raise ApiError(503, "server_not_configured")
    headers = {"apikey": key}
    if not key.startswith("sb_secret_"):          # chave legada (JWT) exige Authorization
        headers["Authorization"] = f"Bearer {key}"
    return headers


# --------------------------------------------------------------------- HTTP
def log(message):
    print(f"[ephyra-api] {message}", file=sys.stderr)


def send_json(h, status, body, headers=None):
    payload = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    h.send_response(status)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    h.send_header("Content-Length", str(len(payload)))
    h.send_header("Cache-Control", "no-store")
    h.send_header("X-Content-Type-Options", "nosniff")
    for key, value in (headers or {}).items():
        h.send_header(key, value)
    h.end_headers()
    if h.command != "HEAD":
        h.wfile.write(payload)


def same_origin_or_raise(h):
    """Bloqueia chamadas de outro site (a API só serve o próprio front-end)."""
    origin = h.headers.get("Origin")
    if not origin:
        return
    host = (h.headers.get("X-Forwarded-Host") or h.headers.get("Host") or "").split(",")[0].strip().lower()
    origin_host = re.sub(r"^https?://", "", origin).strip("/").lower()
    if not host or origin_host != host:
        raise ApiError(403, "forbidden_origin")


def read_json(h):
    try:
        length = int(h.headers.get("Content-Length") or 0)
    except ValueError:
        raise ApiError(400, "invalid_request")
    if length <= 0 or length > MAX_BODY_BYTES:
        raise ApiError(413 if length > MAX_BODY_BYTES else 400, "invalid_request")
    try:
        body = json.loads(h.rfile.read(length).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        raise ApiError(400, "invalid_request")
    if not isinstance(body, dict):
        raise ApiError(400, "invalid_request")
    return body


def bearer_token(h):
    match = re.fullmatch(r"Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})", h.headers.get("Authorization") or "")
    if not match:
        raise ApiError(401, "unauthorized")
    return match.group(1)


def dispatch(h, methods):
    """Executa o método HTTP pedido, convertendo erros em respostas JSON seguras."""
    try:
        if h.command == "OPTIONS":
            return send_json(h, 204, {}, {"Allow": ", ".join(sorted(methods) + ["OPTIONS"])})
        fn = methods.get(h.command)
        if not fn:
            raise ApiError(405, "method_not_allowed")
        if h.command not in ("GET", "HEAD"):
            same_origin_or_raise(h)
        status, body = fn(h)
        send_json(h, status, body)
    except ApiError as err:
        send_json(h, err.status, {"error": err.code, **err.extra})
    except requests.RequestException:
        send_json(h, 503, {"error": "upstream_unavailable"})
    except Exception as err:                          # nunca vaze detalhes internos
        log(f"erro inesperado: {type(err).__name__}")
        send_json(h, 500, {"error": "internal_error"})


# ----------------------------------------------------------------- Supabase
def authenticate(h):
    """Valida o token no Supabase Auth e devolve (token, usuário).

    A identidade vem SEMPRE do token verificado — nunca de um id enviado
    pelo navegador.
    """
    token = bearer_token(h)
    response = requests.get(
        f"{supabase_url()}/auth/v1/user",
        headers={"apikey": anon_key(), "Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    if response.status_code in (401, 403):
        raise ApiError(401, "unauthorized")
    if response.status_code != 200:
        raise ApiError(503, "upstream_unavailable")
    user = response.json()
    if not user.get("id") or not user.get("email"):
        raise ApiError(401, "unauthorized")
    return token, user


def user_headers(token):
    """Chamadas ao PostgREST feitas COM o token do usuário: o RLS vale."""
    return {"apikey": anon_key(), "Authorization": f"Bearer {token}", "Content-Type": "application/json"}
