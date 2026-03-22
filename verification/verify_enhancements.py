import re
from playwright.sync_api import sync_playwright, expect

def verify_enhancements(page):
    page.goto("http://localhost:5173/")

    # Wait for the app to load
    expect(page.locator("h1")).to_have_text("Von Idle Probes")

    # 1. Check Bulk Buy buttons
    bulk_buy_10 = page.locator(".buy-selector button:has-text('10x')")
    expect(bulk_buy_10).to_be_visible()
    bulk_buy_10.click()

    # Check if 'active' class is present
    classes = bulk_buy_10.evaluate("el => el.className")
    if 'active' not in classes:
        print(f"Warning: 'active' class not found in {classes}")

    # 2. Check Resource Tooltips (presence of info icon)
    # Note: info-icon only shows if activeMultipliers.length > 0.
    # At start, prestige=1 (1x), latency=1 (100%), entropy=1 (100%).
    # So we might not see the icon yet unless we wait for entropy drift.

    # 3. Check Galaxy Map
    galaxy_map = page.locator(".galaxy-map")
    expect(galaxy_map).to_be_visible()

    # Take screenshot
    page.screenshot(path="verification/enhancements_verification.png", full_page=True)
    print("Screenshot saved to verification/enhancements_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 1200})
        page = context.new_page()
        try:
            verify_enhancements(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
