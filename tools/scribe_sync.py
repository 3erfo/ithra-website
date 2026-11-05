#!/usr/bin/env python3
"""
Whizz Scribe -> Ithra United static site.

Pulls an article from the Whizz Scribe API and turns it into a news page that
matches the existing site design, then adds it to the news listing and sitemap.

Usage:
  export WHIZZ_SCRIBE_KEY="wz_live_..."        # once, in ~/.zshrc
  python3 tools/scribe_sync.py --list            # show your articles
  python3 tools/scribe_sync.py <article_id>      # build the page
  python3 tools/scribe_sync.py <article_id> --tag Insights --image media/images/cx.jpg

Options:
  --tag TEXT      Category label on the page and card (default: Insights)
  --date TEXT     Date label, e.g. "November 2026" (default: current month)
  --image PATH    Site-relative image if Scribe has no hero image (default: media/images/cx.jpg)
  --json FILE     Use a saved article JSON instead of calling the API (testing)
  --force         Overwrite the page if it already exists
Automatic mode (used by the weekly GitHub Action):
  python3 tools/scribe_sync.py --auto            # publish every APPROVED article, upload, mark published
  python3 tools/scribe_sync.py --auto --dry-run  # show what would happen, change nothing
  Needs env: WHIZZ_SCRIBE_KEY, FTP_USER, FTP_PASSWORD (optional FTP_HOST, FTP_ROOT)

Safety: the Scribe API can't filter by brand, so --auto only publishes articles whose
topic/title passes the rules in tools/publish-config.json (see that file).
Without --auto nothing is uploaded: review the files, then upload with VS Code SFTP.
"""
import argparse, datetime, html, json, os, re, subprocess, sys, tempfile, urllib.request

API = "https://scribe.whizztech.ai/v1"
SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "site"))
DOMAIN = "https://www.uniithra.com.sa"
TEMPLATE_SLUG = "supporting-the-future-of-customer-experience-in-saudi-arabia"
TEMPLATE_IMG = "media/images/1746436294365.jpg"
LISTING = "News-and-Acheivements.html"
TOOLS = os.path.dirname(os.path.abspath(__file__))
LEDGER = os.path.join(TOOLS, "published.json")
CONFIG = os.path.join(TOOLS, "publish-config.json")


