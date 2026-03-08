import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "http://localhost:4173/"
try:
    print(f"Testing {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req, context=ctx)
    html = response.read().decode('utf-8')
    print("Contains 'Lottieny' title:", "<title>Lottieny</title>" in html)
    print("Contains js output:", "assets/index" in html)
    print("First 200 chars:")
    print(html[:200])
except Exception as e:
    print(f"Error: {e}")
