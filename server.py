# SaGo preview server — serves the app with no-cache headers,
# so the browser ALWAYS loads the latest version after each build step.
import http.server
import functools

import os

PORT = 8420
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *args):  # keep logs quiet
        pass

handler = functools.partial(NoCacheHandler, directory=DIR)
http.server.ThreadingHTTPServer(('0.0.0.0', PORT), handler).serve_forever()
