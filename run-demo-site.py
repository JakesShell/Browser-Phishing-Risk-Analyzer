from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

os.chdir(Path(__file__).parent / "demo-site")

class DemoHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.path = "/index.html"
        return super().do_GET()

HTTPServer(("127.0.0.1", 9090), DemoHandler).serve_forever()
