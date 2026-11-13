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

            def val(res):
                # result is {"result": {"type": "...", "value": ...}}
                if "result" in res and isinstance(res["result"], dict):
                    return res["result"].get("value")
                return res.get("value")

            await call("Runtime.enable")
            await call("Page.enable")

            # Wait for window.canevyn to be ready
            for _ in range(20):
                r = await call("Runtime.evaluate", {
                    "expression": "typeof window.canevyn",
                    "returnByValue": True
                })
                if val(r) == "object":
                    break
                await asyncio.sleep(0.2)

            # 1. Check initial screen is Welcome / Role Selection
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 1] Current Screen: {screen} (Expected: welcome_role)")
            assert screen == "welcome_role", f"Expected welcome_role, got {screen}"

            # 2. Check Logo exists
            res = await call("Runtime.evaluate", {
                "expression": "Boolean(document.querySelector('img[src*=\"canevyn-logo.png\"]'))",
                "returnByValue": True
            })
            has_logo = val(res)
            print(f"[TEST 2] Official Canevyn logo present: {has_logo}")
            assert has_logo, "Official Canevyn logo not found in DOM"

            # 3. Test Role Selection: Select Authorized Member
            await call("Runtime.evaluate", {
                "expression": "document.getElementById('roleGuardianCard').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.role",
                "returnByValue": True
            })
            role = val(res)
            print(f"[TEST 3A] Switched to Authorized Member: role = {role}")
            assert role == "authorized_member"

            # Test Role Selection: Select Canevyn User
            await call("Runtime.evaluate", {
                "expression": "document.getElementById('roleUserCard').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.role",
                "returnByValue": True
            })
            role = val(res)
            print(f"[TEST 3B] Switched to Canevyn User: role = {role}")
            assert role == "canevyn_user"

            # 4. Click Continue -> Proceed to authentication
            await call("Runtime.evaluate", {
                "expression": "document.getElementById('welcomeContinueBtn').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 4] Clicked Continue: Current Screen = {screen} (Expected: auth_options)")
            assert screen == "auth_options"

            # 5. Click Sign In -> auth_signin
            await call("Runtime.evaluate", {
                "expression": "document.getElementById('btn-action-signin').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 5] Clicked Sign In: Current Screen = {screen} (Expected: auth_signin)")
            assert screen == "auth_signin"

            # 6. Quick fill demo user Arthur and submit form
            await call("Runtime.evaluate", {
                "expression": "document.getElementById('quickFillArthurBtn').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.2)
            await call("Runtime.evaluate", {
                "expression": "document.getElementById('authSubmitBtn').click()",
                "returnByValue": True
            })
            await asyncio.sleep(1.0)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 6] Logged in: Current Screen = {screen} (Expected: user_home)")
            assert screen == "user_home"

            # 7. Check 5-tab navigation on user_home
            res_tabs = await call("Runtime.evaluate", {
                "expression": "Array.from(document.querySelectorAll('.nav-tab-btn')).map(el => el.dataset.tab)",
                "returnByValue": True
            })
            tabs = val(res_tabs)
            print(f"[TEST 7] 5 Exact Bottom Tabs: {tabs}")
            assert tabs == ['home', 'location', 'voice', 'guardian', 'settings'], f"Unexpected tabs: {tabs}"
            assert 'device' not in tabs, "Device must NOT be a bottom nav tab!"

            # 8. Check Development Hardware Simulator Bar
            res = await call("Runtime.evaluate", {
                "expression": "Boolean(document.getElementById('devHardwareSimDrawer'))",
                "returnByValue": True
            })
            has_sim = val(res)
            print(f"[TEST 8] Dev Hardware Simulator present: {has_sim}")
            assert has_sim, "Developer hardware simulator bar should be present in development"

            # 9. Test navigating to Location tab
            await call("Runtime.evaluate", {
                "expression": "document.querySelector('.nav-tab-btn[data-tab=\"location\"]').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 9] Navigated to Location: {screen}")
            assert screen == "user_location"

            # 10. Test navigating to Voice tab
            await call("Runtime.evaluate", {
                "expression": "document.querySelector('.nav-tab-btn[data-tab=\"voice\"]').click()",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 10] Navigated to Voice: {screen}")
            assert screen == "user_voice"

            # 11. Test navigating to Device Status via Home
            await call("Runtime.evaluate", {
                "expression": "window.canevyn.navigateTo('user_device')",
                "returnByValue": True
            })
            await asyncio.sleep(0.3)
            res = await call("Runtime.evaluate", {
                "expression": "window.canevyn.state.currentScreen",
                "returnByValue": True
            })
            screen = val(res)
            print(f"[TEST 11] Navigated to Device Status: {screen}")
            assert screen == "user_device"

            print("\n>>> ALL ACCEPTANCE VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
