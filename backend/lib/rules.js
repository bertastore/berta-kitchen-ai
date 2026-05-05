const APPLIANCE_ORDER = ["sink", "dishwasher", "stove", "fridge"];

const APPLIANCE_WIDTH = {
  sink: 36,
  dishwasher: 24,
  stove: 30,
  fridge: 36
};

function inchesFromUserSize(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 50 ? n * 12 : n;
}

function seedEmptyWalls(result) {
  result.layout = [
    { wall: "A", items: [] },
    { wall: "B", items: [] }
  ];
  result.upperCabinets = [
    { wall: "A", items: [] },
    { wall: "B", items: [] }
  ];
  result.materials = buildMaterialEstimate(result.layout, result.upperCabinets);
}

function obstacleResolvedWall(o) {
  const w = o?.wall;
  if (w === "A" || w === "B") return w;
  const side = String(o?.side ?? "").toLowerCase();
  if (side === "left") return "A";
  if (side === "right") return "B";
  return null;
}

function normalizeApplianceRecord(raw) {
  const type = String(raw?.type ?? "").toLowerCase().trim();
  if (!["stove", "fridge", "dishwasher", "sink"].includes(type)) return null;
  let wall = raw?.wall;
  if (wall !== "A" && wall !== "B") wall = null;
  let side = raw?.side;
  if (side !== "left" && side !== "right") side = null;
  if (!wall) {
    if (side === "left") wall = "A";
    else if (side === "right") wall = "B";
  }
  const position =
    raw?.position === undefined || raw?.position === null
      ? null
      : Number(raw.position);
  return {
    type,
    wall,
    side,
    position: Number.isFinite(position) ? position : null
  };
}

function inferSinkWallFromLayout(layout, obstacles) {
  const sp = String(layout?.sink_position ?? "").toLowerCase();
  if (!sp) return null;
  if (sp.includes("left")) return "A";
  if (sp.includes("right")) return "B";
  if (sp.includes("under window")) {
    const win = (obstacles || []).find(
      (o) =>
        String(o.type).toLowerCase() === "window" &&
        obstacleResolvedWall(o) !== null
    );
    return win ? obstacleResolvedWall(win) : null;
  }
  return null;
}

function applyDefaultApplianceWalls(specs) {
  if (specs.sink && !specs.sink.wall) {
    specs.sink.wall = "A";
  }

  const resolvedSinkWall = specs.sink?.wall;

  if (specs.dishwasher && !specs.dishwasher.wall) {
    specs.dishwasher.wall = resolvedSinkWall || "A";
  }

  if (specs.stove && !specs.stove.wall) {
    specs.stove.wall = resolvedSinkWall || "A";
  }

  if (specs.fridge && !specs.fridge.wall) {
    specs.fridge.wall = "B";
  }
}

function utilityWall(util) {
  const wall = util?.wall;
  if (wall === "A" || wall === "B") return wall;
  return null;
}

function utilityPosition(util) {
  if (util?.position === undefined || util?.position === null) return null;
  const n = Number(util.position);
  return Number.isFinite(n) ? n : null;
}

function hasExactUtilityLocation(util) {
  return utilityWall(util) !== null && utilityPosition(util) !== null;
}

function hasWindowDimensions(windowObstacle) {
  if (!windowObstacle) return false;
  const start = Number(windowObstacle.start);
  const width = Number(windowObstacle.width);
  return Number.isFinite(start) && start >= 0 && Number.isFinite(width) && width > 0;
}

function getWindowObstacle(input, wallId = null) {
  return (input.obstacles || []).find((o) => {
    if (String(o?.type).toLowerCase() !== "window") return false;
    if (!wallId) return true;
    return obstacleResolvedWall(o) === wallId;
  }) || null;
}

function getCornerCabinetPlan(input, isLShape) {
  const requested = Boolean(input.cornerCabinet?.requested);
  const type = input.cornerCabinet?.type === "lazy_susan" ? "lazy_susan" : null;

  if (!isLShape) {
    return {
      requested,
      placed: false,
      type,
      name: requested && type === "lazy_susan" ? "Lazy Susan Corner Base" : null,
      width: requested ? 36 : 0,
      category: requested ? "cabinet" : null
    };
  }

  if (requested && type === "lazy_susan") {
    return {
      requested: true,
      placed: true,
      type: "lazy_susan",
      name: "Lazy Susan Corner Base",
      width: 36,
      category: "cabinet"
    };
  }

  return {
    requested,
    placed: true,
    type: null,
    name: "36 inch corner cabinet",
    width: 36,
    category: "cabinet"
  };
}

