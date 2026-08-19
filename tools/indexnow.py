# -*- coding: utf-8 -*-
"""Avisa a Bing/Yandex (protocolo IndexNow) que las URLs del sitio cambiaron.

Uso, despues de cada deploy:
    python tools/indexnow.py            # envia todas las URLs del sitemap.xml
    python tools/indexnow.py es/blog/   # envia solo las que contengan ese texto

Google NO soporta IndexNow: para Google se usa Search Console (Inspeccionar URL
-> Solicitar indexacion), que es manual. Esto cubre Bing, Yandex, DuckDuckGo,
Ecosia y Copilot, que juntos no son triviales para trafico internacional.

La clave vive en KEY_FILE, en la raiz del repo, y tiene que estar publicada en
https://www.southnomadscampers.com/<clave>.txt para que IndexNow la valide.
"""
import io
import json
import re
import sys
import urllib.request

HOST = "www.southnomadscampers.com"
KEY = "8f676cf7cb7a41cb971ee934828fd162ca7b3d67"
KEY_LOCATION = "https://%s/%s.txt" % (HOST, KEY)
ENDPOINT = "https://api.indexnow.org/indexnow"


def sitemap_urls(filter_text=None):
    xml = io.open("sitemap.xml", encoding="utf-8").read()
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    # el sitemap usa el dominio sin www; IndexNow exige que coincida con el host
    urls = [u.replace("https://southnomadscampers.com", "https://" + HOST) for u in urls]
    if filter_text:
        urls = [u for u in urls if filter_text in u]
    return urls


def main():
    filter_text = sys.argv[1] if len(sys.argv) > 1 else None
    urls = sitemap_urls(filter_text)
    if not urls:
        print("No hay URLs que coincidan.")
        return
    payload = {"host": HOST, "key": KEY, "keyLocation": KEY_LOCATION, "urlList": urls}
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        print("HTTP %s - %d URLs enviadas" % (res.status, len(urls)))
        for u in urls:
            print("   ", u)


if __name__ == "__main__":
    main()
