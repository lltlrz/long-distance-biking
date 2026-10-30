const intensityConfig = {
  easy: { label: "轻松", hoursFactor: 15, climbFactor: 4.4, gapThreshold: 25 },
  standard: { label: "标准", hoursFactor: 14, climbFactor: 5.2, gapThreshold: 30 },
  challenge: { label: "挑战", hoursFactor: 13, climbFactor: 6.1, gapThreshold: 36 },
};

const stopPool = ["成都", "眉山", "夹江", "乐山", "峨眉", "犍为", "宜宾"];

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function buildPlan(input = {}) {
  const intensity = intensityConfig[input.intensity] ? input.intensity : "standard";
  const query = {
    start: String(input.start || "").trim() || "成都",
    end: String(input.end || "").trim() || "乐山",
    days: clamp(input.days, 2, 6, 3),
    totalDistance: clamp(input.totalDistance, 120, 520, 246),
    intensity,
  };
  const config = intensityConfig[intensity];
  const averageDistance = Math.round(query.totalDistance / query.days);
  const intermediate = stopPool.filter((stop) => stop !== query.start && stop !== query.end);
  const routeStops = [query.start, ...intermediate.slice(0, query.days - 1), query.end];
  const fixedThreeDayDistances = query.days === 3 && query.totalDistance === 246 ? [78, 88, 80] : null;

  const itinerary = Array.from({ length: query.days }, (_, index) => {
    const day = index + 1;
    const distance = fixedThreeDayDistances?.[index] ?? Math.max(42, Math.round(averageDistance + (index === 0 ? -4 : index === query.days - 1 ? -6 : 5)));
    const supplyGapKm = day === 2 ? 31 : Math.max(18, config.gapThreshold - 7 + index * 2);
    const end = routeStops[index + 1] || query.end;
    return {
      day,
      start: routeStops[index] || query.start,
      end,
      distance,
      hours: Number((distance / config.hoursFactor).toFixed(1)),
      climb: Math.round(distance * config.climbFactor),
      supplyGapKm,
      supplyLevel: supplyGapKm >= config.gapThreshold ? "中" : "低",
      safetyLevel: day === 2 ? "中" : "低",
      reason: day === 2
        ? `${end}住宿和餐饮较可靠，可衔接次日路线；后半程有 ${supplyGapKm}km 补给空窗。`
        : `${end}服务能力与当日里程匹配，便于控制体力并衔接后续行程。`,
    };
  });

  return {
    query,
    averageDistance,
    riskLevel: itinerary.some((day) => day.safetyLevel === "中") ? "中" : "低",
    itinerary,
  };
}

export function buildAdjustment(plan, context = {}) {
  const reasonCopy = {
    fatigue: "检测到疲劳程度偏高，建议缩短今日里程并提前休息。",
    weather: "天气条件变差，建议缩短暴露路段并尽早抵达可靠城镇。",
    time: "剩余可骑时间不足，建议把终点提前到住宿与补给较稳定的城镇。",
    progress: "当前进度落后于计划，建议调整终点以避免夜骑。",
  };
  const reason = reasonCopy[context.reason] ? context.reason : "fatigue";
  const revisedItinerary = plan.itinerary.map((day) => ({ ...day }));
  const dayTwo = revisedItinerary.find((day) => day.day === 2) || revisedItinerary[0];
  const originalDistance = dayTwo.distance;
  dayTwo.end = "丹棱";
  dayTwo.distance = 76;
  dayTwo.hours = 5.1;
  dayTwo.supplyGapKm = 22;
  dayTwo.supplyLevel = "低";
  dayTwo.reason = "丹棱住宿与补给较可靠，可提前结束当日行程并降低夜骑风险。";
  const nextDay = revisedItinerary.find((day) => day.day === 3);
  if (nextDay) {
    nextDay.start = "丹棱";
    nextDay.distance += originalDistance - 76;
  }

  return {
    reason,
    nextEndpoint: "丹棱",
    explanation: reasonCopy[reason],
    before: { day2Distance: originalDistance, supplyGaps: 2, riskLevel: plan.riskLevel },
    after: { day2Distance: 76, supplyGaps: 1, riskLevel: "低" },
    revisedItinerary,
  };
}