function maybeAddExactPlacementQuestions(input, specs, result) {
  const utilities = input.utilities || {};
  const sinkUnderWindow =
    typeof input.layout?.sink_position === "string" &&
    input.layout.sink_position.toLowerCase().includes("under window");
  const sinkWall = specs.sink?.wall ?? inferSinkWallFromLayout(input.layout, input.obstacles);
  const relevantWindow = getWindowObstacle(input, sinkWall);
  const anyWindow = getWindowObstacle(input);
  const windowForSink = relevantWindow || anyWindow;
  const windowDimsMissing = sinkUnderWindow && (!windowForSink || !hasWindowDimensions(windowForSink));

  if (specs.stove && !hasExactUtilityLocation(utilities.gasPipe)) {
    result.missingQuestions.push(
      "To place the stove accurately, please provide the gas pipe location: wall and distance from the starting corner."
    );
  }

  if (specs.fridge && !hasExactUtilityLocation(utilities.fridgeOutlet)) {
    result.missingQuestions.push(
      "To place the refrigerator accurately, please provide the outlet location: wall and distance from the starting corner."
    );
  }

  if (sinkUnderWindow && windowDimsMissing) {
    result.missingQuestions.push(
      "To place the sink exactly under the window, please provide the window start position and window width."
    );
    result.warnings.push(
      "Sink is placed under the window request, but exact sink cabinet position needs window dimensions."
    );
  }
}

function buildApplianceSpecs(input) {
  const layout = input.layout || {};
  const obstacles = input.obstacles || [];
  const specs = {};

  for (const app of input.appliances || []) {
    const rec = normalizeApplianceRecord(app);
    if (rec) specs[rec.type] = rec;
  }

  if (!specs.sink && layout.sink_position) {
    let wall = inferSinkWallFromLayout(layout, obstacles);
    if (!wall) wall = "A";
    specs.sink = {
      type: "sink",
      wall,
      side: null,
      position: null
    };
  }

  applyDefaultApplianceWalls(specs);
  return specs;
}

function orderedApplianceTypesForWall(wallId, specs) {
  return APPLIANCE_ORDER.filter((t) => specs[t]?.wall === wallId);
}

function widthForFitCheck(applianceType) {
  if (applianceType === "fridge") return APPLIANCE_WIDTH.fridge + 2;
  return APPLIANCE_WIDTH[applianceType] || 0;
}

function humanizeApplianceLabel(t) {
  switch (t) {
    case "sink":
      return "Sink";
    case "dishwasher":
      return "Dishwasher";
    case "stove":
      return "Stove";
    case "fridge":
      return "Fridge";
    default:
      return t;
  }
}

function addApplianceFitWarnings(walls, specs, warnings) {
  for (const wall of walls) {
    const typesHere = orderedApplianceTypesForWall(wall.id, specs);
    if (typesHere.length === 0) continue;
    const needed = typesHere.reduce((sum, t) => sum + widthForFitCheck(t), 0);
    if (needed > wall.length) {
      const labels = typesHere
        .map(humanizeApplianceLabel)
        .sort((a, b) => a.localeCompare(b))
        .join(" and ");
      warnings.push(
        `${labels} requested on Wall ${wall.id}, but available space is not enough.`
      );
    }
  }
}

function maybeAddSinkUnderWindowQuestion(input, result) {
  const sp = String(input.layout?.sink_position ?? "").toLowerCase();
  if (!sp.includes("under window")) return;
  const hasWindowWall = (input.obstacles || []).some((o) => {
    if (String(o.type).toLowerCase() !== "window") return false;
    return obstacleResolvedWall(o) !== null;
  });
  if (!hasWindowWall) {
    result.missingQuestions.push(
      "To place the sink under the window, please confirm which wall the window is on: A or B."
    );
  }
}