def api(path, method="GET", body=None):
    key = os.environ.get("WHIZZ_SCRIBE_KEY")
    if not key:
        sys.exit("WHIZZ_SCRIBE_KEY is not set. Run: export WHIZZ_SCRIBE_KEY=\"wz_live_...\"")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={"Authorization": "Bearer " + key, "Accept": "application/json",
                                          "Content-Type": "application/json", "User-Agent": "ithra-scribe-sync/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def api_get(path):
    return api(path)


def esc(s):
    return html.escape(s or "", quote=True)


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s[:90].rstrip("-") or "article"


def clean_body(h):
    h = re.sub(r"<script\b.*?</script>", "", h or "", flags=re.S | re.I)
    h = re.sub(r"\son\w+=\"[^\"]*\"", "", h)
    h = re.sub(r"^\s*<h1\b.*?</h1>", "", h, count=1, flags=re.S | re.I)  # title is already in the hero
    h = re.sub(r"<a\s+(?![^>]*target=)([^>]*href=\"https?://)", r'<a target="_blank" rel="noopener" \1', h)
    return h.strip()


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def download_image(url, slug):
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    rel = "media/images/news/%s%s" % (slug, ext)
    os.makedirs(os.path.join(SITE, "media/images/news"), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "ithra-scribe-sync/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(os.path.join(SITE, rel), "wb") as f:
        f.write(r.read())
    return rel


def build(a, tag, date_label, image, force, slug=None, quiet=False):
    title = a.get("title") or a["topic"]
    slug = slug or slugify(a.get("slug") or title)
    page_rel = "news/%s.html" % slug
    page_path = os.path.join(SITE, page_rel)
    if os.path.exists(page_path) and not force:
        sys.exit("%s already exists (use --force to overwrite)" % page_rel)

    meta_title = a.get("meta_title") or title
    desc = a.get("meta_description") or strip_tags((a.get("content_html") or "")[:400])[:160]
    body = clean_body(a.get("content_html") or "")
    if not body:
        sys.exit("Article has no content_html")

    if a.get("hero_image_url"):
        try:
            image = download_image(a["hero_image_url"], slug)
            print("hero image saved:", image)
        except Exception as e:
            print("could not download hero image (%s); using %s" % (e, image))

    heads = [strip_tags(x) for x in re.findall(r"<h2\b[^>]*>(.*?)</h2>", body, flags=re.S | re.I)]
    highlights = [h for h in heads if h and "faq" not in h.lower()][:3] or \
                 [f["q"] for f in (a.get("faq") or [])][:3]

    faq_html = ""
    if a.get("faq"):
        items = "".join('<details class="faq-item"><summary>%s</summary><p>%s</p></details>'
                        % (esc(f["q"]), esc(f["a"])) for f in a["faq"])
        faq_html = '<h2>Frequently asked questions</h2>' + items

    sources_html = ""
    cites = [c for c in (a.get("citations") or []) if c.get("url")]
    if cites:
        seen, lis = set(), []
        for c in cites:
            if c["url"] in seen:
                continue
            seen.add(c["url"])
            lis.append('<li><a href="%s" target="_blank" rel="noopener nofollow">%s</a></li>'
                       % (esc(c["url"]), esc(c.get("title") or c["url"])))
        sources_html = '<h2>Sources</h2><ol class="art-sources">%s</ol>' % "".join(lis)

    tpl = open(os.path.join(SITE, "news", TEMPLATE_SLUG + ".html"), encoding="utf-8").read()
    t = tpl

    # Head
    t = re.sub(r"<title>.*?</title>", "<title>%s | Ithra United</title>" % esc(meta_title), t, flags=re.S)
    t = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + esc(desc), t)
    t = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + esc(meta_title) + " | Ithra United", t)
    t = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m.group(1) + esc(desc), t)
    # No Arabic version yet: drop the ar hreflang and send the language switch to the Arabic news list
    t = re.sub(r'<link rel="alternate" hreflang="ar"[^>]*>', "", t)
    t = t.replace("ar/news/%s.html" % TEMPLATE_SLUG, "ar/%s" % LISTING)
    t = t.replace("news/%s.html" % TEMPLATE_SLUG, page_rel)
    og_img = "%s/%s" % (DOMAIN, image)
    t = t.replace("%s/media/images/web/og-image.jpg" % DOMAIN, og_img)
    extra_head = """<style>
.art-body h2{font-size:clamp(1.35rem,2.2vw,1.75rem);color:#fff;line-height:1.35;margin-top:14px}
.art-body h3{font-size:1.2rem;color:#fff;margin-top:6px}
.art-body ul,.art-body ol{padding-inline-start:1.3em;display:grid;gap:8px}
.art-body ul{list-style:disc}.art-body ol{list-style:decimal}
.art-body a{color:var(--teal);text-decoration:underline;text-underline-offset:3px}
.art-body table{width:100%%;border-collapse:collapse;font-size:.95rem}
.art-body th,.art-body td{border:1px solid var(--line);padding:10px 12px;text-align:start}
.art-body blockquote{border-inline-start:3px solid var(--teal);padding-inline-start:18px;color:#fff}
.faq-item{border:1px solid var(--line);border-radius:14px;padding:16px 20px}
.faq-item summary{cursor:pointer;color:#fff;font-weight:500}
.faq-item p{margin-top:10px}
.art-sources{font-size:.9rem}
</style>
"""
    if a.get("json_ld"):
        extra_head += '<script type="application/ld+json">%s</script>\n' % json.dumps(a["json_ld"], ensure_ascii=False).replace("</", "<\\/")
    t = t.replace("</head>", extra_head + "</head>", 1)

    # Hero
    t = t.replace(TEMPLATE_IMG, image)
    t = re.sub(r'(<div class="crumbs".*?<i></i><span>)[^<]*(</span>)', lambda m: m.group(1) + esc(tag) + m.group(2), t, count=1, flags=re.S)
    t = re.sub(r'<div class="art-meta" data-reveal="up">.*?</div>',
               '<div class="art-meta" data-reveal="up"><span class="tag">%s</span><span>%s</span><span>%s min read</span></div>'
               % (esc(tag), esc(date_label), int(round(a.get("read_minutes") or 0)) or 1), t, count=1, flags=re.S)
    t = re.sub(r'<h1 class="art-title" data-reveal="up">.*?</h1>',
               '<h1 class="art-title" data-reveal="up">%s</h1>' % esc(title), t, count=1, flags=re.S)
    t = re.sub(r'<p class="art-lead" data-reveal="up">.*?</p>',
               '<p class="art-lead" data-reveal="up">%s</p>' % esc(desc), t, count=1, flags=re.S)
    t = re.sub(r'<ul class="checklist">.*?</ul>',
               '<ul class="checklist">%s</ul>' % "".join("<li>%s</li>" % esc(h) for h in highlights), t, count=1, flags=re.S)
    t = re.sub(r'<article class="art-body">.*?</article>',
               lambda m: '<article class="art-body">%s%s%s</article>' % (body, faq_html, sources_html), t, count=1, flags=re.S)
    t = re.sub(r'(<figure class="art-fig"[^>]*><img src="[^"]*" alt=")[^"]*', lambda m: m.group(1) + esc(title), t, count=1)

    with open(page_path, "w", encoding="utf-8") as f:
        f.write(t)
    print("page written:", page_rel)

    # Listing card (newest first; replaced in place when an article is updated)
    lp = os.path.join(SITE, LISTING)
    lt = open(lp, encoding="utf-8").read()
    card = ('\n      <a class="card news" href="%s">\n        <div class="thumb"><span class="tag">%s</span>'
            '<img src="%s" alt="%s" loading="lazy" decoding="async"></div>\n        <div class="body">'
            '<span class="date">%s</span><h3>%s</h3><span class="link-arrow">Read More <span class="arr" '
            'aria-hidden="true">→</span></span></div>\n      </a>') % (page_rel, esc(tag), image, esc(title), esc(date_label), esc(title))
    existing = re.compile(r'\n\s*<a class="card news" href="%s">.*?</a>' % re.escape(page_rel), re.S)
    marker = '<div class="news-grid" data-stagger="up">'
    if existing.search(lt):
        lt = existing.sub(lambda m: card, lt, count=1)
        print("card updated in:", LISTING)
    elif marker in lt:
        lt = lt.replace(marker, marker + card, 1)
        print("card added to:", LISTING)
    else:
        print("WARNING: news grid not found in", LISTING, "- add the card manually")
    open(lp, "w", encoding="utf-8").write(lt)

    # Sitemap
    sp = os.path.join(SITE, "sitemap.xml")
    st = open(sp, encoding="utf-8").read()
    url = "%s/%s" % (DOMAIN, page_rel)
    if url not in st:
        entry = '  <url><loc>%s</loc><lastmod>%s</lastmod><priority>0.6</priority></url>\n' % (url, datetime.date.today().isoformat())
        st = st.replace("</urlset>", entry + "</urlset>", 1)
        open(sp, "w", encoding="utf-8").write(st)
        print("sitemap updated")

    files = [page_rel, LISTING, "sitemap.xml"] + ([image] if image.startswith("media/images/news/") else [])
    if not quiet:
        print("\nUpload these with VS Code SFTP (right-click > Upload):")
        for f in files:
            print("  ", f)
        if (a.get("quality_score") or 0) < 80:
            print("\nNote: quality score is %s (<80). Review the text before publishing." % a.get("quality_score"))
    return slug, files


