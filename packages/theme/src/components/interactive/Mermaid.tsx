import { useEffect, useRef, useState } from "react";

interface Props {
  chart: string;
}

export default function Mermaid({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = document.documentElement.classList.contains("dark");

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          themeVariables: isDark
            ? {
                primaryColor: "#1c1f26",
                primaryTextColor: "#efeff1",
                primaryBorderColor: "#656a76",
                lineColor: "#656a76",
                secondaryColor: "#15181e",
                tertiaryColor: "#0d0e12",
              }
            : {
                primaryColor: "#f1f2f3",
                primaryTextColor: "#000000",
                primaryBorderColor: "#d5d7db",
                lineColor: "#3b3d45",
                secondaryColor: "#ffffff",
                tertiaryColor: "#f1f2f3",
              },
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 14,
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(rendered);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }

    renderChart();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div
        style={{
          padding: "16px",
          borderRadius: "8px",
          background: "var(--bg-secondary)",
          color: "var(--text-helper)",
          fontSize: "14px",
          fontFamily: "var(--font-mono)",
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>Mermaid Error</p>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        margin: "1.5rem 0",
        display: "flex",
        justifyContent: "center",
        overflow: "auto",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