function generateKitchenPlan(input) {
  const result = {
    summary: {},
    layout: [],
    upperCabinets: [],
    cornerCabinet: null,
    cabinetList: [],
    materials: {},
    advice: [],
    warnings: [],
    missingQuestions: []
  };

  const normalizedShape = normalizeShape(input.shape);
  result.summary.shape = normalizedShape;
  const isLShape = normalizedShape === "L";

  const lengthInches = inchesFromUserSize(input.size?.length);
  const widthInches = inchesFromUserSize(input.size?.width);

  if (lengthInches == null || widthInches == null) {
    result.missingQuestions.push(
      "Kitchen length and width are required (feet or inches) to generate a layout. Please provide both dimensions."
    );
    result.summary.linearFeet = 0;
    seedEmptyWalls(result);
    return result;
  }

  const wallAOriginal = lengthInches;
  const wallBOriginal = widthInches;

  let wallALength = lengthInches;
  let wallBLength = widthInches;

  if (isLShape) {
    wallALength -= 36;
    wallBLength -= 36;

    result.warnings.push(
      "36 inch corner cabinet space subtracted from both L-shape walls."
    );
  }

  result.summary.linearFeet = (lengthInches + widthInches) / 12;
  result.summary.wallAOriginal = wallAOriginal;
  result.summary.wallBOriginal = wallBOriginal;
  result.summary.wallAUsable = wallALength;
  result.summary.wallBUsable = wallBLength;

  const walls = [
    { id: "A", length: wallALength },
    { id: "B", length: wallBLength }
  ];

  maybeAddSinkUnderWindowQuestion(input, result);

  const specs = buildApplianceSpecs(input);
  const resolvedSinkWall = specs.sink?.wall ?? "A";
  const cornerCabinetPlan = getCornerCabinetPlan(input, isLShape);
  result.cornerCabinet = cornerCabinetPlan;
  result.summary.cornerCabinet = cornerCabinetPlan;

  maybeAddExactPlacementQuestions(input, specs, result);

  if (cornerCabinetPlan.requested && !cornerCabinetPlan.placed) {
    result.warnings.push(
      "Corner cabinet was requested, but a corner cabinet can only be placed in an L-shaped kitchen."
    );
  }

  const hasSink =
    Boolean(specs.sink) || Boolean(input.layout?.sink_position);

  if (hasSink) {
    result.cabinetList.push({
      name: "36 inch sink base",
      qty: 1
    });
  }

  if (cornerCabinetPlan?.placed) {
    result.cabinetList.push({
      name: cornerCabinetPlan.name,
      qty: 1
    });
  }

  const cabinetSizes = [36, 30, 24, 18, 12];

  const wantsUpperCabinets =
    input.preferences == null ||
    input.preferences.upperCabinets === undefined ||
    input.preferences.upperCabinets === null
      ? true
      : Boolean(input.preferences.upperCabinets);

  const sinkUnderWindow =
    typeof input.layout?.sink_position === "string" &&
    input.layout.sink_position.toLowerCase().includes("under window");

  addApplianceFitWarnings(walls, specs, result.warnings);

  let fridgePlaced = false;

  walls.forEach((wall) => {
    const wallLen = wall.length;
    let remaining = wallLen;
    let position = 0;

    const wallPlan = {
      wall: wall.id,
      items: []
    };

    const obstacles = (input.obstacles || []).filter(
      (o) => obstacleResolvedWall(o) === wall.id
    );
    const doors = obstacles
      .filter((o) => o.type === "door")
      .map((o) => ({
        type: "door",
        wall: o.wall,
        start: Number(o.start) || 0,
        width: Number(o.width) || 0,
        height: Number(o.height) || 0
      }))
      .filter((d) => d.width > 0);

    const windows = obstacles
      .filter((o) => String(o.type).toLowerCase() === "window")
      .map((o) => ({
        type: "window",
        wall: o.wall,
        start: Number(o.start) || 0,
        width: Number(o.width) || 0,
        height: Number(o.height) || 0
      }))
      .filter((w) => w.width > 0);

    for (const win of windows) {
      result.warnings.push(
        `Window on Wall ${wall.id} will block upper cabinets above that section.`
      );
    }

    const consumedDoors = new Set();

    const unconsumedDoors = () =>
      doors.filter((d) => !consumedDoors.has(doorKey(d)));

    const syncFromRemaining = () => {
      position = wallLen - remaining;
    };

    const applyPlacement = (width) => {
      const w = Math.max(0, Number(width) || 0);
      remaining -= w;
      if (remaining < 0) remaining = 0;
      position = wallLen - remaining;
    };

    const flushDoorBeforePlace = (width) => {
      let any = false;
      let guard = 0;
      while (guard++ < 50) {
        syncFromRemaining();
        const before = position;
        const flushed = resolveDoorOverlapForPlacement(
          wallPlan,
          wall.id,
          wallLen,
          position,
          width,
          doors,
          consumedDoors,
          result.warnings
        );
        remaining = flushed.remaining;
        position = flushed.position;
        if (position === before) break;
        any = true;
      }
      return any;
    };

    const typesHere = orderedApplianceTypesForWall(wall.id, specs);

    const placeApplianceOrWarn = (appType, width, itemPayload) => {
      flushDoorBeforePlace(width);
      syncFromRemaining();
      if (
        remaining < width ||
        segmentOverlapsAnyDoor(position, width, unconsumedDoors())
      ) {
        result.warnings.push(
          `${humanizeApplianceLabel(
            appType
          )} could not be placed on Wall ${wall.id} due to limited space or door placement.`
        );
        return false;
      }
      wallPlan.items.push(itemPayload);
      applyPlacement(width);
      return true;
    };

    let applianceRunBlocked = false;
    for (const appType of typesHere) {
      if (appType === "sink" && !hasSink) continue;
      if (applianceRunBlocked) break;

      if (appType === "sink") {
        const ok = placeApplianceOrWarn("sink", APPLIANCE_WIDTH.sink, {
          type: "sink",
          name: "36 inch sink base",
          width: APPLIANCE_WIDTH.sink
        });
        if (!ok) applianceRunBlocked = true;
        continue;
      }

      if (appType === "dishwasher") {
        const ok = placeApplianceOrWarn(
          "dishwasher",
          APPLIANCE_WIDTH.dishwasher,
          {
            type: "appliance",
            name: "24 inch dishwasher",
            width: APPLIANCE_WIDTH.dishwasher
          }
        );
        if (ok) {
          result.warnings.push("Dishwasher placed next to sink.");
        } else if (specs.sink?.wall === wall.id) {
          applianceRunBlocked = true;
        }
        continue;
      }

      if (appType === "stove") {
        const ok = placeApplianceOrWarn("stove", APPLIANCE_WIDTH.stove, {
          type: "appliance",
          name: "30 inch stove",
          width: APPLIANCE_WIDTH.stove
        });
        if (ok) {
          result.warnings.push("Stove placed in layout.");
        }
        continue;
      }

      if (appType === "fridge") {
        const ok = placeApplianceOrWarn("fridge", APPLIANCE_WIDTH.fridge, {
          type: "appliance",
          name: "36 inch fridge opening",
          width: APPLIANCE_WIDTH.fridge
        });
        if (ok) {
          fridgePlaced = true;
          if (remaining >= 2) {
            syncFromRemaining();
            flushDoorBeforePlace(2);
            syncFromRemaining();
            if (
              remaining >= 2 &&
              !segmentOverlapsAnyDoor(position, 2, unconsumedDoors())
            ) {
              wallPlan.items.push({
                type: "filler",
                name: "2 inch fridge clearance filler",
                width: 2
              });
              applyPlacement(2);
            }
          }
          result.warnings.push(
            `Fridge placed on Wall ${wall.id} with side clearance.`
          );
        }
      }
    }

    cabinetSizes.forEach((size) => {
      while (remaining >= size) {
        syncFromRemaining();
        flushDoorBeforePlace(size);
        syncFromRemaining();

        if (
          remaining < size ||
          segmentOverlapsAnyDoor(position, size, unconsumedDoors())
        ) {
          break;
        }

        wallPlan.items.push({
          type: "base",
          name: `${size} inch base cabinet`,
          width: size
        });

        applyPlacement(size);
      }
    });

    syncFromRemaining();
    if (remaining > 0) {
      flushDoorBeforePlace(remaining);
      syncFromRemaining();
      if (
        remaining > 0 &&
        !segmentOverlapsAnyDoor(position, remaining, unconsumedDoors())
      ) {
        wallPlan.items.push({
          type: "filler",
          name: `${remaining} inch filler`,
          width: remaining
        });

        applyPlacement(remaining);
      }
    }

    insertWindowObstaclesIntoWallPlan(
      wallPlan,
      windows,
      wall.id,
      sinkUnderWindow,
      resolvedSinkWall
    );

    const upperPlan = wantsUpperCabinets
      ? buildUpperCabinetPlanForWall(
          wall.id,
          wallPlan.items,
          sinkUnderWindow,
          result.warnings,
          resolvedSinkWall
        )
      : { wall: wall.id, items: [] };

    wallPlan.items = normalizeWallLayoutItems(wall.id, wallPlan.items);
    upperPlan.items = normalizeUpperCabinetItems(wall.id, upperPlan.items);

    if (
      wall.id === resolvedSinkWall &&
      sinkUnderWindow &&
      windows.length > 0
    ) {
      result.advice.push(
        "Sink can be placed under the window if plumbing and window height allow."
      );
    }

    result.layout.push(wallPlan);
    result.upperCabinets.push(upperPlan);
  });

  if (specs.fridge && !fridgePlaced) {
    result.warnings.push(
      `Fridge was requested for Wall ${specs.fridge.wall} but could not be placed with available space.`
    );
  }

  result.materials = buildMaterialEstimate(result.layout, result.upperCabinets);

  return result;
}

