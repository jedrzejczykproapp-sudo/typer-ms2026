import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? null;
    const avatarUrl = url.searchParams.get("avatar") ?? null;

    // Load Inter font (covers Polish characters)
    const fontData = await fetch(
        "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
    )
        .then((r) => r.arrayBuffer())
        .catch(() => null);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(145deg, #0d0720 0%, #1c0d4a 45%, #0d0720 100%)",
                    padding: "60px",
                    gap: "28px",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                {/* Avatar or default icon */}
                {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        width={128}
                        height={128}
                        style={{
                            borderRadius: "28px",
                            objectFit: "cover",
                            border: "3px solid rgba(127,86,217,0.5)",
                            boxShadow: "0 0 40px rgba(127,86,217,0.35)",
                        }}
                        alt=""
                    />
                ) : (
                    <div
                        style={{
                            width: 128,
                            height: 128,
                            borderRadius: 28,
                            background: "rgba(127,86,217,0.18)",
                            border: "3px solid rgba(127,86,217,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 64,
                        }}
                    >
                        ⚽
                    </div>
                )}

                {/* Text block */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <p
                        style={{
                            fontSize: 18,
                            color: "rgba(255,255,255,0.45)",
                            margin: 0,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            fontWeight: 500,
                        }}
                    >
                        zaproszenie do grupy
                    </p>
                    <p
                        style={{
                            fontSize: name && name.length > 20 ? 44 : 56,
                            fontWeight: 700,
                            color: "#ffffff",
                            margin: 0,
                            textAlign: "center",
                            lineHeight: 1.1,
                            maxWidth: 900,
                        }}
                    >
                        {name ?? "Typerek"}
                    </p>
                </div>

                {/* Typerek brand badge */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 36,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "rgba(127,86,217,0.15)",
                        border: "1px solid rgba(127,86,217,0.35)",
                        borderRadius: 999,
                        padding: "8px 20px",
                    }}
                >
                    <p
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: "rgba(167,139,250,0.95)",
                            margin: 0,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        typerek
                    </p>
                    <p
                        style={{
                            fontSize: 16,
                            color: "rgba(255,255,255,0.35)",
                            margin: 0,
                        }}
                    >
                        typerek.com
                    </p>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            fonts: fontData
                ? [{ name: "Inter", data: fontData, weight: 700, style: "normal" }]
                : [],
        },
    );
}
