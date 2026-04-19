/**
 * 把 ```mermaid 围栏转成 <Mermaid client:only="react" chart={...} />
 * 第一次出现时自动注入 import，避免每篇文章都要手写一行 import。
 */

const COMPONENT_NAME = "Mermaid";
const COMPONENT_SOURCE = "@pkg/theme/components/interactive/Mermaid";

function importEsm() {
  return {
    type: "mdxjsEsm",
    value: `import ${COMPONENT_NAME} from "${COMPONENT_SOURCE}";`,
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ImportDeclaration",
            specifiers: [
              {
                type: "ImportDefaultSpecifier",
                local: { type: "Identifier", name: COMPONENT_NAME },
              },
            ],
            source: {
              type: "Literal",
              value: COMPONENT_SOURCE,
              raw: JSON.stringify(COMPONENT_SOURCE),
            },
          },
        ],
      },
    },
  };
}

function jsxFlowElement(chart) {
  return {
    type: "mdxJsxFlowElement",
    name: COMPONENT_NAME,
    attributes: [
      { type: "mdxJsxAttribute", name: "client:only", value: "react" },
      { type: "mdxJsxAttribute", name: "chart", value: chart },
    ],
    children: [],
  };
}

export default function remarkMermaid() {
  return (tree) => {
    let hit = false;
    let imported = false;

    const walk = (nodes) => {
      if (!Array.isArray(nodes)) return;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === "code" && node.lang === "mermaid") {
          nodes[i] = jsxFlowElement(node.value ?? "");
          hit = true;
          continue;
        }
        if (
          node.type === "mdxjsEsm" &&
          typeof node.value === "string" &&
          node.value.includes(COMPONENT_SOURCE)
        ) {
          imported = true;
        }
        if (node.children) walk(node.children);
      }
    };

    walk(tree.children);
    if (hit && !imported) tree.children.unshift(importEsm());
  };
}
