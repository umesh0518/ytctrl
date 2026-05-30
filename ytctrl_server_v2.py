#!/usr/bin/env python3
"""
YTctrl local test server
Run:  python3 ytctrl_server_v2.py
Open: http://localhost:8080
"""
import http.server, webbrowser, time, os, sys

# Read the HTML from the same directory as this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH  = os.path.join(SCRIPT_DIR, 'index.html')

PORT = 8080

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Serve index.html for all GET requests (single-page app)
        try:
            with open(HTML_PATH, 'rb') as f:
                body = f.read()
        except FileNotFoundError:
            self.send_error(404, 'index.html not found next to this script')
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        # Allow YouTube IFrame API to work
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass  # silent

def main():
    # Check index.html exists
    if not os.path.exists(HTML_PATH):
        print(f"\n  ✗  index.html not found at: {HTML_PATH}")
        print(f"  →  Put index.html in the same folder as this script.\n")
        sys.exit(1)

    try:
        srv = http.server.HTTPServer(('', PORT), Handler)
    except OSError:
        print(f"\n  ✗  Port {PORT} is busy. Free it with:")
        print(f"     lsof -ti:{PORT} | xargs kill\n")
        sys.exit(1)

    print(f"\n  ✓  YTctrl running at  http://localhost:{PORT}")
    print(f"  ✓  Serving: {HTML_PATH}")
    print(f"  →  Open http://localhost:{PORT} in Brave")
    print(f"  →  Press Ctrl+C to stop\n")

    # Auto-open in default browser after short delay
    def _open():
        time.sleep(0.5)
        webbrowser.open(f'http://localhost:{PORT}')
    import threading
    threading.Thread(target=_open, daemon=True).start()

    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.\n")

if __name__ == '__main__':
    main()
