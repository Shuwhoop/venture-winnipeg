# Venture Listing Detail V1.0

## Purpose

Complete the discovery loop after Explore while keeping Venture's photo use legally cautious.

## What changed

- Added a large listing media frame.
- Real photos appear only when an active primary `listing_media` record has an approved rights basis.
- Listings without approved photo rights use original Venture category artwork instead of copied web photos.
- Added category artwork for food, coffee, nightlife, live music, outdoor places, activities, and general events.
- Added a public photo-rights status line without exposing private permission evidence.
- Added a fixed mobile action dock for Save, Share, Directions, and Build around this.
- Replaced text heart/share characters with accessible SVG icons.
- Added Open Graph image metadata only for rights-approved photos.
- Added honest "not confirmed yet" fallbacks for accessibility, transit, and parking.
- Added photo-rights protection to Explore and homepage listing images. Rows without recorded rights notes fall back to Venture artwork.
- Updated the admin photo publisher so future listing rows retain the rights basis alongside the internal evidence note.

## Photo rule

No confirmed rights, no real photo.

Approved rights bases:

- Venture-owned
- Business permission
- Organizer permission
- Submitter-owned
- Licensed
- Public domain

Google Images, Google Maps screenshots, social-media screenshots, copied business-site images, `link_only`, and unknown-rights notes are not treated as publishable photos.

## Test after installation

1. Open `/explore` and confirm listings without approved rights use Venture placeholders.
2. Open any listing detail page.
3. Test Save, Share, Directions, and Build around this.
4. Confirm the action dock does not overlap the bottom navigation.
5. Open a listing with a photo published through the admin photo editor and confirm the real photo appears.
6. Open a listing with no approved media record and confirm Venture artwork appears.
7. Expand Accessibility, Transit, and Parking when information is missing.
8. Test at approximately 320 px, 390 px, and desktop width.

## Build validation

The changed TypeScript and TSX files passed isolated TypeScript syntax transpilation. A full local Next.js build should be run after installation because the packaging environment's npm mirror could not retrieve an unrelated dependency.
