# Venture route reordering

This patch adds a mobile-first route edit mode to generated outings.

## User flow

1. Open a generated outing.
2. Tap **Edit order** in the Your Route header.
3. Press and hold the dotted **Drag** grip on any stop.
4. Move it above or below another stop, or use the up/down buttons.
5. Tap **Done**.

## What updates

- Stop numbering
- Route card order
- Estimated travel legs
- Start and end times
- Map marker and route order
- Local generated-outing data
- A previously saved outing with the same plan ID
- Data used by the Share action

Venture adds a reminder to confirm live event and venue hours after a manual reorder because the user has overridden the recommendation engine's original sequence.
