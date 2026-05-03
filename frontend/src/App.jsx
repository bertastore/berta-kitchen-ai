import { useState, useEffect, useRef } from "react";

const appStyle = {
  fontFamily: '"Open Sans", sans-serif',
};

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const summaryBodyStyle = {
  fontSize: 14,
  lineHeight: 1.6,
};

const summarySectionStyle = {
  background: "#f7f7f7",
  borderRadius: 10,
  padding: 14,
  marginBottom: 14,
  textAlign: "left",
};

const sectionHeadingStyle = {
  fontSize: "1rem",
  margin: "0 0 8px 0",
  color: "#333",
};

const materialLabels = {
  plywood34: '4x8 Plywood 3/4"',
  plywood14: '4x8 Plywood 1/4"',
  drawerSlides: "Drawer Slides",
  hinges: "Hinges",
  edgeBanding: "Edge Banding",
  wasteFactor: "Waste Factor",
};

const EXAMPLE_PROMPTS = {
  basic:
    "L-shaped kitchen 14x12, sink on left, dishwasher, stove, fridge",
  door: "L-shaped kitchen 14x12, sink on left, dishwasher, stove, fridge, door on wall A starts at 90 inches and is 30 inches wide",
  window:
    "L-shaped kitchen 14x12, sink on left under window, dishwasher, stove, fridge, window on wall A starts at 36 inches and is 42 inches wide",
};

const examplePromptButtonStyle = {
  background: "transparent",
  border: "1px solid #444",
  color: "#ccc",
  borderRadius: 20,
  padding: "8px 12px",
  margin: 5,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
};

function buildPlanCopyText(plan) {
  const lines = [];
  lines.push("Summary");
  lines.push(`Shape: ${plan.summary?.shape ?? "—"}`);
  lines.push(`Linear Feet: ${plan.summary?.linearFeet ?? "—"} ft`);
  lines.push("");
  lines.push("Materials");
  for (const [key, value] of Object.entries(plan.materials || {})) {
    lines.push(`${materialLabels[key] || key}: ${value}`);
  }
  lines.push("");
  lines.push("Layout Items");
  for (const wall of plan.layout || []) {
    lines.push(`Wall ${wall.wall}`);
    for (const item of wall.items || []) {
      lines.push(
        `${item.name || item.type} | Width: ${item.width}" | Position: ${item.start}"–${item.end}"`,
      );
    }
  }
  lines.push("");
  lines.push("Warnings");
  if (plan.warnings?.length) {
    for (const w of plan.warnings) {
      lines.push(`- ${w}`);
    }
  } else {
    lines.push("None");
  }
  lines.push("");
  lines.push("Cabinet List");
  if (plan.cabinetList?.length) {
    for (const row of plan.cabinetList) {
      lines.push(`- ${row.name} — qty ${row.qty}`);
    }
  } else {
    lines.push("None");
  }
  return lines.join("\n");
}

