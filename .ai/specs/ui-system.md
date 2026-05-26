# Spec - UI System

## Goal

Create a consistent, usable dark-mode UI for the Crash Game.

## Visual Direction

- Dark background.
- High-contrast text.
- Vibrant but restrained accents for active game states.
- Red for crash/loss.
- Green for successful cashout/high multipliers.
- Avoid single-hue screens.

## Components

Core components:

- shadcn/ui Button
- shadcn/ui Input
- Number input for money
- Card for repeated items only
- Toast
- Badge/status pill
- Modal/dialog if needed
- Skeleton/loading state
- Tabs or segmented controls if a view grows

## Accessibility

- Buttons must have disabled states and accessible labels.
- Inputs must have labels.
- Color cannot be the only status indicator.
- Focus states must be visible.

## Layout

- Do not nest cards inside cards.
- Avoid landing-page hero patterns.
- First screen should be the actual game.
- Stable dimensions for chart, controls, and list rows.
