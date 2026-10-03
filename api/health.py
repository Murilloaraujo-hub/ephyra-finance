"""GET /api/health — diz se as variáveis de ambiente existem (sem revelar valores)."""
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _lib as lib  # noqa: E402


def get(_h):
    configured = {}
    for name in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        configured[name] = bool((os.environ.get(name) or "").strip())
    return 200, {"ok": all(configured.values()), "configured": configured}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        lib.dispatch(self, {"GET": get})

    do_OPTIONS = do_GET

    def log_message(self, *args):
        pass
