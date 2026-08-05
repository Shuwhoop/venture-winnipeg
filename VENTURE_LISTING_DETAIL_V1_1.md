# Venture Listing Detail V1.1

## Purpose

Keep photo licensing and permission controls inside Venture's private admin workspace while presenting a clean public listing experience.

## What changed

- Removed photo-rights labels, permission status, and rights-check explanations from public listing pages.
- Removed the public photo-status caption beneath listing artwork and photographs.
- Removed rights basis and rights labels from the public listing-detail data object.
- Kept the server-side publishing gate: a real photograph is still returned only when its rights basis is approved.
- Kept all permission evidence, rights basis controls, and review details in the private admin photo editor and admin API.
- Listings without an approved photograph quietly display Venture category artwork, without explaining internal moderation rules to visitors.

## Product rule

Visitors see the best approved visual available. Administrators see why it is approved.

## Test after installation

1. Open a public listing with an approved photograph and confirm no rights label appears.
2. Open a public listing without an approved photograph and confirm category artwork appears without a status caption.
3. Confirm the public trust section does not mention photo licensing or permission.
4. Open the private admin photo editor and confirm Photo permission, rights basis, notes, and media records remain available.
5. Confirm unapproved or unknown-rights images still do not appear publicly.
