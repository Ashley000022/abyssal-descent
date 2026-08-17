# STRUMKEY verification notes

Verified on 2026-08-17 using the live WebDev preview.

- Desktop composition renders without horizontal overflow at the default sandbox viewport (`horizontalOverflow: 0`).
- Pressing `A` in Main Chords changes the current chord to `C` and activates the Web Audio engine (`AUDIO LIVE`).
- Switching to the JANNABI set reveals the capo control, song context, chorus loop, and all 11 mapped chords.
- With capo 3 enabled, displayed concert-pitch labels transpose correctly (for example, `G` sounds as `Bb`, `Cm` sounds as `Ebm`).
- Pressing `Shift+F` in the JANNABI set selects `Cm`, produces an upstroke, and leaves no runtime error toast.
- DOM inspection confirmed the selected strum direction is `UP`, the current chord is `Cm`, and the audio status is live.
