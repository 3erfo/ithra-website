#!/usr/bin/env python3
"""Add the Whizz Desk chat widget to every HTML page in site/ (safe to re-run)."""
import glob, os
SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "site"))
SNIPPET = '<script src="https://desk.whizztech.ai/embed.js" data-widget="wd_pub_XCpzfT0dLJd6tcq7i_dRJjpA" defer></script>'
changed = []
for p in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
    t = open(p, encoding="utf-8").read()
    if "desk.whizztech.ai/embed.js" in t or "</body>" not in t:
        continue
    t = t.replace("</body>", SNIPPET + "\n</body>", 1)
    open(p, "w", encoding="utf-8").write(t)
    changed.append(os.path.relpath(p, SITE))
print("widget added to %d page(s)" % len(changed))
for c in changed:
    print("  ", c)
