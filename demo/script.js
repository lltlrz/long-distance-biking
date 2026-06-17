const intensityConfig = {
  easy: {
    label: "轻松",
    help: "轻松：每日约 50-70km，适合新手和休闲骑旅。",
    speed: 13.5,
    gap: 25,
    risk: "低"
  },
  standard: {
    label: "标准",
    help: "标准：每日约 70-100km，适合有一定骑行基础的用户。",
    speed: 15.5,
    gap: 35,
    risk: "中"
  },
  challenge: {
    label: "挑战",
    help: "挑战：每日约 100-130km，适合进阶骑行者。",
    speed: 18,
    gap: 50,
    risk: "中高"
  }
};

const stops = ["成都", "眉山", "夹江", "乐山", "峨眉", "犍为", "宜宾"];
let activeIntensity = "standard";
let selectedDay = 1;
let eventCount = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function formatHours(hours) {
  const fixed = Math.max(1, hours).toFixed(1);
  return `${fixed}h`;
}

function getRiskClass(level) {
  if (level === "高" || level === "中高") return "high";
  if (level === "中") return "mid";
  return "low";
}

function buildItinerary() {
  const start = $("#startInput").value.trim() || "成都";
  const end = $("#endInput").value.trim() || "乐山";
  const days = clampNumber($("#daysInput").value, 2, 6, 3);
  const totalDistance = clampNumber($("#distanceInput").value, 120, 520, 246);
  const config = intensityConfig[activeIntensity];
  const avg = Math.round(totalDistance / days);
  const routeStops = [start, ...stops.filter((stop) => stop !== start && stop !== end).slice(0, Math.max(0, days - 1)), end];

  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const distanceOffset = index === 0 ? -4 : index === days - 1 ? -8 : 6;
    const distance = Math.max(42, Math.round(avg + distanceOffset));
    const gapDistance = Math.max(18, Math.round(config.gap + (index % 2 === 0 ? -6 : 8)));
    const hasHighGap = gapDistance >= config.gap;
    const safetyLevel = day === 2 ? "中" : activeIntensity === "challenge" && day === days ? "中高" : "低";
    const supplyLevel = hasHighGap ? "中" : "低";

    return {
      day,
      start: routeStops[index] || `第${day}段起点`,
      end: routeStops[index + 1] || end,
      distance,
      hours: distance / config.speed,
      climb: 260 + day * 140 + (activeIntensity === "challenge" ? 90 : 0),
      gapDistance,
      supplyLevel,
      safetyLevel,
      reason: day === 1
        ? "住宿和餐饮密度较高，适合作为首日适应性终点。"
        : day === 2
          ? "夹江周边补给可衔接，但前后国道路段需要白天通过。"
          : "终点服务能力强，适合完成行程并预留返程选择。"
    };
  });
}

function renderPlan(trackEvent = true) {
  const start = $("#startInput").value.trim() || "成都";
  const end = $("#endInput").value.trim() || "乐山";
  const days = clampNumber($("#daysInput").value, 2, 6, 3);
  const totalDistance = clampNumber($("#distanceInput").value, 120, 520, 246);
  const config = intensityConfig[activeIntensity];
  const itinerary = buildItinerary();
  const avg = Math.round(totalDistance / days);
  const gapCount = itinerary.filter((item) => item.gapDistance >= config.gap).length;
  const riskLevel = itinerary.some((item) => item.safetyLevel === "中高") ? "中高" : gapCount > 1 ? "中" : "低";

  $("#daysInput").value = days;
  $("#distanceInput").value = totalDistance;
  $("#routeTitle").textContent = `${start} → ${end} · ${days} 日`;
  $("#routeSubtitle").textContent = `${totalDistance}km · 预计总骑行 ${formatHours(totalDistance / config.speed)} · 推荐${config.label}强度`;
  $("#avgDistance").textContent = `${avg}km`;
  $("#gapCount").textContent = `${gapCount} 段`;
  $("#riskLevel").textContent = riskLevel;
  $("#intensityHelp").textContent = config.help;

  renderDayCards(itinerary);
  renderWarnings(itinerary, config);

  if (trackEvent) {
    logEvent("plan_success", `天数=${days}, 强度=${config.label}, 空窗=${gapCount}`);
  }
}