const ALLOWED_SHAPES = new Set(["straight", "L", "U", "galley", "island"]);

function normalizeShape(shape) {
  const raw = String(shape ?? "").trim().toLowerCase();
  if (!raw) return "straight";
  if (raw === "l-shaped" || raw === "l" || raw.includes("l-shaped") || raw === "l shape") {
    return "L";
  }
  if (raw.includes("straight kitchen") || raw === "straight kitchen" || raw.includes("straight")) {
    return "straight";
  }
  if (raw === "u-shaped" || raw === "u" || raw.includes("u-shaped")) return "U";
  if (raw === "galley") return "galley";
  if (raw === "island" || raw.includes("island")) return "island";
  const compact = raw.replace(/\s+/g, "");
  if (ALLOWED_SHAPES.has(compact)) return compact;
  if (ALLOWED_SHAPES.has(raw)) return raw;
  return "straight";
}

function mapLegacyLayoutItemToCore(wallId, item) {
  const name = item.name || "";
  const width = Math.max(0, Number(item.width) || 0);

  if (item.type === "sink") {
    return {
      wall: wallId,
      type: "sink",
      category: "cabinet",
      name: name || "36 inch sink base",
      width
    };
  }
  if (item.type === "base") {
    return {
      wall: wallId,
      type: "base",
      category: "cabinet",
      name: name || `${width} inch base cabinet`,
      width
    };
  }
  if (item.type === "lazy_susan") {
    return {
      wall: wallId,
      type: "lazy_susan",
      category: "cabinet",
      name: name || "Lazy Susan Corner Base",
      width
    };
  }
  if (item.type === "filler") {
    return {
      wall: wallId,
      type: "filler",
      category: "filler",
      name: name || `${width} inch filler`,
      width
    };
  }
  if (item.type === "obstacle" && name === "door opening") {
    return {
      wall: wallId,
      type: "door",
      category: "obstacle",
      name: "door opening",
      width
    };
  }
  if (item.type === "obstacle" && name === "window opening") {
    return {
      wall: wallId,
      type: "window",
      category: "obstacle",
      name: "window opening",
      width
    };
  }
  if (item.type === "appliance") {
    if (/dishwasher/i.test(name)) {
      return {
        wall: wallId,
        type: "dishwasher",
        category: "appliance",
        name: name || "24 inch dishwasher",
        width
      };
    }
    if (/stove|range/i.test(name)) {
      return {
        wall: wallId,
        type: "stove",
        category: "appliance",
        name: name || "30 inch stove",
        width
      };
    }
    if (/fridge/i.test(name)) {
      return {
        wall: wallId,
        type: "fridge",
        category: "appliance",
        name: name || "36 inch fridge opening",
        width
      };
    }
    return {
      wall: wallId,
      type: "base",
      category: "cabinet",
      name: name || "appliance",
      width
    };
  }
  if (item.type === "door" || item.type === "window") {
    return {
      wall: wallId,
      type: item.type,
      category: "obstacle",
      name,
      width
    };
  }
  return {
    wall: wallId,
    type: String(item.type || "filler"),
    category: "filler",
    name: name || "item",
    width
  };
}

