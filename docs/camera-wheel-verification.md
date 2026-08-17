# Camera Chord Wheel verification

| Check | Result |
|---|---|
| Camera mode navigation | Passed. The header control lazy-loads the camera instrument without affecting the keyboard instrument. |
| Idle wheel rendering | Passed. All twelve circle-of-fifths chord segments, onboarding, privacy notice, HUD frame, and status footer render correctly. |
| Camera permission flow | Passed for error handling. The sandbox browser exposes no webcam device, so `getUserMedia` returns an error and the UI remains usable with a clear Japanese failure status and retry button. |
| TypeScript and production build | Passed after MediaPipe integration. |
| Real-device requirement | Final hand-landmark acquisition requires a physical camera in Chrome, Edge, or Safari over HTTPS. The implementation uses MediaPipe Hand Landmarker on-device and does not upload camera frames. |

The direct URL `/?mode=camera` was also verified at a 390×844 viewport. The camera permission CTA, privacy copy, safe-area framing, and status footer remain readable without horizontal overflow. The MediaPipe hand model and WASM loader both returned HTTP 200; GET responses expose permissive CORS headers required for browser loading. Circle-segment unit tests cover all twelve reachable chords and the inner/outer dead zones.
