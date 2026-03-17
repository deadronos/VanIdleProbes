from playwright.sync_api import sync_playwright, expect
import re

def test_game_loop(page):
    page.goto("http://localhost:5173/")

    # Check if title contains the name (it has dynamic probe count)
    expect(page).to_have_title(re.compile(r"Von Idle Probes"))

    # Get initial metal value
    metal_card = page.locator(".resource-card:has-text('Alloy Mass')")
    metal_amount = metal_card.locator(".resource-amount")

    # Wait for the amount to be visible and not empty
    expect(metal_amount).not_to_be_empty()

    initial_text = metal_amount.inner_text()
    initial_val = float(initial_text)
    print(f"Initial Metal: {initial_val}")

    # Wait for 3 seconds to see increase
    page.wait_for_timeout(3000)

    current_text = metal_amount.inner_text()
    current_val = float(current_text)
    print(f"Current Metal: {current_val}")

    if current_val <= initial_val:
        raise Exception(f"Metal did not increase! {initial_val} -> {current_val}")

    # Verify interaction: Click "Fabricate" for "Harvester Drones"
    unit_card = page.locator(".unit-card:has-text('Harvester Drones')")
    unit_count_elem = unit_card.locator(".unit-count")

    initial_units_text = unit_count_elem.inner_text().upper()
    initial_units = int(initial_units_text.replace('X', ''))
    print(f"Initial Harvesters: {initial_units}")

    fabricate_button = unit_card.get_by_role("button", name="Fabricate")
    fabricate_button.click()

    # Wait for count to update
    page.wait_for_timeout(500)

    current_units_text = unit_count_elem.inner_text().upper()
    current_units = int(current_units_text.replace('X', ''))
    print(f"Current Harvesters: {current_units}")

    if current_units != initial_units + 1:
        raise Exception(f"Harvester count did not increment! {initial_units} -> {current_units}")

    # Take a screenshot
    page.screenshot(path="/home/jules/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_game_loop(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            # Take error screenshot
            page.screenshot(path="/home/jules/verification/error.png")
            exit(1)
        finally:
            browser.close()
