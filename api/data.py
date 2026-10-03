"""GET/PUT /api/data — dados financeiros do usuário autenticado.

Fluxo: navegador -> esta função -> Supabase (PostgREST + RLS).
A função chama o banco COM o token do usuário; por isso o RLS do Postgres
é a última barreira, mesmo que este código tivesse um erro.
"""
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _lib as lib  # noqa: E402

LIST_KEYS = ("receitas", "despesas", "historico", "metas", "conquistas", "categorias", "monthlySummaries")
SECRET_KEYS = ("senha", "senhaHash", "password", "access_token", "refresh_token")


def _rest(token, path, **kwargs):
    response = requests.request(
        kwargs.pop("method", "GET"),
        f"{lib.supabase_url()}/rest/v1/{path}",
        headers=lib.user_headers(token),
        timeout=lib.TIMEOUT,
        **kwargs,
    )
    if response.status_code in (401, 403) and "JWT" in response.text:
        raise lib.ApiError(401, "unauthorized")
    return response


def get(h):
    token, user = lib.authenticate(h)
    uid = user["id"]
    query = parse_qs(urlparse(h.path).query)
    only_meta = query.get("meta", ["0"])[0] == "1"

    columns = "revision" if only_meta else "data,revision"
    row = _rest(token, f"user_data?select={columns}&user_id=eq.{uid}&limit=1")
    if row.status_code != 200:
        lib.log(f"user_data HTTP {row.status_code}")
        raise lib.ApiError(502, "database_error")
    rows = row.json()
    if not rows:
        return 200, {"exists": False, "revision": 0, "data": None, "profile": None}
    if only_meta:
        return 200, {"exists": True, "revision": rows[0]["revision"]}

    profile_response = _rest(token, f"profiles?select=nome,foto,salario&id=eq.{uid}&limit=1")
    profile = None
    if profile_response.status_code == 200 and profile_response.json():
        profile = profile_response.json()[0]
        profile["salario"] = float(profile.get("salario") or 0)
    data = rows[0]["data"] if isinstance(rows[0].get("data"), dict) else {}
    if profile:                                       # a foto mora em "profiles"
        data.setdefault("user", {})
        if isinstance(data["user"], dict):
            data["user"]["foto"] = profile.get("foto") or ""
    return 200, {"exists": True, "revision": rows[0]["revision"], "data": data, "profile": profile}


def put(h):
    token, _user = lib.authenticate(h)
    body = lib.read_json(h)
    data = body.get("data")
    base = body.get("baseRevision")
    if not isinstance(data, dict):
        raise lib.ApiError(400, "invalid_request")
    if base is not None and (not isinstance(base, int) or isinstance(base, bool) or base < 0):
        raise lib.ApiError(400, "invalid_request")
    for key in LIST_KEYS:
        value = data.get(key)
        if value is not None and (not isinstance(value, list) or len(value) > lib.MAX_ITEMS_PER_LIST):
            raise lib.ApiError(400, "invalid_request")
    if isinstance(data.get("user"), dict):
        for key in SECRET_KEYS:                       # defesa em profundidade
            data["user"].pop(key, None)

    response = _rest(
        token,
        "rpc/ephyra_save_snapshot",
        method="POST",
        json={"p_data": data, "p_base_revision": base},
    )
    if response.status_code != 200:
        lib.log(f"ephyra_save_snapshot HTTP {response.status_code}")
        if response.status_code in (401, 403):
            raise lib.ApiError(401, "unauthorized")
        if response.status_code == 404:
            raise lib.ApiError(503, "database_not_ready")   # SQL ainda não foi executado
        raise lib.ApiError(502, "database_error")
    result = response.json()
    if result.get("conflict"):
        return 409, {"error": "conflict", "revision": result.get("revision")}
    return 200, {"ok": True, "revision": result.get("revision")}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        lib.dispatch(self, {"GET": get, "PUT": put})

    do_PUT = do_GET
    do_OPTIONS = do_GET

    def log_message(self, *args):
        pass