def ftp_upload(files):
    """Upload site-relative files over explicit FTPS using curl (handles TLS session reuse)."""
    host = os.environ.get("FTP_HOST", "host.esolutionsit.com")
    root = os.environ.get("FTP_ROOT", "/").rstrip("/")
    user, pw = os.environ.get("FTP_USER"), os.environ.get("FTP_PASSWORD")
    # credentials go through a temp config file, never the command line;
    # without FTP_USER/FTP_PASSWORD it falls back to ~/.netrc (local Mac use)
    with tempfile.NamedTemporaryFile("w", delete=False) as cfg:
        if user and pw:
            cfg.write('user = "%s:%s"\n' % (user.replace('"', '\\"'), pw.replace('\\', '\\\\').replace('"', '\\"')))
        elif os.path.exists(os.path.expanduser("~/.netrc")):
            cfg.write("netrc\n")
        else:
            sys.exit("Set FTP_USER / FTP_PASSWORD, or add the login to ~/.netrc")
        cfg_path = cfg.name
    try:
        for rel in files:
            url = "ftp://%s%s/%s" % (host, root, rel)
            r = subprocess.run(["curl", "-sS", "--ssl-reqd", "--ftp-create-dirs", "--retry", "2",
                                "-K", cfg_path, "-T", os.path.join(SITE, rel), url],
                               capture_output=True, text=True)
            if r.returncode != 0:
                raise RuntimeError("upload failed for %s: %s" % (rel, r.stderr.strip()))
            print("  uploaded:", rel)
    finally:
        os.unlink(cfg_path)


