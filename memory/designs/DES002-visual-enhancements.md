# DES002 - Visual Enhancements for UI and Probe Travel Visualization

**Status:** Proposed  
**Created:** 2025-11-25  
**Author:** AI Assistant  

---

## Problem Statement

The current UI provides functional gameplay but lacks visual polish and dynamic feedback that would make the probe exploration experience more immersive. The galaxy map probe visualization is relatively static, and resource/progress feedback could benefit from animations and visual flourishes that reinforce the sci-fi theme.

---

## Goals

1. **Enhance probe travel visualization** to feel more dynamic and alive
2. **Improve visual feedback** for resource changes and milestone progress
3. **Add subtle animations** that reinforce the "expanding network" theme without hurting performance
4. **Maintain CSS-only approach** where possible for simplicity

---

## Non-Goals

- Complete UI redesign or layout changes
- Adding new gameplay mechanics
- Heavy JavaScript animations (prefer CSS)
- WebGL/Canvas rendering (keep DOM-based)

---

## Design: Probe Travel Visualization Enhancements

### P1: Probe Trail Effects

Add comet-like trails behind probes as they orbit the origin node.

**Implementation:**
```css
.probe::before {
  content: '';
  position: absolute;
  width: 24px;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--glow));
  transform: translateX(-100%) rotate(var(--trail-angle));
  filter: blur(2px);
  opacity: 0.6;
}
```

**Behavior:**
- Trail length varies with probe speed (shorter duration = longer trail)
- Trail color matches probe glow color
- Fade-out gradient creates natural motion blur effect

### P2: Multiple Pulsing Exploration Waves

Replace single static wave with multiple concentric rings that pulse outward.

**Implementation:**
- Add 3 `.exploration-wave` elements with staggered animation delays
- Each wave uses `scale()` and `opacity` animation
- Waves originate from origin and expand based on `resources.distance`

```css
@keyframes wave-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

.exploration-wave {
  animation: wave-pulse 4s ease-out infinite;
}
.exploration-wave:nth-child(2) { animation-delay: 1.3s; }
.exploration-wave:nth-child(3) { animation-delay: 2.6s; }
```

### P3: Probe Size & Brightness Variation

Add depth perception by varying probe appearance based on orbital position.

**Implementation:**
- Scale probes between 0.7x and 1.3x during orbit
- Adjust brightness/opacity at different orbital phases
- Already partially implemented via `scale()` in keyframes — enhance range

### P4: Data Transmission Lines (Optional)

Thin animated lines connecting probes back to origin, showing data flow.

**Implementation:**
- SVG or CSS conic-gradient approach
- Dashed animated stroke from probe to center
- Line opacity based on data production rate

**Note:** May be complex to implement cleanly — consider as stretch goal.

---

## Design: General UI Visual Improvements

### U1: Resource Number Animation

Smooth countup/transition when resource values change.

**Implementation Options:**
1. **CSS `transition` on opacity** with number swap (simpler)
2. **React spring/motion library** for smooth interpolation (heavier)
3. **CSS `@property` for animatable numbers** (modern browsers only)

**Recommended:** Use CSS transitions with a subtle scale pulse:
```css
.resource-amount {
  transition: transform 0.15s ease-out;
}
.resource-amount.changed {
  transform: scale(1.05);
}
```

### U2: Progress Bar Shimmer Effect

Add animated gradient shimmer on milestone/progress bars.

**Implementation:**
```css
.milestone-bar-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
  transform: translateX(-100%);
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
```

### U3: Card Hover Micro-interactions

Subtle 3D tilt and glow enhancement on unit/upgrade cards.

**Implementation:**
```css
.unit-card:hover {
  transform: translateY(-4px) rotateX(2deg);
  box-shadow: 0 20px 50px rgba(122, 255, 237, 0.25);
}
```

### U4: Log Entry Animations

Fade-in with slide for new telemetry entries.

**Implementation:**
```css
.log-section li {
  animation: log-appear 0.4s ease-out;
}

@keyframes log-appear {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### U5: Milestone Completion Effect

Celebration pulse when a milestone is reached.

**Implementation:**
- Add `.milestone-complete` class when progress reaches 100%
- Trigger a brief glow/scale animation
- Optional: subtle particle burst (CSS-only sparkles)

---

## Implementation Priority

| ID  | Feature                      | Impact | Effort | Priority |
|-----|------------------------------|--------|--------|----------|
| P1  | Probe trail effects          | High   | Low    | **1**    |
| P2  | Multiple pulsing waves       | High   | Low    | **2**    |
| U4  | Log entry animations         | Medium | Low    | **3**    |
| U2  | Progress bar shimmer         | Medium | Low    | **4**    |
| U3  | Card hover micro-interactions| Medium | Low    | **5**    |
| P3  | Probe size variation         | Medium | Low    | **6**    |
| U1  | Resource number animation    | Medium | Medium | **7**    |
| U5  | Milestone completion effect  | Low    | Medium | **8**    |
| P4  | Data transmission lines      | High   | High   | **9**    |

---

## File Changes Required

### CSS Changes (`src/App.css`)
- Add `.probe::before` trail styles
- Add `@keyframes wave-pulse` and multiple wave styling
- Add `.milestone-bar-fill::after` shimmer
- Add card hover transforms
- Add `.log-section li` animation

### TSX Changes (`src/App.tsx`)
- Add multiple `.exploration-wave` elements (2 additional)
- Optionally add `key` prop with animation reset for log entries

---

## Acceptance Criteria

- [ ] Probes display visible trailing effect during orbit
- [ ] Multiple waves pulse outward from origin node
- [ ] Progress bars show subtle shimmer animation
- [ ] Unit/upgrade cards respond to hover with lift effect
- [ ] New log entries animate in smoothly
- [ ] No visible performance degradation on mid-range devices
- [ ] All animations respect `prefers-reduced-motion` media query

---

## Performance Considerations

1. **Use `transform` and `opacity` only** — these properties are GPU-accelerated
2. **Avoid animating `width`, `height`, `top`, `left`** — causes layout thrashing
3. **Limit particle/glow effects** — keep filter usage minimal
4. **Add `will-change` hints** sparingly for heavy animations
5. **Respect `prefers-reduced-motion`**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .probe, .exploration-wave, .milestone-bar-fill::after {
       animation: none;
     }
   }
   ```

---

## Open Questions

1. Should probe trails be implemented with `::before` pseudo-element or separate DOM elements?
2. Is SVG preferred for data transmission lines, or stick to pure CSS?
3. Should we add sound effects for milestone completion? (Out of scope but related)

---

## References

- Current `App.css` probe animation: `@keyframes probe-orbit`
- Current wave element: `.exploration-wave`
- Starfield implementation: `seededRng()` in `App.tsx`
