# Implementation Plan: Premium UI Redesign

## Overview

This implementation plan transforms the Photobooth 360 application UI into a premium-grade visual experience. The implementation uses React 19, TypeScript, Vite, and Tailwind CSS v4, building upon the existing zinc-based dark theme. The approach is incremental: establish design tokens first, then apply them systematically to each component category, and finally verify performance and accessibility.

## Tasks

- [x] 1. Establish design token system in CSS
  - [x] 1.1 Create CSS custom properties in src/index.css
    - Define premium color tokens (deep black #0F0F0F, electric violet #8B5CF6, neon blue #06B6D4)
    - Define border radius tokens (16px small, 24px medium, 32px large)
    - Define shadow tokens (3 levels: small, medium, large with accent glow variants)
    - Define transition duration tokens (150ms, 200ms, 300ms)
    - Define easing function tokens (ease-out, ease-in-out)
    - _Requirements: 13.1, 13.2, 13.3, 1.1, 1.2, 1.3, 1.4, 14.4_
  
  - [x] 1.2 Update Tailwind CSS v4 theme configuration
    - Extend color palette with premium tokens
    - Configure animation utilities with proper durations
    - Add custom utilities for glassmorphism effects
    - _Requirements: 13.2, 13.4, 4.6_

- [x] 2. Update global background and accent color system
  - [x] 2.1 Replace root background color in App.tsx
    - Change from `bg-zinc-950` to `bg-[#0F0F0F]` (deep black)
    - _Requirements: 1.1_
  
  - [x] 2.2 Update ACCENT object mapping in App.tsx
    - Map "indigo" accent to electric violet (#8B5CF6 / violet-500)
    - Keep "cyan" as neon blue (#06B6D4 / cyan-500)
    - Update all shadow values to use accent glow shadows
    - _Requirements: 1.3, 14.2, 14.5_
  
  - [x] 2.3 Update SettingsModal accent color palette
    - Update "indigo" label to "Violet" and class to `bg-violet-500`
    - Ensure all accent references use updated color names
    - _Requirements: 1.3, 9.4_

- [ ] 3. Redesign button components across the application
  - [-] 3.1 Update primary buttons (Start, Stop, Download)
    - Change from `rounded-full` to `rounded-2xl` (16px)
    - Add hover scale effect: `hover:scale-[1.02]`
    - Add active scale effect: `active:scale-[0.98]`
    - Add transition: `transition-all duration-200 ease-out`
    - Ensure accent glow shadow is applied
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 2.1, 14.2_
  
  - [-] 3.2 Update secondary buttons (Refaire, settings pill buttons)
    - Change from `rounded-full` to `rounded-2xl` where applicable
    - Update background: `bg-zinc-800`
    - Update text: `text-zinc-300`
    - Update hover states: `hover:bg-zinc-700 hover:text-white`
    - Add hover scale effect: `hover:scale-[1.02]`
    - _Requirements: 5.2, 5.3, 5.4, 2.1_
  
  - [x] 3.3 Update SettingsModal button components
    - Apply `rounded-2xl` to duration, countdown, and camera selection buttons
    - Ensure consistent hover/active states with scale transforms
    - Update footer buttons (Cancel, Save) with new border radius
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4. Apply glassmorphism effects to modal components
  - [x] 4.1 Update SettingsModal backdrop
    - Enhance backdrop from `bg-black/70` to `bg-black/70 backdrop-blur-sm`
    - _Requirements: 3.1, 3.5, 7.1_
  
  - [x] 4.2 Update SettingsModal container styling
    - Update border to `border-zinc-800/50` (reduced opacity)
    - Add stronger shadow: `shadow-2xl`
    - _Requirements: 3.3, 7.2, 14.1_
  
  - [x] 4.3 Apply glassmorphism to SettingsModal header
    - Add `bg-zinc-900/80 backdrop-blur-lg` to header section
    - Update border-bottom to `border-zinc-800/50`
    - _Requirements: 3.1, 3.2, 3.3, 7.5_
  
  - [-] 4.4 Update modal entrance animation
    - Verify `animate-in fade-in zoom-in-95 duration-200` is applied
    - Ensure animation respects `prefers-reduced-motion`
    - _Requirements: 4.1, 4.3, 7.3, 12.5_

- [ ] 5. Update card and panel components
  - [x] 5.1 Update main stage card in App.tsx
    - Update border to `border-zinc-800/50` (reduced opacity)
    - Ensure `shadow-2xl` is applied for depth
    - _Requirements: 6.2, 6.3, 14.1_
  
  - [-] 5.2 Apply glassmorphism to QR code share section
    - Add glassmorphism container with `bg-zinc-900/80 backdrop-blur-lg border border-white/10`
    - Ensure text contrast meets WCAG AA standards
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 1.5_
  
  - [~] 5.3 Update gallery thumbnail cards
    - Change from `rounded-xl` to `rounded-2xl`
    - Apply glassmorphism: `bg-zinc-900/80 backdrop-blur-lg`
    - Update inactive border to `border-zinc-800/50`
    - Add hover scale: `hover:scale-105`
    - Update transition: `transition-all duration-200`
    - _Requirements: 6.1, 6.3, 3.1, 3.2, 3.3, 2.1, 4.5_

- [~] 6. Checkpoint - Visual consistency verification
  - Run the application and verify:
    - All buttons use `rounded-2xl` consistently
    - All cards maintain proper border radius (16px or 24px)
    - Glassmorphism effects are visible on modals and panels
    - Accent colors are consistent across all interactive elements
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Update input components
  - [-] 7.1 Update event name input in SettingsModal
    - Change from `rounded-xl` to `rounded-2xl`
    - Add focus glow effect: `focus:shadow-[0_0_8px_rgba(139,92,246,0.3)]` for violet accent
    - Ensure focus ring uses accent color: `focus:ring-violet-500`
    - _Requirements: 2.1, 5.1, 5.4, 8.4_
  
  - [x] 7.2 Update all pill selection buttons (duration, countdown, etc.)
    - Ensure they use `rounded-2xl` or `rounded-full` as per design specification
    - Verify active state shadow: `shadow-[0_0_12px_rgba(139,92,246,0.4)]`
    - _Requirements: 2.1, 5.1, 5.5_

- [ ] 8. Enhance video container and overlay components
  - [ ] 8.1 Enhance watermark glassmorphism effect
    - Increase backdrop blur: `backdrop-blur-md` → `backdrop-blur-lg`
    - Verify border is `border-white/40`
    - Ensure readability with drop-shadow if needed
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [~] 8.2 Update countdown overlay backdrop
    - Enhance blur: `backdrop-blur-sm` → `backdrop-blur-md`
    - _Requirements: 3.1, 4.6_
  
  - [~] 8.3 Verify REC indicator glassmorphism
    - Ensure `backdrop-blur-md` is applied
    - Verify border `border-red-500/30` is visible
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 9. Implement animation performance optimizations
  - [~] 9.1 Add will-change hints for animated elements
    - Apply `will-change: transform, opacity` to buttons with hover/active states
    - Remove `will-change` after animation completes using CSS or React hooks
    - _Requirements: 12.1, 12.3_
  
  - [~] 9.2 Verify GPU acceleration for all animations
    - Use Chrome DevTools Performance tab to verify 60fps
    - Ensure only `transform` and `opacity` properties are animated
    - _Requirements: 12.1, 12.2, 12.3, 4.6_
  
  - [~] 9.3 Implement reduced motion support
    - Add CSS media query: `@media (prefers-reduced-motion: reduce)` in src/index.css
    - Set animation durations to 0ms when reduced motion is preferred
    - Verify all interactive elements remain functional without animations
    - _Requirements: 12.5_

- [ ] 10. Implement browser compatibility fallbacks
  - [~] 10.1 Add backdrop-filter feature detection
    - Use `@supports (backdrop-filter: blur())` in CSS
    - Provide solid background fallbacks (higher opacity) for unsupported browsers
    - _Requirements: 3.1, 3.5_
  
  - [~] 10.2 Test glassmorphism fallbacks
    - Verify modal backdrop falls back to `bg-black/80` without backdrop-filter
    - Verify glass cards fall back to `bg-zinc-900` without backdrop-filter
    - _Requirements: 3.1, 3.2, 3.5_

- [~] 11. Checkpoint - Performance and compatibility verification
  - Use Chrome DevTools Performance tab to verify 60fps during:
    - Modal open/close animations
    - Button hover states
    - Gallery thumbnail interactions
  - Test on Firefox and Safari for backdrop-filter support
  - Verify reduced motion preference disables animations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Update responsive styling for mobile viewports
  - [~] 12.1 Verify button touch targets on mobile
    - Ensure all buttons maintain minimum 44px height on mobile
    - Test on viewport < 768px
    - _Requirements: 10.3, 11.3_
  
  - [~] 12.2 Verify reduced padding on mobile
    - Check that card padding adjusts properly: `p-4` on mobile, `md:p-6` on desktop
    - Verify margins are reduced appropriately
    - _Requirements: 10.2, 10.5_
  
  - [~] 12.3 Test glassmorphism on mobile devices
    - Verify backdrop-blur performance on mid-range and low-end devices
    - Consider disabling glassmorphism on low-performance devices if needed
    - _Requirements: 12.3, 12.4_

- [ ] 13. Verify accessibility compliance
  - [~] 13.1 Test color contrast ratios
    - Verify white text on #0F0F0F background meets WCAG AA (≥4.5:1)
    - Verify accent color text meets WCAG AA standards
    - Verify secondary text (zinc-400, zinc-500) meets minimum contrast
    - _Requirements: 1.5, 8.4, 8.5_
  
  - [~] 13.2 Test keyboard navigation
    - Verify all interactive elements are reachable via Tab key
    - Verify focus states are visible with accent color rings
    - Verify modal can be closed with Escape key
    - _Requirements: 11.4, 11.5_
  
  - [~] 13.3 Verify ARIA labels and semantic HTML
    - Ensure all ARIA attributes are preserved from original implementation
    - Verify screen reader compatibility (test with NVDA or VoiceOver)
    - _Requirements: 11.5_

- [ ] 14. Final integration testing and polish
  - [~] 14.1 Test complete video recording workflow
    - Verify countdown overlay has enhanced backdrop blur
    - Verify REC indicator has correct glassmorphism styling
    - Verify playback controls maintain premium styling
    - _Requirements: 15.1, 15.2_
  
  - [~] 14.2 Test settings modal workflow
    - Verify modal opens/closes with smooth animations (200ms entrance, 150ms exit)
    - Verify all settings changes apply correctly to main UI
    - Verify accent color switching updates all components dynamically
    - _Requirements: 15.2, 13.5_
  
  - [~] 14.3 Test QR code sharing workflow
    - Verify QR code section has glassmorphism effect
    - Verify cloud/local badges maintain correct styling
    - Verify progress indicators use accent colors
    - _Requirements: 15.4, 15.6_
  
  - [~] 14.4 Test gallery interactions
    - Verify thumbnail selection applies accent border correctly
    - Verify hover effects work smoothly (scale 1.05, opacity increase)
    - Verify glassmorphism is applied to thumbnails
    - _Requirements: 15.3_

- [~] 15. Final checkpoint - Complete redesign verification
  - Perform comprehensive visual inspection:
    - Deep black background (#0F0F0F) is applied consistently
    - All buttons use 16px border radius
    - All cards use 24px border radius
    - Glassmorphism effects are visible and performant
    - All animations execute smoothly at 60fps
    - Accent color is consistent across all interactive elements
  - Verify all existing functionality works identically
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This is a pure visual redesign — no functional changes to video recording, settings, or sharing workflows
- All TypeScript interfaces remain unchanged (AppSettings, etc.)
- Design tokens are defined in CSS and consumed via Tailwind utility classes
- Glassmorphism effects include browser fallbacks for unsupported environments
- All animations respect `prefers-reduced-motion` media query
- Property-based testing is NOT applicable for this visual redesign (see Design Document testing section)
- Focus on manual visual testing, accessibility testing, and performance testing instead
- All tasks reference specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "7.1", "7.2"] },
    { "id": 3, "tasks": ["3.3", "4.1", "4.2", "5.1"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.2", "8.1"] },
    { "id": 5, "tasks": ["5.3", "8.2", "8.3"] },
    { "id": 6, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 7, "tasks": ["9.3", "10.2"] },
    { "id": 8, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 9, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3", "14.4"] }
  ]
}
```
