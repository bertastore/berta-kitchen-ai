function getItemColor(type) {
  switch (type) {
    case "sink":
      return "#4FC3F7";
    case "dishwasher":
      return "#81C784";
    case "stove":
      return "#FF8A65";
    case "fridge":
      return "#BA68C8";
    case "lazy_susan":
      return "#E8D9A8";
    case "door":
      return "#E57373";
    case "window":
      return "#64B5F6";
    case "filler":
      return "#BDBDBD";
    case "base":
      return "#D7CCC8";
    default:
      return "#E0E0E0";
  }
}

function getShortLabel(item) {
  switch (item.type) {
    case "sink": return "Sink";
    case "dishwasher": return "DW";
    case "stove": return "Stove";
    case "fridge": return "Fridge";
    case "lazy_susan": return "Lazy Susan";
    case "door": return "Door";
    case "window": return "Window";
    case "filler": return "Filler";
    case "base": return "Base";
    case "upper": return "Upper";
    case "hood_space": return "Hood";
    default: return item.type || "Item";
  }
}

function drawLegend() {
  const items = [
    { label: "Sink", color: "#4FC3F7" },
    { label: "DW", color: "#81C784" },
    { label: "Stove", color: "#FF8A65" },
    { label: "Fridge", color: "#BA68C8" },
    { label: "Lazy Susan", color: "#E8D9A8" },
    { label: "Base", color: "#D7CCC8" },
    { label: "Upper", color: "#90CAF9" },
    { label: "Door", color: "#E57373" },
    { label: "Filler", color: "#BDBDBD" }
  ];

  let legend = `
    <text x="600" y="30" font-size="14" font-weight="bold">Legend</text>
  `;

  items.forEach((item, index) => {
    const y = 50 + index * 24;

    legend += `
      <rect x="600" y="${y}" width="16" height="16" fill="${item.color}" stroke="#000"/>
      <text x="625" y="${y + 13}" font-size="12" fill="#000">${item.label}</text>
    `;
  });

  return legend;
}

function fmtInchesForLabel(n) {
  if (n == null || !Number.isFinite(n)) return "";
  return Math.abs(n - Math.round(n)) < 0.01 ? String(Math.round(n)) : n.toFixed(1);
}

