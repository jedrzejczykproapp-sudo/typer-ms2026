import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Favicon grid pattern (from favicon-dark.svg, 32×32 canvas).
// Each entry is [col_x, row_y] in the original 32-px coordinate system.
// Dots are 2×2 px blocks; grid pitch is 4 px.
const DOTS: [number, number][] = [
    // col x=8
    [8, 8], [8, 12],
    // col x=12
    [12, 4], [12, 8], [12, 12], [12, 16], [12, 20], [12, 24],
    // col x=16
    [16, 4], [16, 8], [16, 12], [16, 16], [16, 20], [16, 24], [16, 28],
    // col x=20
    [20, 8], [20, 12], [20, 24], [20, 28],
    // col x=24
    [24, 8], [24, 12], [24, 24], [24, 28],
];

// Scale from 32-px canvas to 180-px icon
const SCALE = 180 / 32;
const DOT = Math.round(2 * SCALE);      // dot size ≈ 11 px
const RADIUS = Math.round(DOT * 0.35);  // corner radius

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 180,
                    height: 180,
                    background: "#0f0720",
                    display: "flex",
                    position: "relative",
                }}
            >
                {DOTS.map(([cx, cy]) => (
                    <div
                        key={`${cx}-${cy}`}
                        style={{
                            position: "absolute",
                            left: Math.round(cx * SCALE),
                            top: Math.round(cy * SCALE),
                            width: DOT,
                            height: DOT,
                            background: "#ffffff",
                            borderRadius: RADIUS,
                        }}
                    />
                ))}
            </div>
        ),
        { width: 180, height: 180 },
    );
}