function normalizeWallLayoutItems(wallId, items) {
  let cursor = 0;
  return items.map((raw) => {
    const core = mapLegacyLayoutItemToCore(wallId, raw);
    const w = Math.max(0, Number(core.width) || 0);
    const start = cursor;
    const end = start + w;
    cursor = end;
    return {
      wall: wallId,
      type: core.type,
      category: core.category,
      name: core.name,
      width: w,
      start,
      end
    };
  });
}

function normalizeUpperCabinetItems(wallId, items) {
  let cursor = 0;
  return items.map((it) => {
    const width = Math.max(0, Number(it.width) || 0);
    const hasWallStart =
      it.wallStart !== undefined &&
      it.wallStart !== null &&
      !Number.isNaN(Number(it.wallStart));
    const start = hasWallStart ? Number(it.wallStart) : cursor;
    const end = start + width;
    cursor = Math.max(cursor, end);
    if (it.type === "hood_space") {
      return {
        wall: wallId,
        type: "hood_space",
        category: "hood",
        name: it.name || "range hood / microwave space",
        width,
        start,
        end
      };
    }
    return {
      wall: wallId,
      type: "upper",
      category: "upper",
      name: it.name || `${width} inch wall cabinet`,
      width,
      start,
      end
    };
  });
}

function formatPlywoodSheetRange(sheetsWithWaste) {
  if (sheetsWithWaste <= 0) return "0 sheets";
  const lo = Math.max(1, Math.floor(sheetsWithWaste));
  const hi = Math.max(lo + 1, Math.ceil(sheetsWithWaste));
  return `${lo}-${hi} sheets`;
}

