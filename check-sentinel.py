#!/usr/bin/env python3
import os, urllib.request, ssl
from pathlib import Path

# Load .env.local
env = {}
for line in Path.home().joinpath("projects/sigapapp/.env.local").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

url = env["NEXT_PUBLIC_SUPABASE_URL"].replace("/rest/v1/", "")
service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

ctx = ssl.create_default_context()

# Check for exact -999 values
print("=== Checking for value = -999 ===")
api_url = f"{url}/rest/v1/kualitas_udara?select=location_name,parameter,value,unit,waktu&value=eq.-999"
req = urllib.request.Request(api_url)
req.add_header("apikey", service_key)
req.add_header("Authorization", f"Bearer {service_key}")
req.add_header("Prefer", "count=exact")
try:
    resp = urllib.request.urlopen(req, context=ctx, timeout=15)
    body = resp.read().decode()
    total = resp.headers.get("content-range", "?")
    print(f"Count: {total}")
    print(f"Data: {body[:2000]}")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}: {e.read().decode()[:500]}")

# Check for any negative values
print("\n=== Checking for any negative values ===")
api_url2 = f"{url}/rest/v1/kualitas_udara?select=location_name,parameter,value,unit,waktu&value=lt.0&order=value.asc"
req2 = urllib.request.Request(api_url2)
req2.add_header("apikey", service_key)
req2.add_header("Authorization", f"Bearer {service_key}")
req2.add_header("Prefer", "count=exact")
try:
    resp2 = urllib.request.urlopen(req2, context=ctx, timeout=15)
    body2 = resp2.read().decode()
    total2 = resp2.headers.get("content-range", "?")
    print(f"Count: {total2}")
    print(f"Data: {body2[:2000]}")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}: {e.read().decode()[:500]}")

# Show all data summary
print("\n=== All data summary (last 15) ===")
api_url3 = f"{url}/rest/v1/kualitas_udara?select=location_name,parameter,value,unit&order=id.desc&limit=15"
req3 = urllib.request.Request(api_url3)
req3.add_header("apikey", service_key)
req3.add_header("Authorization", f"Bearer {service_key}")
try:
    resp3 = urllib.request.urlopen(req3, context=ctx, timeout=15)
    print(resp3.read().decode()[:3000])
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}")
