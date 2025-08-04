import httpx
from pathlib import Path

GIF_URL = "https://www-sk.icrr.u-tokyo.ac.jp/realtimemonitor/skev.gif"
LOCAL_PATH = Path("static/latest_event.gif")

def fetch_latest_gif():
    response = httpx.get(GIF_URL)
    LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOCAL_PATH, "wb") as f:
        f.write(response.content)
    print("✅ Downloaded latest Super-K GIF.")
    return LOCAL_PATH
