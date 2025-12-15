from playwright.sync_api import sync_playwright

def verify_anomalies():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:5173")

        # Wait for the app to load
        page.wait_for_selector(".interface")

        # We need to simulate enough distance to see anomalies
        # Since this is a test environment, we might need to manually inject state
        # or wait a VERY long time.
        # Alternatively, we can use the browser console to set the state directly if possible
        # or just check if the "Deep Space Scanner" section exists (it should show a placeholder if distance < 50)

        # Check for Scanner Section
        scanner_section = page.locator(".scanner-section")
        scanner_section.wait_for()

        # Check for placeholder text since distance is likely 0
        placeholder = page.locator(".scanner-placeholder")
        if placeholder.is_visible():
            print("Scanner placeholder visible (Expected for new game)")

        # Take screenshot of the initial state
        page.screenshot(path="verification/scanner_initial.png")

        # Now, let's try to cheat the system to show an anomaly
        # We can try to modify the React state via local storage and reload
        # Modify localStorage

        # Construct a V3 save with high distance
        save_data = """
        {
          "version": 3,
          "savedAt": "2023-10-27T12:00:00.000Z",
          "meta": { "appVersion": "0.0.0" },
          "state": {
            "resources": {
              "metal": 1000,
              "energy": 1000,
              "data": 1000,
              "probes": 10,
              "entropy": 0,
              "distance": 60
            },
            "units": {
              "harvesters": 0,
              "foundries": 0,
              "fabricators": 0,
              "archives": 0,
              "signalRelays": 0,
              "stabilizers": 0
            },
            "prestige": {
              "cycles": 0,
              "storedKnowledge": 0,
              "forks": 0,
              "primeArchives": 0
            },
            "upgradeState": {
              "autonomy": false,
              "dysonSheath": false,
              "autoforge": false,
              "archiveBloom": false,
              "quantumMemory": false,
              "stellarCartography": false
            },
            "scannedAnomalies": [],
            "logs": []
          }
        }
        """

        page.evaluate(f"localStorage.setItem('vanidleprobes.save.v2', '{save_data.replace(chr(10), '').strip()}')")
        page.reload()

        # Wait for load
        page.wait_for_selector(".interface")

        # Now we should see the "Dying Neutron Star" anomaly
        # Distance 60 > 50 req for Neutron Star

        anomaly_card = page.locator(".unit-card", has_text="Dying Neutron Star")
        anomaly_card.wait_for()
        print("Anomaly 'Dying Neutron Star' found")

        # Take screenshot of the detected anomaly
        page.screenshot(path="verification/scanner_detected.png")

        browser.close()

if __name__ == "__main__":
    verify_anomalies()