function formatLinearFtRangeForEdge(ftWithWaste) {
  if (ftWithWaste <= 0) return "0 linear ft";
  const lo = Math.max(1, Math.floor((ftWithWaste * 0.9) / 10) * 10);
  const hi = Math.max(lo + 10, Math.ceil((ftWithWaste * 1.04) / 10) * 10);
  return `${lo}-${hi} linear ft`;
}

function buildMaterialEstimate(layout, upperCabinets) {
  let baseCab = 0;
  let sinkBase = 0;
  let upperCab = 0;

  for (const wall of layout) {
    for (const item of wall.items) {
      if (item.type === "base") baseCab += 1;
      else if (item.type === "sink") sinkBase += 1;
    }
  }

  for (const uwall of upperCabinets) {
    for (const item of uwall.items) {
      if (item.type === "upper") upperCab += 1;
    }
  }

  const baseAndSink = baseCab + sinkBase;
  const cabinetCount = baseAndSink + upperCab;

  const plywood34Raw =
    baseAndSink * 1.25 + upperCab * 0.75;
  const plywood34WithWaste = plywood34Raw * 1.15;

  const plywood14Raw =
    baseAndSink * 0.25 + upperCab * 0.2;
  const plywood14WithWaste = plywood14Raw * 1.15;

  const hingeTotal = cabinetCount * 4;
  const drawerPairs = baseCab;
  const edgeFtWithWaste = cabinetCount * 18 * 1.15;

  return {
    plywood34: formatPlywoodSheetRange(plywood34WithWaste),
    plywood14: formatPlywoodSheetRange(plywood14WithWaste),
    drawerSlides: `${drawerPairs} pairs`,
    hinges: `${hingeTotal} hinges`,
    edgeBanding: formatLinearFtRangeForEdge(edgeFtWithWaste),
    wasteFactor: "15%"
  };
}

function overlaps(start1, width1, start2, width2) {
  return start1 < start2 + width2 && start1 + width1 > start2;
}

/** Exclusive end index after sink and any contiguous appliances (DW, stove). */
function findSinkApplianceRunEnd(physicalItems) {
  const si = physicalItems.findIndex((it) => it.type === "sink");
  if (si === -1) return physicalItems.length;
  let j = si + 1;
  while (
    j < physicalItems.length &&
    physicalItems[j].type === "appliance"
  ) {
    j++;
  }
  return j;
}

function findWindowInsertIndex(physicalItems, win) {
  const startInches = win.start;
  let cum = 0;
  for (let i = 0; i < physicalItems.length; i++) {
    const next = cum + physicalItems[i].width;
    if (startInches < next) {
      let idx = startInches <= cum ? i : i + 1;
      if (
        idx === 0 &&
        physicalItems[0]?.type === "sink" &&
        overlaps(0, physicalItems[0].width, win.start, win.width)
      ) {
        return 1;
      }
      return idx;
    }
    cum = next;
  }
  if (startInches === cum) return physicalItems.length;
  return -1;
}

