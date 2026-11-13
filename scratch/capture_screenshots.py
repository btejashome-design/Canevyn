import asyncio
import subprocess
import time
import json
import base64
import urllib.request
import websockets

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

async def main():
    cmd = [
        edge_path,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--window-size=430,932",  # iPhone 14 Pro Max viewport
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

        async with websockets.connect(ws_url) as ws:
            msg_id = 1
            async def call(method, params=None):
                nonlocal msg_id
                mid = msg_id
                msg_id += 1
                payload = {"id": mid, "method": method}
                if params:
                    payload["params"] = params
                await ws.send(json.dumps(payload))
                while True:
                    msg = await ws.recv()
                    res = json.loads(msg)
                    if res.get("id") == mid:
                        return res.get("result", {})

            await call("Page.enable")
            await call("Runtime.enable")

            # Wait for app ready
            await asyncio.sleep(1.5)

            # 1. Capture Welcome / Role Selection screen
            shot1 = await call("Page.captureScreenshot", {"format": "png"})
            with open("scratch/welcome_screen.png", "wb") as f:
                f.write(base64.b64decode(shot1["data"]))
            print("Captured scratch/welcome_screen.png (Welcome / Role Selection)")

            # 2. Click Continue -> Sign In -> Quick login Arthur
            await call("Runtime.evaluate", {"expression": "document.getElementById('welcomeContinueBtn').click()"})
            await asyncio.sleep(0.3)
            await call("Runtime.evaluate", {"expression": "document.getElementById('btn-action-signin').click()"})
            await asyncio.sleep(0.3)
            await call("Runtime.evaluate", {"expression": "document.getElementById('quickFillArthurBtn').click()"})
            await asyncio.sleep(0.2)
            await call("Runtime.evaluate", {"expression": "document.getElementById('authSubmitBtn').click()"})
            await asyncio.sleep(1.0)

            # Capture User Home screen
            shot2 = await call("Page.captureScreenshot", {"format": "png"})
            with open("scratch/user_home_screen.png", "wb") as f:
                f.write(base64.b64decode(shot2["data"]))
            print("Captured scratch/user_home_screen.png (User Home Dashboard)")

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
