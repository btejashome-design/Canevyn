import subprocess
import time
import json
import urllib.request

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# Start Edge with remote debugging port
cmd = [
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "http://localhost:8000/"
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    # Query DevTools targets
    targets_url = "http://127.0.0.1:9222/json"
    req = urllib.request.urlopen(targets_url)
    targets = json.loads(req.read().decode('utf-8'))
    print("Edge targets:", json.dumps(targets, indent=2))
except Exception as e:
    print("Error querying targets:", e)
finally:
    proc.terminate()
