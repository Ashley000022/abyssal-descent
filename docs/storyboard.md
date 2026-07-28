# Manus Commercial Video — ABYSSAL Storyboard

## Format
- **Duration:** 24.0 seconds (720 frames @ 30fps)
- **Resolution:** 1920x1080 (16:9)
- **Background:** Manus Blobs with dynamic seed, slowly drifting

## Scene 01: The Prompt (0:00 - 0:04)
- **Visuals:** Center stage, Manus InputBox appears. Typewriter effect inputs the prompt: "Create an immersive descent to the deepest place on Earth. Use bioluminescence and live telemetry."
- **Motion:** InputBox springs in from bottom (`fadeUp`). Prompt types out quickly. A glowing "Generate" button is clicked.
- **Audio/VFX:** Typing sounds, soft click.
- **Assets:** `InputBox` component (to be recreated or stubbed based on Manus guidelines), `Blobs` background.

## Scene 02: The Agent in Action (0:04 - 0:08)
- **Visuals:** The InputBox transitions into the `AgentTask` card.
- **Text:** Title: "Building ABYSSAL".
- **Streaming steps:** 
  1. "Scaffolding deep-sea interactive experience..."
  2. "Applying telemetry HUD and depth rail..."
  3. "Generating GPT bioluminescent creatures..."
  4. "Finalizing pressure physics..."
- **Motion:** Steps appear sequentially with green checkmarks. Progress bar fills.
- **Assets:** `AgentTask` component logic, `icons` (checkmarks, spinner).

## Scene 03: The Artifact Delivery (0:08 - 0:11)
- **Visuals:** The `AgentTask` resolves into an `ArtifactDelivery` card or directly opens the `ProjectPage` layout.
- **Text:** "App deployed successfully." A large thumbnail of the ABYSSAL hero image (`hero-abyssal.png`) appears inside the artifact window.
- **Motion:** The artifact window scales up to fill the 1366x768 inner stage, pushing the Manus chrome (sidebar, top bar) to the edges.

## Scene 04: The Descent (0:11 - 0:21)
- **Visuals:** The inner stage is now a full HTML/CSS recreation of the ABYSSAL experience, running within Remotion.
- **Action:** We simulate a rapid, smooth scroll from the surface (0m) down to Challenger Deep (10,935m).
- **Key moments:**
  - 0:11 (0m): Teal surface, "ABYSSAL" title, pulse effect.
  - 0:14 (700m): Twilight zone, comb jelly (`03_comb_jelly_e190f3a8.png`) swims in. HUD numbers blur past.
  - 0:16 (2400m): Midnight zone, giant squid eye (`05_giant_squid_aa20fccb.png`) appears from the dark.
  - 0:18 (7600m): Hadal zone, snailfish (`07_snailfish_ae1054b9.png`) floats by. Colors shift to deep purple/black.
  - 0:20 (10,935m): Bottom reached. "CHALLENGER DEEP".
- **Assets:** Remotion `IFrame` or native React port of `index.html` CSS logic. The telemetry numbers will be driven by the current frame number using `interpolate`.

## Scene 05: The End Card (0:21 - 0:24)
- **Visuals:** The deep sea fades to the Manus brand background. The `CoBrandLockup` or a simple Manus logo appears in the center.
- **Text:** "From one prompt to a world you can explore." (SANS)
- **Wordmark:** **manus** (SERIF: Libre Baskerville Bold).
- **Motion:** Fade in, slight scale up.
