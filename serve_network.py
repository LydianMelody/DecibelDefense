#!/usr/bin/env python3
"""
Simple HTTP server to host Decibel Defense on your local network
Run this script from the command line to start the server:
    python3 serve_network.py

Then access the game from other devices on your network by going to:
    http://YOUR_IP_ADDRESS:8080
"""

import http.server
import socketserver
import socket
import webbrowser
import os
import sys

PORT = 8080

# Get local IP address
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow access from other devices
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

Handler = MyHttpRequestHandler

IP = get_ip()
url = f"http://{IP}:{PORT}"

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("\n" + "="*50)
        print(f"Serving Decibel Defense at {url}")
        print("="*50)
        print(f"\nAccess from other devices using: {url}")
        print(f"Access locally using: http://localhost:{PORT}")
        print("\nPress CTRL+C to stop the server")
        print("="*50 + "\n")
        
        # Open browser automatically
        try:
            webbrowser.open(url)
        except:
            pass
            
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.server_close()
            sys.exit(0)