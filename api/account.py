"""POST /api/account — exclui a conta do usuário autenticado (após confirmar a senha).

Única função que usa a SUPABASE_SERVICE_ROLE_KEY, sempre no servidor.
O id excluído é o do token verificado; o navegador não escolhe quem apagar.
"""
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _lib as lib  # noqa: E402


def post(h):
    token, user = lib.authenticate(h)
    base = lib.supabase_url()
    admin = lib.admin_headers()
    anon = lib.anon_key()

    # Limite durável: 5 tentativas por conta a cada 15 minutos.
    budget = requests.post(
        f"{base}/rest/v1/rpc/ephyra_allow_delete_attempt",
        headers={**admin, "Content-Type": "application/json"},
        json={"account_id": user["id"]},
        timeout=lib.TIMEOUT,
    )
    if budget.status_code != 200:
        raise lib.ApiError(503, "service_unavailable")
    if budget.json() is not True:
        raise lib.ApiError(429, "too_many_attempts")

    body = lib.read_json(h)
    password = body.get("password")
    if not isinstance(password, str) or not 8 <= len(password) <= 256:
        raise lib.ApiError(400, "invalid_request")

    login = requests.post(
        f"{base}/auth/v1/token?grant_type=password",
        headers={"apikey": anon, "Content-Type": "application/json"},
        json={"email": user["email"], "password": password},
        timeout=lib.TIMEOUT,
    )
    if login.status_code != 200:
        raise lib.ApiError(403, "confirmation_failed")
    confirmation = login.json()
    fresh_token = confirmation.get("access_token")
    try:
        if (confirmation.get("user") or {}).get("id") != user["id"]:
            raise lib.ApiError(403, "confirmation_failed")
        revoked = requests.post(
            f"{base}/auth/v1/logout?scope=global",
            headers={"apikey": anon, "Authorization": f"Bearer {fresh_token}"},
            timeout=lib.TIMEOUT,
        )
        if revoked.status_code >= 300:
            raise lib.ApiError(502, "could_not_revoke_sessions")
        deleted = requests.delete(
            f"{base}/auth/v1/admin/users/{quote(user['id'], safe='')}",
            headers=admin,
            timeout=lib.TIMEOUT,
        )
        if deleted.status_code >= 300:
            raise lib.ApiError(502, "deletion_failed")
    finally:
        if fresh_token:                               # não deixa sessão extra se algo falhar
            try:
                requests.post(
                    f"{base}/auth/v1/logout?scope=local",
                    headers={"apikey": anon, "Authorization": f"Bearer {fresh_token}"},
                    timeout=lib.TIMEOUT,
                )
            except requests.RequestException:
                pass
    # As linhas em public.* são removidas por "on delete cascade".
    return 200, {"deleted": True}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        lib.dispatch(self, {"POST": post})

    do_OPTIONS = do_POST

    def log_message(self, *args):
        pass