function generateKitchenSVG(plan) {
  const SCALE = 2;
  const svgWidth = 800;
  const svgHeight = 600;
  const BASE_Y = 150;
  const UPPER_Y = 90;
  const WALL_B_OFFSET_X = 40;
  const GAP = 20;

  let svg = `
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
`;

  svg += `
  <text x="300" y="25" font-size="16" font-weight="bold" text-anchor="middle" fill="#000">
    Kitchen Layout Plan
  </text>

  <text x="300" y="45" font-size="12" text-anchor="middle" fill="#000">
    Shape: ${plan.summary.shape} | Linear Feet: ${plan.summary.linearFeet} ft
  </text>
`;

  const wallA = plan.layout.find((w) => w.wall === "A");
  const wallALength =
    wallA && wallA.items.length > 0
      ? wallA.items[wallA.items.length - 1].end * SCALE
      : 0;

  const wallB = plan.layout.find((w) => w.wall === "B");
  const wallBHeight =
    wallB && wallB.items.length > 0
      ? wallB.items[wallB.items.length - 1].end * SCALE
      : 0;

  const wallAEndInches =
    wallA && wallA.items.length > 0
      ? wallA.items[wallA.items.length - 1].end
      : null;
  const wallBEndInches =
    wallB && wallB.items.length > 0
      ? wallB.items[wallB.items.length - 1].end
      : null;

  const totalA = plan.summary?.wallAOriginal;
  const totalB = plan.summary?.wallBOriginal;
  const usableA = plan.summary?.wallAUsable;
  const usableB = plan.summary?.wallBUsable;

  const wallABaseLineY = BASE_Y + 60;
  svg += `
  <line x1="0" y1="${wallABaseLineY}" x2="${wallALength}" y2="${wallABaseLineY}" stroke="#000" stroke-width="3"/>
`;
  if (wallB && wallB.items.length > 0) {
    const wallBX = wallALength + GAP;
    svg += `
  <line x1="${wallBX}" y1="${BASE_Y}" x2="${wallBX}" y2="${BASE_Y + wallBHeight}" stroke="#000" stroke-width="3"/>
`;
  }

  svg += `
  <text x="0" y="${UPPER_Y - 10}" font-size="14" font-weight="bold" fill="#000">
    Wall A
  </text>

  <text x="${wallALength + GAP}" y="${BASE_Y - 25}" font-size="14" font-weight="bold" fill="#000">
    Wall B
  </text>
`;

  if (wallA) {
    wallA.items.forEach((item) => {
      const x = item.start * SCALE;
      const y = BASE_Y;
      const width = item.width * SCALE;
      const height = 60;
      const skipCenterLabel = item.type === "filler" && item.width <= 4;

      svg += `
      <rect 
        x="${x}" 
        y="${y}" 
        width="${width}" 
        height="${height}" 
        fill="${getItemColor(item.type)}" 
        stroke="#000"
      />
      ${
        skipCenterLabel
          ? ""
          : `
      <text
        x="${x + width / 2}"
        y="${y + height / 2}"
        font-size="11"
        fill="#000"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        ${getShortLabel(item)}
      </text>`
      }
    `;
    });
  }

  if (plan.summary && plan.summary.shape === "L") {
    const cornerSize = 36 * SCALE;
    const cx = wallALength + GAP;
    const cy = BASE_Y;
    const cornerType = plan.cornerCabinet?.type || "corner";
    const cornerLabel =
      cornerType === "lazy_susan" ? "Lazy Susan" : "Corner";
    svg += `
      <rect
        x="${cx}"
        y="${cy}"
        width="${cornerSize}"
        height="${cornerSize}"
        fill="${cornerType === "lazy_susan" ? getItemColor("lazy_susan") : "#C8B7A6"}"
        stroke="#000"
      />
      <text
        x="${cx + cornerSize / 2}"
        y="${cy + cornerSize / 2}"
        font-size="11"
        fill="#000"
        text-anchor="middle"
        dominant-baseline="middle"
      >${cornerLabel}</text>
    `;
  }

  if (wallB) {
    wallB.items.forEach((item) => {
      const x = wallALength + GAP;
      const y = BASE_Y + item.start * SCALE;
      const width = 60;
      const height = item.width * SCALE;
      const skipCenterLabel = item.width <= 6;

      svg += `
      <rect
        x="${x}"
        y="${y}"
        width="${width}"
        height="${height}"
        fill="${getItemColor(item.type)}"
        stroke="#000"
      />
      ${
        skipCenterLabel
          ? ""
          : `
      <text
        x="${x + width / 2 - 8}"
        y="${y + height / 2}"
        font-size="10"
        fill="#000"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        ${getShortLabel(item)}
      </text>`
      }
    `;
    });
  }

  plan.upperCabinets.forEach((wall) => {
    if (wall.wall === "A") {
      wall.items.forEach((item) => {
        const x = item.start * SCALE;
        const y = UPPER_Y;
        const width = item.width * SCALE;
        const height = 40;
        const skipCenterLabel = item.type === "filler" && item.width <= 4;

        svg += `
        <rect
          x="${x}"
          y="${y}"
          width="${width}"
          height="${height}"
          fill="#90CAF9"
          stroke="#000"
        />
        ${
          skipCenterLabel
            ? ""
            : `
        <text
          x="${x + width / 2}"
          y="${y + height / 2}"
          font-size="11"
          fill="#000"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ${getShortLabel(item)}
        </text>`
        }
      `;
      });
    }

    if (wall.wall === "B") {
      wall.items.forEach((item) => {
        const x = wallALength + GAP + WALL_B_OFFSET_X;
        const y = BASE_Y + item.start * SCALE;
        const width = 40;
        const height = item.width * SCALE;
        const skipCenterLabel = item.width <= 6;

        svg += `
        <rect
          x="${x}"
          y="${y}"
          width="${width}"
          height="${height}"
          fill="#90CAF9"
          stroke="#000"
        />
        ${
          skipCenterLabel
            ? ""
            : `
        <text
          x="${x + width / 2}"
          y="${y + height / 2}"
          font-size="11"
          fill="#000"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ${getShortLabel(item)}
        </text>`
        }
      `;
      });
    }
  });

  const dimY = wallABaseLineY + 20;
  const dimLine = 14;
  let depthNotesY = dimY;

  if (wallAEndInches != null && totalA != null && usableA != null) {
    depthNotesY = dimY + dimLine * 2;
    svg += `
  <text x="${wallALength / 2}" y="${dimY}" text-anchor="middle" font-size="11" fill="#000">Wall A Total: ${fmtInchesForLabel(
      totalA
    )}"</text>
  <text x="${wallALength / 2}" y="${
      dimY + dimLine
    }" text-anchor="middle" font-size="11" fill="#000">Usable Run: ${fmtInchesForLabel(usableA)}"</text>`;
  } else if (wallAEndInches != null) {
    depthNotesY = dimY + dimLine;
    svg += `
  <text x="${wallALength / 2}" y="${dimY}" text-anchor="middle" font-size="11" fill="#000">Wall A (usable layout): ${wallAEndInches}"</text>`;
  }
  svg += `
  <text x="10" y="${depthNotesY + 22}" font-size="10" fill="#000">Base Depth: 24"</text>
  <text x="10" y="${depthNotesY + 38}" font-size="10" fill="#000">Upper Depth: 12"</text>
`;
  if (wallBEndInches != null && wallB && wallB.items.length > 0) {
    const wallBX = wallALength + GAP;
    const bLblX = wallBX - 18;
    const baseCenterY = BASE_Y + wallBHeight / 2;
    if (totalB != null && usableB != null) {
      const line1Y = baseCenterY - dimLine / 2;
      const line2Y = baseCenterY + dimLine / 2;
      svg += `
  <text x="${bLblX}" y="${line1Y}" font-size="10" fill="#000" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${bLblX} ${line1Y})">Wall B Total: ${fmtInchesForLabel(
        totalB
      )}"</text>
  <text x="${bLblX - 14}" y="${line2Y}" font-size="10" fill="#000" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${bLblX - 14} ${line2Y})">Usable Run: ${fmtInchesForLabel(
        usableB
      )}"</text>`;
    } else {
      svg += `
  <text x="${bLblX}" y="${baseCenterY}" font-size="11" fill="#000" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${bLblX} ${baseCenterY})">Wall B (usable layout): ${wallBEndInches}"</text>`;
    }
  }

  svg += drawLegend();

  svg += `
</svg>
`;

  return svg;
}

module.exports = { generateKitchenSVG };
