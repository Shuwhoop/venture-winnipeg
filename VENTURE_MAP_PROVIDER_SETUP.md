# Venture map provider setup

The patch works immediately using OpenFreeMap's MapLibre-compatible Positron style.

For a contracted production provider, set either:

```text
NEXT_PUBLIC_MAP_STYLE_URL=https://your-provider.example/style.json
```

or:

```text
NEXT_PUBLIC_MAPTILER_KEY=your-public-maptiler-key
```

When both are present, `NEXT_PUBLIC_MAP_STYLE_URL` takes priority.

After adding or changing a `NEXT_PUBLIC_` variable in Vercel, redeploy the project because Next.js embeds public environment variables at build time.

Venture keeps Google Maps links separate. The embedded maps are for discovery and route order; Google Maps handles live directions, traffic, and transit.
