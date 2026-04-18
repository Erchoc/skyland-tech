import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  content: string;
  title: string;
}

export default function SlideViewer({ content, title }: Props) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  // Split by <hr> tags
  const slides = content
    .split(/<hr\s*\/?>/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Add title slide at the beginning
  const allSlides = [
    `<h1 style="font-size: clamp(2rem, 5vw, 4rem); font-weight: 600; line-height: 1.17;">${title}</h1>`,
    ...slides,
  ];

  const total = allSlides.length;

  const goTo = useCallback((n: number) => setCurrent(Math.max(0, Math.min(n, total - 1))), [total]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prev();
          break;
        case "f":
        case "F":
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case "Escape":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  // Touch support
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#15181e",
        color: "#efeff1",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "clamp(24px, 5vw, 80px)",
          overflow: "auto",
        }}
      >
        <div
          key={current}
          className="article-prose"
          style={{
            maxWidth: "900px",
            width: "100%",
            margin: "auto 0",
            color: "#efeff1",
            animation: "slideIn 0.3s ease",
          }}
          dangerouslySetInnerHTML={{ __html: allSlides[current] }}
        />
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderTop: "1px solid rgba(97, 104, 117, 0.3)",
          fontSize: "13px",
          color: "#656a76",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={prev}
            disabled={current === 0}
            style={{
              background: "none",
              border: "none",
              color: current === 0 ? "#3b3d45" : "#d5d7db",
              cursor: current === 0 ? "default" : "pointer",
              padding: "4px 8px",
              fontSize: "13px",
            }}
          >
            ← Prev
          </button>
          <button
            onClick={next}
            disabled={current === total - 1}
            style={{
              background: "none",
              border: "none",
              color: current === total - 1 ? "#3b3d45" : "#d5d7db",
              cursor: current === total - 1 ? "default" : "pointer",
              padding: "4px 8px",
              fontSize: "13px",
            }}
          >
            Next →
          </button>
        </div>
        <div>
          <span style={{ color: "#d5d7db" }}>{current + 1}</span> / {total}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span>← → Navigate</span>
          <span>·</span>
          <span>F Fullscreen</span>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
