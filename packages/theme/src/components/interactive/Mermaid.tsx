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
                // base —— 用作节点底色 / 文字 / 默认连线
                primaryColor: "#2a2e38",
                primaryTextColor: "#f4f5f7",
                primaryBorderColor: "#8790a2",
                lineColor: "#a8b0c0",
                secondaryColor: "#1c1f26",
                tertiaryColor: "#15181e",

                // flowchart / graph
                mainBkg: "#2a2e38",
                nodeBorder: "#8790a2",
                nodeTextColor: "#f4f5f7",
                clusterBkg: "#1c1f26",
                clusterBorder: "#3b3d45",
                defaultLinkColor: "#a8b0c0",
                titleColor: "#f4f5f7",
                edgeLabelBackground: "#15181e",

                // sequenceDiagram —— 图 15 里偏灰的 actor / signal / note 都靠这组变量
                actorBkg: "#2a2e38",
                actorBorder: "#8790a2",
                actorTextColor: "#f4f5f7",
                actorLineColor: "#6f9cff",
                signalColor: "#c8ccd5",
                signalTextColor: "#f4f5f7",
                labelBoxBkgColor: "#2a2e38",
                labelBoxBorderColor: "#8790a2",
                labelTextColor: "#f4f5f7",
                loopTextColor: "#c8ccd5",
                activationBkgColor: "#3b3d45",
                activationBorderColor: "#8790a2",
                // Note：原 mermaid dark 默认是扎眼的明黄；改成暗金底 + 柔和黄字，和 slides 背景协调
                noteBkgColor: "#2a2413",
                noteBorderColor: "#8a6a12",
                noteTextColor: "#f0e9c2",
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

        /**
         * 字体一致性修复：
         * mermaid 在测量节点文字宽度时使用 `fontFamily` 配置（system-ui），
         * 但输出的 SVG <text> 和 <foreignObject> 内 HTML 会继承父容器字体。
         * 如果父容器（.article-prose / .slide）的 body 字体是 LXGW 文楷，
         * 实际渲染宽度会 > 测量宽度，节点 rect 装不下文字 → 文字被截断。
         *
         * 解决：把 SVG 根 <svg> 上加 inline font-family=system-ui，
         * 让 SVG 内部所有 text / foreignObject 继承相同字体，和 mermaid 测量一致。
         */
        const fontFamily =
          "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        const patched = rendered.replace(
          /<svg\b([^>]*?)>/i,
          (_m, attrs) => `<svg${attrs} style="font-family:${fontFamily};">`,
        );

        if (!cancelled) {
          setSvg(patched);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }

    renderChart();
    return () => {
      cancelled = true;
    };
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
      className="mermaid-render"
      style={{
        margin: "1.5rem 0",
        display: "flex",
        justifyContent: "center",
        overflow: "auto",
        // 容器级字体：foreignObject 里 HTML 元素会从最近的 CSS 祖先继承 font-family
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid 渲染器输出的 SVG 字符串，必须通过 innerHTML 挂载；SVG 来源是 mermaid 编译 trusted markdown，无 XSS 风险
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
