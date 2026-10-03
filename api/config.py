"""GET /api/config — configuração PÚBLICA para o navegador iniciar o login.

A chave "anon"/"publishable" foi feita para ser pública (o acesso aos dados é
protegido por RLS). A Service Role Key NUNCA passa por aqui.
"""
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _lib as lib  # noqa: E402


def get(_h):
    return 200, {"supabaseUrl": lib.supabase_url(), "supabaseAnonKey": lib.anon_key()}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        lib.dispatch(self, {"GET": get})

    do_OPTIONS = do_GET

    def log_message(self, *args):
        pass