function renderDayCards(itinerary) {
  const container = $("#dayCards");
  container.innerHTML = itinerary.map((item) => `
    <article class="day-card ${item.day === selectedDay ? "selected" : ""}" data-day="${item.day}">
      <div class="day-card-header">
        <h3>Day ${item.day} · ${item.start} → ${item.end}</h3>
        <span class="badge ${getRiskClass(item.supplyLevel)}">补给${item.supplyLevel}</span>
      </div>
      <p>${item.reason}</p>
      <div class="day-metrics">
        <div class="metric"><span>里程</span><strong>${item.distance}km</strong></div>
        <div class="metric"><span>耗时</span><strong>${formatHours(item.hours)}</strong></div>
        <div class="metric"><span>爬升</span><strong>${item.climb}m</strong></div>
      </div>
    </article>
  `).join("");

  $$(".day-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedDay = Number(card.dataset.day);
      logEvent("day_detail_view", `Day ${selectedDay}`);
      renderPlan(false);
    });
  });
}

function renderWarnings(itinerary, config) {
  const selected = itinerary.find((item) => item.day === selectedDay) || itinerary[0];
  const highGap = selected.gapDistance >= config.gap;
  const warnings = [
    {
      level: highGap ? "red" : "amber",
      icon: "补",
      title: `Day ${selected.day} 补给空窗 ${selected.gapDistance}km`,
      body: highGap ? "该段超过当前强度的补给提醒阈值，建议在上一城镇补水并确认餐饮。" : "补给距离可控，可在详情页查看沿途便利店和餐饮点。"
    },
    {
      level: selected.day === 2 ? "red" : "amber",
      icon: "路",
      title: selected.day === 2 ? "国道路段与大车风险" : "道路风险较低",
      body: selected.day === 2 ? "夹江前后存在较长国道路段，建议白天通过，避免夜间继续骑行。" : "当前日推荐路线以城镇连接道路为主，注意常规骑行安全。"
    },
    {
      level: selected.day === 2 ? "amber" : "amber",
      icon: "离",
      title: "离线地图提醒",
      body: selected.day === 2 ? "局部山区和乡镇路段可能弱网络，出发前建议下载离线地图。" : "如当天计划较晚到达，建议提前缓存路线和住宿点。"
    }
  ];

  $("#warningList").innerHTML = warnings.map((warning) => `
    <article class="warning-item ${warning.level === "red" ? "red" : ""}">
      <div class="warning-icon">${warning.icon}</div>
      <div>
        <h3>${warning.title}</h3>
        <p>${warning.body}</p>
      </div>
    </article>
  `).join("");
}

function logEvent(name, detail) {
  eventCount += 1;
  const log = $("#eventLog");
  const line = `${String(eventCount).padStart(2, "0")} ${name} · ${detail}`;
  const current = log.textContent.trim();
  log.textContent = current ? `${line}\n${current}` : line;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function bindEvents() {
  $$(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      activeIntensity = button.dataset.intensity;
      $$(".segment").forEach((item) => item.classList.toggle("active", item === button));
      logEvent("intensity_change", intensityConfig[activeIntensity].label);
      renderPlan(false);
    });
  });

  $$(".layer").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
      const layer = button.dataset.layer;
      const active = button.classList.contains("active");
      $$(`[data-layer-marker="${layer}"]`).forEach((marker) => marker.classList.toggle("hidden", !active));
      logEvent("map_layer_toggle", `${button.textContent.trim()}=${active ? "on" : "off"}`);
    });
  });

  $("#generateButton").addEventListener("click", () => {
    selectedDay = 1;
    logEvent("plan_submit", `${$("#startInput").value || "成都"} → ${$("#endInput").value || "乐山"}`);
    renderPlan(true);
  });

  $("#saveButton").addEventListener("click", () => {
    logEvent("plan_save", `${$("#routeTitle").textContent}`);
    showToast("行程已保存，可用于作品集演示");
  });

  $("#adjustButton").addEventListener("click", () => {
    selectedDay = Math.min(selectedDay + 1, clampNumber($("#daysInput").value, 2, 6, 3));
    logEvent("endpoint_change", `切换查看 Day ${selectedDay} 候选终点`);
    renderPlan(false);
  });

  $("#resetButton").addEventListener("click", () => {
    $("#startInput").value = "成都";
    $("#endInput").value = "乐山";
    $("#daysInput").value = "3";
    $("#distanceInput").value = "246";
    activeIntensity = "standard";
    selectedDay = 1;
    $$(".segment").forEach((item) => item.classList.toggle("active", item.dataset.intensity === activeIntensity));
    $("#eventLog").textContent = "";
    eventCount = 0;
    renderPlan(false);
    logEvent("plan_reset", "恢复默认路线");
  });
}

bindEvents();
renderPlan(false);
logEvent("demo_load", "app loads -> first meaningful screen renders");