function App() {
  const [input, setInput] = useState("");
  const [svg, setSvg] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [narrowViewport, setNarrowViewport] = useState(false);
  const [copyButtonLabel, setCopyButtonLabel] = useState("Copy Results");
  const [currentRequest, setCurrentRequest] = useState("");
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please describe your kitchen first.");
      return;
    }

    setCurrentRequest("");

    setLoading(true);
    setError("");
    setSvg("");
    setPlan(null);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setCopyButtonLabel("Copy Results");

    try {
      const res = await fetch("https://project-sw819-git-main-sales-3536s-projects.vercel.app/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      setSvg(data.svg);
      setPlan(data.plan);
      setCurrentRequest(input);
      setCopyButtonLabel("Copy Results");
    } catch {
      setError("Something went wrong. Please try again.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPlan = () => {
    setInput("");
    setSvg("");
    setPlan(null);
    setError("");
    setLoading(false);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setCopyButtonLabel("Copy Results");
    setCurrentRequest("");
  };

  const buttonStyle = {
    background: "#E13124",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "12px 20px",
    cursor: loading ? "not-allowed" : "pointer",
    fontSize: 15,
    fontWeight: 600,
    opacity: loading ? 0.85 : 1,
  };

  const handleCopyResults = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(buildPlanCopyText(plan));
      setCopyButtonLabel("Copied!");
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopyButtonLabel("Copy Results");
        copyTimeoutRef.current = null;
      }, 2000);
    } catch {
      // clipboard may be denied; leave label unchanged
    }
  };

  const handleDownloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kitchen-layout.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const outlineButtonStyle = {
    background: "#fff",
    color: "#E13124",
    border: "1px solid #E13124",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const newPlanButtonStyle = {
    background: "transparent",
    color: "#fff",
    border: "1px solid #555",
    marginLeft: 10,
    padding: "12px 20px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 600,
  };

  return (
    <div style={appStyle}>
      <style>{`
        @media screen {
          .app-print-only {
            display: none !important;
          }
        }
        @media screen and (max-width: 767px) {
          .app-svg-host svg {
            display: block;
            max-width: none !important;
            width: auto !important;
            height: auto;
          }
        }
        @media print {
          .app-no-print {
            display: none !important;
          }
          .app-print-only {
            display: block !important;
            color: #000;
            font-size: 18pt;
            font-weight: 700;
            margin: 0 0 16px 0;
            text-align: left;
          }
          .app-print-root {
            background: #fff !important;
            padding: 0 !important;
          }
          .app-print-grid {
            display: grid !important;
            grid-template-columns: 1.2fr 1fr !important;
            gap: 16px !important;
            max-width: 100% !important;
            margin: 0 !important;
            align-items: start !important;
          }
          .app-print-card {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          body,
          html {
            background: #fff !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <div
        className="app-no-print"
        style={{
          background: "#111",
          color: "#fff",
          padding: narrowViewport ? "16px 14px" : "25px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "1.75rem",
              color: "#fff",
              fontWeight: 600,
              letterSpacing: "1px",
            }}
          >
            Kitchen Layout Planner
          </h1>
          <strong
            style={{
              display: "block",
              color: "#aaa",
              fontSize: 16,
              marginTop: 10,
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            Design your kitchen layout in seconds — cabinets, appliances, and
            materials calculated automatically.
          </strong>

          <textarea
            rows={4}
            placeholder="Describe your kitchen..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              maxWidth: narrowViewport ? "100%" : 700,
              padding: 12,
              borderRadius: 6,
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              fontSize: 15,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
              margin: "0 auto",
              display: "block",
            }}
          />

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "center",
              alignItems: narrowViewport ? "stretch" : "center",
              flexWrap: "wrap",
              flexDirection: narrowViewport ? "column" : "row",
              gap: narrowViewport ? 10 : 0,
              width: "100%",
              maxWidth: narrowViewport ? "100%" : undefined,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                ...buttonStyle,
                ...(narrowViewport ? { width: "100%", boxSizing: "border-box" } : {}),
              }}
            >
              {loading ? "Generating..." : "Generate Kitchen"}
            </button>
            <button
              type="button"
              onClick={handleNewPlan}
              style={{
                ...newPlanButtonStyle,
                ...(narrowViewport
                  ? { marginLeft: 0, width: "100%", boxSizing: "border-box" }
                  : {}),
              }}
            >
              New Plan
            </button>
          </div>

          <div
            style={{
              maxWidth: narrowViewport ? "100%" : 700,
              margin: "10px auto 0",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: narrowViewport ? 8 : 0,
              width: narrowViewport ? "100%" : undefined,
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={() => setInput(EXAMPLE_PROMPTS.basic)}
              style={examplePromptButtonStyle}
            >
              Basic L-Shape
            </button>
            <button
              type="button"
              onClick={() => setInput(EXAMPLE_PROMPTS.door)}
              style={examplePromptButtonStyle}
            >
              With Door
            </button>
            <button
              type="button"
              onClick={() => setInput(EXAMPLE_PROMPTS.window)}
              style={examplePromptButtonStyle}
            >
              With Window
            </button>
          </div>

          <div
            style={{
              maxWidth: narrowViewport ? "100%" : 700,
              margin: "12px auto 0",
              background: "#151515",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              padding: 14,
              color: "#aaa",
              textAlign: "left",
              fontSize: 13,
              lineHeight: 1.5,
              opacity: 0.9,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "#ccc",
                marginBottom: 10,
              }}
            >
              How to describe your kitchen
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
              }}
            >
              <li style={{ marginBottom: 6 }}>
                Kitchen shape: L-shaped, straight, or U-shaped
              </li>
              <li style={{ marginBottom: 6 }}>Size: example 14x12</li>
              <li style={{ marginBottom: 6 }}>
                Sink position: left, right, or under window
              </li>
              <li style={{ marginBottom: 6 }}>
                Appliances: dishwasher, stove, fridge
              </li>
              <li style={{ marginBottom: 0 }}>
                Obstacles: door or window with wall, start position, and width
              </li>
            </ul>
          </div>

          {error ? (
            <div style={{ color: "#ff8a80", marginTop: 12, fontSize: 14 }}>
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {plan ? (
        <div
          className="app-print-root"
          style={{
            background: "#f7f7f7",
            padding: narrowViewport ? "0 12px 32px" : "0 20px 40px",
          }}
        >
          <h1 className="app-print-only">Kitchen Layout Plan</h1>
          {currentRequest ? (
            <div
              className="app-no-print"
              style={{
                maxWidth: 1100,
                margin: "20px auto 0",
              }}
            >
              <div
                style={{
                  color: "#aaa",
                  fontSize: 12,
                  marginBottom: 4,
                  textAlign: "left",
                }}
              >
                Current Plan Based On:
              </div>
              <div
                style={{
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 12,
                  maxWidth: 1100,
                  margin: "0 auto",
                  color: "#333",
                  textAlign: "left",
                }}
              >
                {currentRequest}
              </div>
            </div>
          ) : null}

          <div
            className="app-print-grid"
            style={{
              display: "grid",
              gridTemplateColumns: narrowViewport ? "1fr" : "2fr 1fr",
              gap: narrowViewport ? 16 : 24,
              maxWidth: 1100,
              width: "100%",
              margin: "24px auto 0",
              alignItems: "start",
              boxSizing: "border-box",
            }}
          >
            <div
              className="app-print-card"
              style={{
                ...cardStyle,
                ...(narrowViewport ? { padding: 14, width: "100%", minWidth: 0 } : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: "1.1rem",
                    margin: 0,
                    color: "#1a1a1a",
                  }}
                >
                  Layout Drawing
                </h2>
                <div
                  className="app-no-print"
                  style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                >
                  {svg ? (
                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      style={outlineButtonStyle}
                    >
                      Download SVG
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    style={outlineButtonStyle}
                  >
                    Export PDF
                  </button>
                </div>
              </div>
              <div
                style={{
                  overflowX: "auto",
                  width: "100%",
                  display: "block",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <div
                  className="app-svg-host"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            </div>

            <div
              className="app-print-card"
              style={{
                ...cardStyle,
                textAlign: "left",
                ...(narrowViewport ? { padding: 14, width: "100%", minWidth: 0 } : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: "1.1rem",
                    margin: 0,
                    color: "#1a1a1a",
                  }}
                >
                  Project Summary
                </h2>
                <div className="app-no-print">
                  <button
                    type="button"
                    onClick={handleCopyResults}
                    style={outlineButtonStyle}
                  >
                    {copyButtonLabel}
                  </button>
                </div>
              </div>

              <div style={summarySectionStyle}>
                <h3 style={sectionHeadingStyle}>Summary</h3>
                <p
                  style={{
                    margin: "4px 0",
                    textAlign: "left",
                    ...summaryBodyStyle,
                    color: "#333",
                  }}
                >
                  Shape: {plan.summary?.shape ?? "—"}
                </p>
                <p
                  style={{
                    margin: "4px 0",
                    textAlign: "left",
                    ...summaryBodyStyle,
                    color: "#333",
                  }}
                >
                  Linear Feet: {plan.summary?.linearFeet ?? "—"} ft
                </p>
              </div>

              <div style={summarySectionStyle}>
                <h3 style={sectionHeadingStyle}>Materials</h3>
                {Object.entries(plan.materials || {}).map(([key, value]) => (
                  <p
                    key={key}
                    style={{
                      margin: "4px 0",
                      textAlign: "left",
                      ...summaryBodyStyle,
                      color: "#333",
                    }}
                  >
                    <strong>{materialLabels[key] || key}:</strong> {value}
                  </p>
                ))}
              </div>

              <div style={summarySectionStyle}>
                <h3 style={sectionHeadingStyle}>Layout Items</h3>
                {(plan.layout || []).map((wall) => (
                  <div key={wall.wall} style={{ textAlign: "left" }}>
                    <p
                      style={{
                        marginTop: 10,
                        marginBottom: 4,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        ...summaryBodyStyle,
                      }}
                    >
                      Wall {wall.wall}
                    </p>
                    {(wall.items || []).map((item, j) => (
                      <p
                        key={j}
                        style={{
                          margin: "0 0 6px 0",
                          textAlign: "left",
                          color: "#333",
                          ...summaryBodyStyle,
                        }}
                      >
                        {`${item.name || item.type} | Width: ${item.width}" | Position: ${item.start}"–${item.end}"`}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              <div style={summarySectionStyle}>
                <h3 style={sectionHeadingStyle}>Warnings</h3>
                {plan.warnings?.length ? (
                  <ul
                    style={{
                      margin: "8px 0",
                      paddingLeft: 20,
                      textAlign: "left",
                      listStylePosition: "outside",
                      ...summaryBodyStyle,
                      color: "#333",
                    }}
                  >
                    {plan.warnings.map((w, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      margin: "4px 0",
                      textAlign: "left",
                      ...summaryBodyStyle,
                      color: "#333",
                    }}
                  >
                    None
                  </p>
                )}
              </div>

              <div style={summarySectionStyle}>
                <h3 style={sectionHeadingStyle}>Cabinet List</h3>
                {plan.cabinetList?.length ? (
                  <ul
                    style={{
                      margin: "8px 0",
                      paddingLeft: 20,
                      textAlign: "left",
                      listStylePosition: "outside",
                      ...summaryBodyStyle,
                      color: "#333",
                    }}
                  >
                    {plan.cabinetList.map((row, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {row.name} — qty {row.qty}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      margin: "4px 0",
                      textAlign: "left",
                      ...summaryBodyStyle,
                      color: "#333",
                    }}
                  >
                    None
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
