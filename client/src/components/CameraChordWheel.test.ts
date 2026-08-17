import { describe, expect, it } from "vitest";
import { getChordAtPoint, getWheelGeometry } from "./CameraChordWheel";

describe("CameraChordWheel geometry", () => {
  const geometry = getWheelGeometry(1000, 800);
  const radius = (geometry.innerRadius + geometry.outerRadius) / 2;

  it("maps cardinal points to the expected circle-of-fifths segments", () => {
    expect(getChordAtPoint(geometry.centerX, geometry.centerY - radius, geometry)).toBe("C");
    expect(getChordAtPoint(geometry.centerX + radius, geometry.centerY, geometry)).toBe("A");
    expect(getChordAtPoint(geometry.centerX, geometry.centerY + radius, geometry)).toBe("F#");
    expect(getChordAtPoint(geometry.centerX - radius, geometry.centerY, geometry)).toBe("Eb");
  });

  it("returns null inside the center and outside the wheel", () => {
    expect(getChordAtPoint(geometry.centerX, geometry.centerY, geometry)).toBeNull();
    expect(
      getChordAtPoint(geometry.centerX, geometry.centerY - geometry.outerRadius - 1, geometry),
    ).toBeNull();
  });

  it("keeps all twelve segment labels reachable", () => {
    const reached = new Set<string>();
    for (let index = 0; index < 12; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI / 6) + Math.PI / 12;
      reached.add(
        getChordAtPoint(
          geometry.centerX + Math.cos(angle) * radius,
          geometry.centerY + Math.sin(angle) * radius,
          geometry,
        ) ?? "",
      );
    }

    expect(reached).toEqual(new Set(["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]));
  });
});
