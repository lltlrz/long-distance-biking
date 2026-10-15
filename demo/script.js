import { buildPlan, buildAdjustment } from "./plan-engine.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { intensity: "standard", selectedDay: 2, plan: null, pendingAdjustment: null, adjustmentReason: "fatigue", activeLayers: new Set(["food", "store", "hotel", "town", "repair"]) };
const intensityHelp = { easy: "轻松：每日约 50-75km，给休息和补给留出余量。", standard: "标准：每日约 70-100km，适合有一定骑行基础的用户。", challenge: "挑战：每日约 95km 以上，需关注恢复和补给。" };
const reasonLabels = { fatigue: "体力下降", weather: "天气变化", time: "时间不足", progress: "进度滞后" };

function renderPlan() {
  const plan = state.plan;
  $("#routeTitle").textContent = `${plan.query.start} → ${plan.query.end} · ${plan.query.days} 日`;
  $("#routeSubtitle").textContent = `${plan.query.totalDistance}km · AI 已按补给与住宿条件拆分`;
  $("#avgDistance").textContent = `${plan.averageDistance}km`;
  $("#gapCount").textContent = `${plan.itinerary.filter((day) => day.supplyGapKm >= 30).length} 段`;
  $("#riskLevel").textContent = plan.riskLevel;
  $("#dayCards").innerHTML = plan.itinerary.map((day) => `<button class="day-card ${day.day === state.selectedDay ? "selected" : ""}" data-day="${day.day}"><span><b>Day ${day.day}</b><small>${day.start} → ${day.end}</small></span><span><b>${day.distance}km</b><small>${day.hours}h · ↑${day.climb}m</small></span><em class="badge ${day.supplyLevel === "中" ? "warn" : "safe"}">补给${day.supplyLevel}</em></button>`).join("");
  $$(".day-card").forEach((card) => card.addEventListener("click", () => { state.selectedDay = Number(card.dataset.day); renderPlan(); }));
  const selected = plan.itinerary.find((day) => day.day === state.selectedDay) || plan.itinerary[0];
  $("#reasonTitle").textContent = `为什么推荐${selected.end}？`;
  $("#recommendationReason").textContent = selected.reason;
  $("#warningList").innerHTML = `<article class="warning ${selected.supplyGapKm >= 30 ? "danger" : "safe"}"><b>${selected.supplyGapKm >= 30 ? `补给空窗 ${selected.supplyGapKm}km` : "补给衔接正常"}</b><p>${selected.supplyGapKm >= 30 ? "建议在出城前补足饮水和高能量食物。" : "沿途服务点可覆盖当前计划。"}</p></article><article class="warning"><b>安全提醒</b><p>${selected.day === 2 ? "国道路段较长，建议白天通过并提前下载离线地图。" : "当前路段基础风险较低，仍请关注路况。"}</p></article>`;
}

function generatePlan() {
  $("#planStatus").textContent = "分析中";
  $("#generateButton").disabled = true;
  window.setTimeout(() => {
    state.plan = buildPlan({ start: $("#startInput").value, end: $("#endInput").value, days: $("#daysInput").value, totalDistance: $("#distanceInput").value, intensity: state.intensity });
    state.selectedDay = Math.min(2, state.plan.query.days);
    $("#planStatus").textContent = "已生成";
    $("#generateButton").disabled = false;
    renderPlan(); showToast("AI 骑行方案已生成");
  }, 420);
}

function openDrawer(reason) {
  state.adjustmentReason = reason;
  state.pendingAdjustment = null;
  $("#adjustmentContext").textContent = `当前变化：${reasonLabels[reason]}`;
  $("#adjustmentPreview").hidden = true;
  $("#confirmAdjustment").disabled = true;
  $("#adjustmentDrawer").hidden = false;
  $("#drawerBackdrop").hidden = false;
}

function closeDrawer() { $("#adjustmentDrawer").hidden = true; $("#drawerBackdrop").hidden = true; state.pendingAdjustment = null; }

function createAdjustment() {
  state.pendingAdjustment = buildAdjustment(state.plan, { reason: state.adjustmentReason, progressKm: Number($("#progressInput").value), fatigue: $("#fatigueInput").value });
  const item = state.pendingAdjustment;
  $("#adjustmentPreview").innerHTML = `<span class="eyebrow">调整影响预览</span><h3>建议提前在${item.nextEndpoint}停留</h3><p>${item.explanation}</p><div class="comparison"><span>Day 2 里程<b>${item.before.day2Distance}km → ${item.after.day2Distance}km</b></span><span>补给空窗<b>${item.before.supplyGaps} 段 → ${item.after.supplyGaps} 段</b></span><span>综合风险<b>${item.before.riskLevel} → ${item.after.riskLevel}</b></span></div>`;
  $("#adjustmentPreview").hidden = false;
  $("#confirmAdjustment").disabled = false;
}

function confirmAdjustment() {
  if (!state.pendingAdjustment) return;
  state.plan = { ...state.plan, itinerary: state.pendingAdjustment.revisedItinerary, riskLevel: state.pendingAdjustment.after.riskLevel };
  renderPlan(); closeDrawer(); showToast("已重新规划，Day 2 终点更新为丹棱");
}

function showToast(text) { const toast = $("#toast"); toast.textContent = text; toast.classList.add("show"); window.setTimeout(() => toast.classList.remove("show"), 2200); }

function bindEvents() {
  $$("[data-intensity]").forEach((button) => button.addEventListener("click", () => { state.intensity = button.dataset.intensity; $$("[data-intensity]").forEach((item) => item.classList.toggle("active", item === button)); $("#intensityHelp").textContent = intensityHelp[state.intensity]; }));
  $$("[data-layer]").forEach((button) => button.addEventListener("click", () => { const layer = button.dataset.layer; button.classList.toggle("active"); button.classList.contains("active") ? state.activeLayers.add(layer) : state.activeLayers.delete(layer); $$(`[data-marker="${layer}"]`).forEach((marker) => marker.classList.toggle("hidden", !state.activeLayers.has(layer))); }));
  $$("[data-adjust]").forEach((button) => button.addEventListener("click", () => openDrawer(button.dataset.adjust)));
  $("#generateButton").addEventListener("click", generatePlan); $("#adjustButton").addEventListener("click", () => openDrawer("fatigue"));
  $("#createAdjustment").addEventListener("click", createAdjustment); $("#confirmAdjustment").addEventListener("click", confirmAdjustment);
  $("#cancelAdjustment").addEventListener("click", closeDrawer); $("#drawerClose").addEventListener("click", closeDrawer); $("#drawerBackdrop").addEventListener("click", closeDrawer);
  $("#saveButton").addEventListener("click", () => showToast("当前骑行方案已保存"));
  $("#resetButton").addEventListener("click", () => { $("#startInput").value = "成都"; $("#endInput").value = "乐山"; $("#daysInput").value = 3; $("#distanceInput").value = 246; state.intensity = "standard"; state.selectedDay = 2; state.plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" }); renderPlan(); showToast("已恢复默认示例"); });
}

state.plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" });
bindEvents(); renderPlan();
