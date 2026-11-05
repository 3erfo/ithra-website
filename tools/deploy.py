#!/usr/bin/env python3
"""
Upload site files to uniithra.com.sa over FTPS.

  python3 tools/deploy.py site/index.html site/ar/index.html   # specific files
  python3 tools/deploy.py --changed                            # files changed in the last commit
  python3 tools/deploy.py --since <commit>                     # files changed since a commit
  add --dry-run to only list them

Credentials: FTP_USER / FTP_PASSWORD env vars, or your ~/.netrc entry.
Only uploads; never deletes anything on the server.
"""
import argparse, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scribe_sync import ftp_upload, SITE

ROOT = os.path.dirname(SITE)
SKIP = (".vscode/", "README-SETUP.md", ".gitignore")


def changed(since):
    out = subprocess.run(["git", "-C", ROOT, "diff", "--name-only", "--diff-filter=ACMR", since, "HEAD", "--", "site"],
                         capture_output=True, text=True, check=True).stdout.split()
    return out


p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("files", nargs="*")
p.add_argument("--changed", action="store_true")
p.add_argument("--since")
p.add_argument("--dry-run", action="store_true")
o = p.parse_args()

paths = o.files or (changed("HEAD~1") if o.changed else changed(o.since) if o.since else [])
if not paths:
    p.error("give files, --changed or --since <commit>")
rels = []
for f in paths:
    rel = os.path.relpath(os.path.abspath(os.path.join(ROOT, f) if not os.path.isabs(f) and not os.path.exists(f) else f), SITE)
    if rel.startswith("..") or any(rel.startswith(s) or rel.endswith(s) for s in SKIP):
        continue
    if os.path.isfile(os.path.join(SITE, rel)):
        rels.append(rel)
print("%d file(s) to upload" % len(rels))
if o.dry_run:
    print("\n".join("  " + r for r in rels))
else:
    ftp_upload(rels)
    print("done")
