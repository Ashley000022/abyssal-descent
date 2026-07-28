# Manus Commercial Video — Research Notes

## Source project

The selected repository is an interactive deep-sea web experience titled **ABYSSAL**. Its visual language is defined primarily in `client/public/index.html`, not in the generic Tailwind stylesheet.

## Reusable visual system

- Ocean color curve: surface teal `#0E7C9E` fading through navy into near-black `#000104` by 10,935 m.
- Accent sequence: pale cyan `#CFF3FF`, bioluminescent mint `#7AF7E8`, acid lime `#D9FF7A`, pink `#FF9ECF`, and lavender `#C9B7FF`.
- Distinctive elements: live telemetry HUD, true-scale depth rail, gradient progress bar, light rays, vignette, marine-snow particles, glowing sparks, depth-zone labels, and specimen cards.
- Typography in the ABYSSAL artifact: Unbounded for display, Space Mono for telemetry, Spline Sans for body.
- Motion patterns: slow hero push/pulse, swim-in encounters, floating creatures, particle drift, scroll-linked depth changes, and progressive environmental darkening.

## GPT-generated assets

- Local hero image: `client/public/hero-abyssal.png`.
- Creature illustrations are referenced through `/manus-storage/` URLs in the HTML: sea turtle, hatchetfish, comb jelly, anglerfish, giant squid, dumbo octopus, snailfish, and amphipod.

## Manus product-video system

The official product-video skill requires a varying seeded blob background, Libre Baskerville Bold for the Manus wordmark and document/plan-card titles, Inter for other UI, English sample copy, and authentic 1366×768 app-stage proportions. The most relevant bundle is `artifacts`, containing prompt input, agent task, artifact delivery, table viewer, and core theme/icon/motion components.

The gallery endpoint currently redirects to a Manus passkey login, so the production should either use locally available skill assets if found or recreate only the necessary official-looking UI components from the documented design rules without blocking the video build.

## Recommended commercial concept

A 24-second, 16:9 product film: Manus receives the prompt “Create an immersive descent to the deepest place on Earth,” shows a concise agent build sequence, reveals the ABYSSAL app as the artifact, then descends rapidly through the experience using its native CSS visual language and GPT-generated imagery. End card: “From one prompt to a world you can explore.”

## Asset loading verification

The local Vite page renders the ABYSSAL hero correctly from the repository image, but all eight `/manus-storage/` creature references fail to resolve in the current sandbox session (`naturalWidth = 0`, HTTP 500). The video should therefore use the local GPT-generated hero asset as the primary visual and create any missing close-up marine imagery as new, self-contained generation assets rather than depend on the expired Forge proxy.
