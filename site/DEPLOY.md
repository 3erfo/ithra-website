# Ithra United Website v3.1: Deployment Guide (Windows Server + IIS)

This folder is the complete website. Upload the contents of `v3.1` (not the folder itself) to the site's root, for example `C:\inetpub\uniithra\`.

## What's inside
| Item | Purpose |
|---|---|
| `index.html`, `About.html`, … `Careers.html` | English pages (same file names as the current site, so existing links and Google results keep working) |
| `ar/` | Arabic pages (RTL) with the same file names |
| `news/`, `ar/news/` | 6 news articles in each language |
| `assets/` | CSS, JavaScript, Readex Pro fonts and the Lenis smooth-scroll library (no CDN needed) |
| `media/` | Only the images, videos and PDF the site uses (optimized) |
| `web.config` | IIS settings: default document, MIME types (woff2, mp4, svg, webp), 7-day browser caching, compression, custom 404 and security headers |
| `404.html` | Branded "page not found" page |
| `robots.txt`, `sitemap.xml` | For search engines (38 URLs with EN/AR hreflang) |

## IIS setup
1. **Create the site.** In IIS Manager → Sites → Add Website, set the physical path to the folder above and bind it to `www.uniithra.com.sa` and `uniithra.com.sa` (ports 80 and 443).
2. **SSL.** Bind your certificate to port 443.
3. **Optional HTTPS/www redirect.** Install the [URL Rewrite module](https://www.iis.net/downloads/microsoft/url-rewrite), then uncomment the `<rewrite>` block in `web.config`. Don't uncomment it before the module is installed, or IIS returns error 500.
4. **Static compression.** Make sure the "Static Content Compression" role service is installed (Server Manager → Web Server → Performance).
5. **Back up first.** Keep a copy of the current site folder before replacing it.

## After going live
- **Forms are pre-activated for the live domain.** Activation requests were sent from www.uniithra.com.sa on 22 Oct 2026 to **info@uniithra.com.sa** (Contact, Product demo, Newsletter) and **recruitment@uniithra.com.sa** (Careers with attachments). Once the "Activate Form" link in each of those two emails has been clicked, the forms deliver email the moment the site is uploaded, with no extra setup. If an email can't be found, check spam for a message from FormSubmit. Submitting any form once on the live site re-sends the activation email.
- **Search Console.** Submit `https://www.uniithra.com.sa/sitemap.xml` in Google Search Console.
- **Test:**
  - The EN/AR switch on every page
  - Contact form, newsletter and Careers form (with a PDF attached)
  - The Contact map
  - A wrong URL (it should show the 404 page)

## Notes
- **News articles.** The article text was written for this redesign. Review the dates and facts before launch.
- **Folder location.** The site assumes it runs at the domain root (`/`). The 404 page uses absolute paths for that reason.
- **Updating content.** Edit the HTML files directly or ask for a new version. Each version is delivered in its own folder (`v3.1`, …).
