#!/usr/bin/env python3
"""Add/refresh the Whizz Desk chat widget on every HTML page in site/ (safe to re-run).
English pages get data-locale="en", Arabic pages (site/ar/) get data-locale="ar"."""
import glob, os, re
SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "site"))
KEY = "wd_pub_XCpzfT0dLJd6tcq7i_dRJjpA"
COLOR = "#32BEA6"  # site teal (--teal in assets/css/style.css)
OLD = re.compile(r'<script src="https://desk\.whizztech\.ai/embed\.js"[^>]*></script>\n?')


def snippet(locale):
    return ('<script src="https://desk.whizztech.ai/embed.js" data-widget="%s" data-color="%s" '
            'data-locale="%s" data-theme="light" defer></script>\n' % (KEY, COLOR, locale))


changed = []
for p in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
    t = open(p, encoding="utf-8").read()
    if "</body>" not in t:
        continue
    rel = os.path.relpath(p, SITE)
    new = OLD.sub("", t).replace("</body>", snippet("ar" if rel.startswith("ar" + os.sep) else "en") + "</body>", 1)
    if new != t:
        open(p, "w", encoding="utf-8").write(new)
        changed.append(rel)
print("widget updated on %d page(s)" % len(changed))