/**
 * Inserts window markers at wall inch offsets without changing placement math
 * (bases already placed). Indices are computed from the pre-window item list only.
 * When sink is "under window", skips markers that would sit between sink and DW/stove.
 */
function insertWindowObstaclesIntoWallPlan(
  wallPlan,
  windows,
  wallId,
  sinkUnderWindow,
  sinkWallId = "A"
) {
  const physical = [...wallPlan.items];
  const inserts = [];
  const sinkIdx = physical.findIndex((it) => it.type === "sink");
  const runEnd =
    wallId === sinkWallId && sinkUnderWindow && sinkIdx !== -1
      ? findSinkApplianceRunEnd(physical)
      : -1;

  for (const win of windows) {
    if (win.start < 0) continue;
    const at = findWindowInsertIndex(physical, win);
    if (at < 0) continue;
    if (
      wallId === sinkWallId &&
      sinkUnderWindow &&
      sinkIdx !== -1 &&
      runEnd > sinkIdx + 1 &&
      at > sinkIdx &&
      at < runEnd
    ) {
      continue;
    }
    inserts.push({ at, win });
  }

  inserts.sort((a, b) => b.at - a.at);

  const out = [...physical];
  for (const { at, win } of inserts) {
    out.splice(at, 0, {
      type: "obstacle",
      name: "window opening",
      width: win.width
    });
  }

  wallPlan.items = out;
}

function doorKey(d) {
  return `${d.start}-${d.width}`;
}

function segmentOverlapsAnyDoor(position, width, doorList) {
  return doorList.some((d) => overlaps(position, width, d.start, d.width));
}

/**
 * Inserts filler up to door start (if needed) and a door opening item, advances cursor.
 * Only mutates consumedDoors when a door opening item is added.
 */
function resolveDoorOverlapForPlacement(
  wallPlan,
  wallId,
  wallLen,
  position,
  width,
  doors,
  consumedDoors,
  warnings
) {
  let pos = position;
  let remaining = wallLen - pos;
  const sorted = [...doors].sort((a, b) => a.start - b.start);
  let guard = 0;

  while (guard++ < 200) {
    const hit = sorted.find(
      (d) =>
        !consumedDoors.has(doorKey(d)) && overlaps(pos, width, d.start, d.width)
    );

    if (!hit) break;

    const S = hit.start;
    const Dw = hit.width;

    if (pos < S) {
      const gap = S - pos;
      wallPlan.items.push({
        type: "filler",
        name: `${gap} inch filler`,
        width: gap
      });
      pos = S;
      remaining = wallLen - pos;
    }

    wallPlan.items.push({
      type: "obstacle",
      name: "door opening",
      width: Dw
    });

    consumedDoors.add(doorKey(hit));
    pos = S + Dw;
    remaining = wallLen - pos;

    if (remaining < 0) remaining = 0;

    warnings.push(
      `Door on Wall ${wallId} blocks cabinet or appliance placement; door opening reserved.`
    );
  }

  return { position: pos, remaining };
}

const UPPER_CABINET_SIZES = [36, 30, 24, 18, 12];

function packUpperWidths(totalWidth) {
  const items = [];
  let rem = totalWidth;
  while (rem > 0) {
    let placed = false;
    for (const s of UPPER_CABINET_SIZES) {
      if (rem >= s) {
        items.push({
          type: "upper",
          name: `${s} inch wall cabinet`,
          width: s
        });
        rem -= s;
        placed = true;
        break;
      }
    }
    if (!placed) {
      items.push({
        type: "upper",
        name: `${rem} inch wall cabinet`,
        width: rem
      });
      break;
    }
  }
  return items;
}

function isDoorLayoutItem(item) {
  return (
    (item.type === "obstacle" && item.name === "door opening") ||
    item.type === "door"
  );
}

/** Wall-space intervals for door obstacles (same order as layoutItems). */
function collectDoorWallIntervals(layoutItems) {
  let cum = 0;
  const intervals = [];
  for (const item of layoutItems) {
    const w = Math.max(0, Number(item.width) || 0);
    if (isDoorLayoutItem(item)) {
      intervals.push({ start: cum, width: w });
    }
    cum += w;
  }
  return intervals;
}

function isWindowLayoutItem(item) {
  return (
    (item.type === "obstacle" && item.name === "window opening") ||
    item.type === "window"
  );
}

