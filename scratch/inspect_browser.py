import asyncio
import subprocess
import time
import json
import urllib.request
import websockets

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

async def main():
    cmd = [
        edge_path,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "http://localhost:8000/"
    ]
    proc = subprocess.Popen(cmd)
    await asyncio.sleep(2)

    try:
        targets_url = "http://127.0.0.1:9222/json"
        req = urllib.request.urlopen(targets_url)
        targets = json.loads(req.read().decode('utf-8'))
        page_target = next(t for t in targets if t.get('type') == 'page')
        ws_url = page_target['webSocketDebuggerUrl']
        print(f"Connecting to CDP WebSocket: {ws_url}")

        async with websockets.connect(ws_url) as ws:
            # Enable Runtime and Log and Console
            await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "Log.enable"}))
            await ws.send(json.dumps({"id": 3, "method": "Console.enable"}))
            await ws.send(json.dumps({"id": 4, "method": "Page.enable"}))
            
            # Reload page to capture fresh startup console logs
            await ws.send(json.dumps({"id": 5, "method": "Page.reload"}))

            # Listen for 5 seconds
            start_time = time.time()
            while time.time() - start_time < 5:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    data = json.loads(msg)
                    method = data.get('method', '')
                    if 'Console' in method or 'Runtime' in method or 'Log' in method:
                        print("CDP EVENT:", json.dumps(data, indent=2))
                except asyncio.TimeoutError:
                    pass

            # Now evaluate document.readyState, window.canevyn, and document.getElementById('app').innerHTML
            eval_queries = [
                "document.readyState",
                "typeof window.canevyn",
                "window.canevyn ? window.canevyn.state : 'undefined'",
                "document.getElementById('app') ? document.getElementById('app').innerHTML.length : 'no-app'",
                "document.getElementById('app') ? document.getElementById('app').innerHTML.slice(0, 300) : 'none'"
            ]
            for i, q in enumerate(eval_queries, start=10):
                await ws.send(json.dumps({
                    "id": i,
                    "method": "Runtime.evaluate",
                    "params": {"expression": q, "returnByValue": True}
                }))
                res = await ws.recv()
                print(f"\nEVAL: {q} =>\n{json.dumps(json.loads(res), indent=2)}")

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