def load_json(path, default):
    try:
        return json.load(open(path, encoding="utf-8"))
    except FileNotFoundError:
        return default


def allowed(a, cfg):
    text = " ".join([a.get("topic") or "", a.get("title") or "", a.get("target_keyword") or ""]).lower()
    if a["id"] in cfg.get("block_ids", []):
        return False, "blocked id"
    if a["id"] in cfg.get("allow_ids", []):
        return True, "allow-listed id"
    kws = [k.lower() for k in cfg.get("require_any_keyword", [])]
    if kws and not any(k in text for k in kws):
        return False, "no Ithra keyword in topic/title (add one, or put the id in allow_ids)"
    if a.get("language", "en") not in cfg.get("languages", ["en"]):
        return False, "language %s not enabled" % a.get("language")
    return True, "ok"


def auto(o):
    cfg = load_json(CONFIG, {})
    ledger = load_json(LEDGER, {})
    arts = api("/articles?limit=50")["data"]
    approved = [x for x in arts if x["status"] == "approved"]
    min_q = cfg.get("auto_approve_min_quality")
    if min_q is not None:
        auto_ok = [x for x in arts if x["status"] == "in_review" and (x.get("quality_score") or 0) >= min_q]
        for x in auto_ok:
            print("AUTO-APPROVE %s (quality %s >= %s): %s" % (x["id"], x.get("quality_score"), min_q, x.get("title")))
        approved += auto_ok
    print("%d articles, %d to publish" % (len(arts), len(approved)))
    done = 0
    for s_ in approved:
        a = api("/articles/%s" % s_["id"])
        ok, why = allowed(a, cfg)
        if not ok:
            print("SKIP %s (%s): %s" % (a["id"], why, a.get("title")))
            continue
        prev = ledger.get(a["id"])
        print("%s %s: %s" % ("UPDATE" if prev else "NEW", a["id"], a.get("title")))
        if o.dry_run:
            continue
        slug, files = build(a, cfg.get("tag", o.tag), prev["date"] if prev else o.date,
                            cfg.get("default_image", o.image), force=True,
                            slug=prev["slug"] if prev else None, quiet=True)
        ftp_upload(files)
        api("/articles/%s" % a["id"], method="PATCH", body={"status": "published"})
        ledger[a["id"]] = {"slug": slug, "title": a.get("title"),
                           "date": prev["date"] if prev else o.date,
                           "url": "%s/news/%s.html" % (DOMAIN, slug),
                           "published_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}
        with open(LEDGER, "w", encoding="utf-8") as f:
            json.dump(ledger, f, indent=2, ensure_ascii=False)
        print("  live:", ledger[a["id"]]["url"])
        done += 1
    print("published/updated: %d" % done)
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        open(gh, "a").write("published=%d\n" % done)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("article_id", nargs="?")
    p.add_argument("--list", action="store_true")
    p.add_argument("--tag", default="Insights")
    p.add_argument("--date", default=datetime.date.today().strftime("%B %Y"))
    p.add_argument("--image", default="media/images/cx.jpg")
    p.add_argument("--json")
    p.add_argument("--force", action="store_true")
    p.add_argument("--auto", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    o = p.parse_args()

    if o.auto:
        return auto(o)

    if o.list:
        for x in api_get("/articles?limit=50")["data"]:
            print("%s  %-10s q=%-4s %s" % (x["id"], x["status"], x.get("quality_score"), x["title"]))
        return
    if o.json:
        a = json.load(open(o.json, encoding="utf-8"))
    elif o.article_id:
        a = api_get("/articles/%s" % o.article_id)
    else:
        p.error("give an article_id, --list, or --json")
    if not os.path.exists(os.path.join(SITE, o.image)):
        sys.exit("image not found: " + o.image)
    build(a, o.tag, o.date, o.image, o.force)


if __name__ == "__main__":
    main()
