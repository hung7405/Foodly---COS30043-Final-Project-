"""
Generate labeled placeholder screenshot PNGs for the Foodly project report.

Each figure is rendered to LOOK like a captured screenshot of the named screen,
with a thin browser chrome frame and a centered label so the layout (figure
number, caption, placement) is stable before the author drops in the real
screenshot. Replace any figure with a real screengrab of the same name to keep
the captions and numbers aligned (figures are numbered sequentially by this script).

Run from repo root:  python docs/figures/generate_placeholders.py
Outputs into docs/figures/ alongside this script.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
WIDTH, HEIGHT = 1120, 660          # 16:9-ish browser window
CHROME = 26                           # title-bar height
BORDER = 44                           # left/right padding inside the frame
TITLE_H = 30                          # top title band inside the frame

# (filename, display text shown on the placeholder)
FIGURES = [
    ("fig_01_home_desktop.png", "Home page — desktop (hero banner, category rail)"),
    ("fig_02_home_mobile.png",   "Home page — mobile (bottom tab bar, stacked)"),
    ("fig_03_news_search.png",   "News page — search + category chips + pagination"),
    ("fig_04_about_greeting.png","About page — dynamic greeting + radio image switch"),
    ("fig_05_explore_map_desktop.png", "Explore page — interactive map + deal list (desktop)"),
    ("fig_06_explore_mobile.png",       "Explore page — mobile (map stacked above list)"),
    ("fig_07_deal_detail.png",          "Deal detail slide-over — price, countdown, reserve"),
    ("fig_08_reservation_hold.png",     "Reservation hold — 15-minute countdown timer"),
    ("fig_09_payment_confirm.png",      "Payment flow — mock confirm → pickup code"),
    ("fig_10_auth_login.png",           "Authentication — login / register"),
    ("fig_11_profile_pages.png",        "Profile — My Deals, My Reservations, Bookmarks"),
    ("fig_12_community_feed.png",       "Community feed — live activity stream"),
    ("fig_13_dashboard_analytics.png",  "Admin dashboard — live analytics charts"),
    ("fig_14_merchant_portal.png",      "Merchant portal — pickup queue + KPI cards"),
    ("fig_15_ai_search_results.png",    "AI vision search — upload + matching deals"),
    ("fig_16_dark_mode.png",            "Dark mode — consistent token-based theme"),
    ("fig_17_pwa_offline.png",          "PWA — install prompt + offline shell"),
    ("fig_18_concurrency_test.png",     "Live demo — concurrent reserve (1 success, 1 conflict)"),
]

def _font(size, bold=False):
    for name in ("arial.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()

def make_figure(path, text):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#f4f6f9")
    d = ImageDraw.Draw(img)
    # browser chrome
    d.rectangle([0, 0, WIDTH, CHROME], fill="#e2e8f0")
    d.text((BORDER, 6), "Foodly  ", fill="#1e293b", font=_font(15, bold=True))
    # window dots
    xo = WIDTH - BORDER - 44
    for i, col in enumerate(["#f87171", "#fbbf24", "#4ade80"]):
        cx = xo + i * 22
        d.ellipse([cx, 6, cx + 14, 20], fill=col)
    # content frame
    d.rectangle([BORDER, CHROME + TITLE_H, WIDTH - BORDER, HEIGHT - BORDER],
                outline="#cbd5e1", width=1, fill="#ffffff")
    # title band
    d.rectangle([BORDER, CHROME, WIDTH - BORDER, CHROME + TITLE_H], fill="#eff1f7")
    d.text((BORDER + 14, CHROME + 6), text, fill="#334155", font=_font(17, True))
    # placeholder watermark message
    lines = text.split(" — ")
    d.text((BORDER + 28, HEIGHT / 2 - 40),
           "screenshot placeholder",
           fill="#94a3b8", font=_font(22, True))
    d.text((BORDER + 28, HEIGHT / 2 - 6),
           lines[0] + "  (replace with real screengrab)",
           fill="#94a3b8", font=_font(13))
    img.save(path)

def main():
    os.makedirs(HERE, exist_ok=True)
    for fn, text in FIGURES:
        make_figure(os.path.join(HERE, fn), text)
        print("wrote", fn)

if __name__ == "__main__":
    main()
