import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix imports
content = content.replace(
    "import { buildSave, saveToLocalStorage, loadFromLocalStorage } from './game/save';",
    "import { buildSave, saveToLocalStorage, loadFromLocalStorage, migrateSave } from './game/save';"
)

# Fix loading logic
# We'll use a more flexible regex to find the useEffect block
pattern = r'useEffect\(\(\) => \{[^}]*const saved = loadFromLocalStorage\(\);[^}]*\}, \[\]\);'

# Replacement for the loading effect
new_load_effect = """  useEffect(() => {
    const raw = loadFromLocalStorage();
    if (raw) {
      try {
        const saved = migrateSave(raw);
        const s = saved.state;
        setResources(s.resources);
        setUnits(s.units);
        setPrestige({ ...INITIAL_PRESTIGE, ...s.prestige });
        setUpgradeState(s.upgradeState);
        setScannedAnomalies(s.scannedAnomalies || []);
        if (s.logs && s.logs.length) setLogs(s.logs);
        setLastSavedAt(saved.savedAt);

        const savedAtMs = Date.parse(saved.savedAt);
        if (!Number.isNaN(savedAtMs)) {
          const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000);
          if (offlineSeconds > 5) {
            const { resources: res, log } = simulateOfflineProgress(
              s.resources,
              s.units,
              s.upgradeState,
              s.prestige,
              s.scannedAnomalies || [],
              Math.min(offlineSeconds, 24 * 60 * 60),
            );
            setResources(res);
            setLogs((prev) => [log, ...prev].slice(0, 8));
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load save:', e);
      }
    }
  }, []);"""

content = re.sub(pattern, new_load_effect, content, flags=re.DOTALL)

# Fix manual save
content = content.replace(
    "setLastSavedAt((save as any).savedAt);",
    "setLastSavedAt(save.savedAt);"
)

# Fix autosave
content = content.replace(
    "setLastSavedAt((save as any).savedAt);",
    "setLastSavedAt(save.savedAt);"
)

# Fix buy amount cast
content = content.replace(
    "onClick={() => setBuyAmount(amt as any)}",
    "onClick={() => setBuyAmount(amt as 1 | 10 | 100)}"
)

# Fix any in manual save (last line)
content = content.replace(
    "setLastSavedAt((save as any).savedAt);",
    "setLastSavedAt(save.savedAt);"
)

# Fix (saved as any).savedAt in the loading effect if it still exists elsewhere
content = content.replace("(saved as any).savedAt", "saved.savedAt")

with open('src/App.tsx', 'w') as f:
    f.write(content)
