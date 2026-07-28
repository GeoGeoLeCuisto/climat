#!/usr/bin/env python3
"""Serveur statique pour l'application CLIMAT.

La caméra (MediaPipe) est bloquee par les navigateurs sur file:// —
il faut donc servir la page en http://localhost.

    python serve.py            -> http://localhost:8791
    python serve.py 9000       -> http://localhost:9000
"""
import http.server
import socketserver
import sys
import os
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
RACINE = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RACINE, **kwargs)

    def end_headers(self):
        # pas de cache : on veut voir les modifications immediatement
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silence


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/"
        print(f"CLIMAT  ->  {url}")
        print("Ctrl+C pour arreter.")
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrete.")
