# Palette's Journal

## 2024-05-22 - Accessibility Initial Scan
**Learning:** This app is a clicker/idle game. These often have repetitive actions. Accessibility for screen readers and keyboard users is critical but often overlooked in this genre.
**Action:** I will focus on ensuring interactive elements like buttons and tabs have proper ARIA attributes and keyboard focus states.

## 2024-05-22 - Invisible Progress Bars
**Learning:** Visual progress bars (divs with width%) are invisible to screen readers, hiding core game mechanics like waiting for entropy to stabilize or milestones to complete. This makes the game unplayable for blind users.
**Action:** Always add `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a label to any visual progress indicator.
