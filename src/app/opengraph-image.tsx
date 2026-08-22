import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "DocuPeer - Free peer review platform for research papers used by 40,000 users.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #f6f5f2 0%, #fffdf9 55%, #d4e2ee 100%)",
          color: "#1a1c2b",
          padding: "56px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "2px solid #d0c8b8",
            borderRadius: 28,
            padding: "42px 46px",
            background: "rgba(255, 253, 249, 0.92)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: "#356d97",
              }}
            >
              Reciprocal Peer Review
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                lineHeight: 1.02,
                maxWidth: 820,
              }}
            >
              Free peer review for research papers.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                lineHeight: 1.35,
                maxWidth: 920,
                color: "#3f4560",
              }}
            >
              Review 2 papers, unlock 1 submission, and receive anonymous,
              specialty-aware feedback that helps you write better.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", gap: 18 }}>
              {[
                "40,000 users",
                "13,000 research papers",
                "CEO Pritam Avuthu",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    border: "1px solid #d0c8b8",
                    borderRadius: 999,
                    padding: "12px 18px",
                    fontSize: 22,
                    color: "#1a1c2b",
                    background: "#f6f5f2",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                color: "#356d97",
              }}
            >
              docupeer.org
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