function isDishwasherLayoutItem(item) {
  return (
    item.type === "dishwasher" ||
    (item.type === "appliance" && /dishwasher/i.test(item.name || ""))
  );
}

function isStoveLayoutItem(item) {
  return (
    item.type === "stove" ||
    (item.type === "appliance" && /stove|range/i.test(item.name || ""))
  );
}

function isFridgeLayoutItem(item) {
  return (
    item.type === "fridge" ||
    (item.type === "appliance" && /fridge/i.test(item.name || ""))
  );
}

function isTallOrPantryBase(item) {
  return item.type === "base" && /pantry|tall/i.test(item.name || "");
}

/**
 * Wall run order matches base layout items. Skips uppers above blocked spans;
 * merges eligible consecutive widths before packing standard upper sizes.
 * Skips individual upper pieces whose wall span overlaps a door opening.
 */
function buildUpperCabinetPlanForWall(
  wallId,
  layoutItems,
  sinkUnderWindow,
  warnings,
  sinkWallId = "A"
) {
  const out = [];
  const doorIntervals = collectDoorWallIntervals(layoutItems);
  const warned = {
    window: false,
    sinkUnderWindow: false,
    stove: false,
    fridge: false
  };

  let wallCursor = 0;
  let upperRun = 0;
  let runStartWall = 0;

  const flushRun = () => {
    if (upperRun <= 0) return;
    const pieces = packUpperWidths(upperRun);
    let pos = runStartWall;
    for (const piece of pieces) {
      const pw = Math.max(0, Number(piece.width) || 0);
      const overlapsDoor = doorIntervals.some((d) =>
        overlaps(pos, pw, d.start, d.width)
      );
      if (overlapsDoor) {
        warnings.push(
          `Upper cabinet skipped above door opening on Wall ${wallId}.`
        );
      } else {
        out.push({
          type: piece.type,
          name: piece.name,
          width: pw,
          wallStart: pos
        });
      }
      pos += pw;
    }
    upperRun = 0;
  };

  const startOrContinueRun = (w) => {
    if (upperRun === 0) runStartWall = wallCursor;
    upperRun += w;
  };

  for (const item of layoutItems) {
    const w = Math.max(0, Number(item.width) || 0);

    if (isDoorLayoutItem(item)) {
      flushRun();
      wallCursor += w;
      continue;
    }

    if (isWindowLayoutItem(item)) {
      flushRun();
      if (!warned.window) {
        warnings.push("Window blocks upper cabinets.");
        warned.window = true;
      }
      wallCursor += w;
      continue;
    }

    if (item.type === "sink") {
      if (wallId === sinkWallId && sinkUnderWindow) {
        flushRun();
        if (!warned.sinkUnderWindow) {
          warnings.push("Sink under window skipped for uppers.");
          warned.sinkUnderWindow = true;
        }
        wallCursor += w;
        continue;
      }
      startOrContinueRun(w);
      wallCursor += w;
      continue;
    }

    if (isFridgeLayoutItem(item)) {
      flushRun();
      if (!warned.fridge) {
        warnings.push("Fridge area skipped for upper cabinets.");
        warned.fridge = true;
      }
      wallCursor += w;
      continue;
    }

    if (isStoveLayoutItem(item)) {
      flushRun();
      const stoveStart = wallCursor;
      if (!warned.stove) {
        warnings.push("Stove area reserved for hood or microwave.");
        warned.stove = true;
      }
      out.push({
        type: "hood_space",
        name: "range hood / microwave space",
        width: 30,
        wallStart: stoveStart
      });
      wallCursor += w;
      continue;
    }

    if (isDishwasherLayoutItem(item)) {
      startOrContinueRun(w);
      wallCursor += w;
      continue;
    }

    if (item.type === "appliance") {
      startOrContinueRun(w);
      wallCursor += w;
      continue;
    }

    if (item.type === "base") {
      if (isTallOrPantryBase(item)) {
        flushRun();
        wallCursor += w;
        continue;
      }
      startOrContinueRun(w);
      wallCursor += w;
      continue;
    }

    if (item.type === "filler") {
      if (/fridge/i.test(item.name || "")) {
        flushRun();
        wallCursor += w;
        continue;
      }
      flushRun();
      wallCursor += w;
      continue;
    }

    flushRun();
    wallCursor += w;
  }

  flushRun();

  return { wall: wallId, items: out };
}

module.exports = { generateKitchenPlan };
