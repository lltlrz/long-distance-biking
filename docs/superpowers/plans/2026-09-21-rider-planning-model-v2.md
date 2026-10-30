# 骑迹计划 V2 高低保真模型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不覆盖任何原模型的前提下，交付一致的 V2 低保真文档、Figma 高低保真副本和可交互 HTML Demo。

**Architecture:** 以现有三栏 Demo 为视觉与交互基线，复制到 `demo-v2/` 后增量实现 AI 推荐解释和动态调整状态机。文档与 Figma 使用同一字段、同一成都至乐山示例和同一主流程；自动检查负责验证新旧文件隔离和关键内容一致性。

**Tech Stack:** Markdown、HTML5、CSS3、原生 JavaScript、Node.js 内置测试运行器、Figma、浏览器视觉验证

---

## 文件结构

- `docs/05-low-fidelity-prototype-v2.md`：V2 低保真线框、页面状态和交互说明。
- `docs/06-figma-high-fidelity-prototype-v2.md`：Figma 副本链接、页面清单、组件与交互说明。
- `demo-v2/index.html`：V2 工作台语义结构、调整抽屉、影响预览和 Toast。
- `demo-v2/styles.css`：三栏布局、状态卡、抽屉、风险与响应式视觉。
- `demo-v2/plan-engine.js`：纯函数规划数据和动态调整计算，便于测试。
- `demo-v2/script.js`：DOM 渲染、事件绑定和 UI 状态机。
- `tests/demo-v2-plan-engine.test.mjs`：规划、调整、取消和异常输入的单元测试。
- `tests/v2-artifacts.test.mjs`：三类交付物一致性与原文件隔离检查。

### Task 1: 建立 V2 副本边界与工件检查

**Files:**
- Create: `tests/v2-artifacts.test.mjs`
- Create: `demo-v2/index.html`
- Create: `demo-v2/styles.css`
- Create: `demo-v2/script.js`

- [ ] **Step 1: 记录原模型校验值**

Run:

```powershell
Get-FileHash docs\05-low-fidelity-prototype.md,docs\06-figma-high-fidelity-prototype.md,demo\index.html,demo\styles.css,demo\script.js -Algorithm SHA256
```

Expected: 输出 5 个原文件的 SHA256；将结果保留在本次执行记录中，最终任务再次比对。

- [ ] **Step 2: 写入失败的工件隔离测试**

```js
// tests/v2-artifacts.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "docs/05-low-fidelity-prototype-v2.md",
  "docs/06-figma-high-fidelity-prototype-v2.md",
  "demo-v2/index.html",
  "demo-v2/styles.css",
  "demo-v2/script.js",
  "demo-v2/plan-engine.js",
];

test("all V2 artifacts use new paths", () => {
  for (const file of required) assert.equal(existsSync(file), true, `${file} missing`);
});

test("V2 demo exposes the agreed adjustment flow", () => {
  const html = readFileSync("demo-v2/index.html", "utf8");
  for (const phrase of ["生成 AI 骑行方案", "体力下降", "天气变化", "时间不足", "进度滞后", "确认重新规划"]) {
    assert.match(html, new RegExp(phrase));
  }
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `node --test tests/v2-artifacts.test.mjs`

Expected: FAIL，指出 V2 文档或 `demo-v2/plan-engine.js` 尚不存在。

- [ ] **Step 4: 复制现有 Demo 到新目录**

Run:

```powershell
New-Item -ItemType Directory -Force demo-v2
Copy-Item demo\index.html,demo\styles.css,demo\script.js -Destination demo-v2
```

Expected: `demo-v2/` 包含三个副本，`demo/` 内容不变。

- [ ] **Step 5: 提交副本边界**

```powershell
git add tests/v2-artifacts.test.mjs demo-v2
git commit -m "chore: establish V2 artifact copies"
```

### Task 2: 编写 V2 低保真模型

**Files:**
- Create: `docs/05-low-fidelity-prototype-v2.md`
- Modify: `tests/v2-artifacts.test.mjs`

- [ ] **Step 1: 扩展失败的一致性测试**

在 `tests/v2-artifacts.test.mjs` 追加：

```js
test("low fidelity model covers every agreed state", () => {
  const lowfi = readFileSync("docs/05-low-fidelity-prototype-v2.md", "utf8");
  for (const heading of ["规划输入", "规划结果", "每日详情", "补给图层", "动态调整", "影响预览", "异常状态"]) {
    assert.match(lowfi, new RegExp(heading));
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/v2-artifacts.test.mjs`

Expected: FAIL，提示 `docs/05-low-fidelity-prototype-v2.md` 不存在。

- [ ] **Step 3: 创建完整低保真文档**

文档必须按以下顺序提供 ASCII 线框和交互注释：

```markdown
# 骑迹计划 V2 低保真模型

## 1. 设计目标与范围
## 2. 页面及状态总览
## 3. 规划输入
## 4. 规划结果
## 5. 每日详情与 AI 推荐解释
## 6. 补给图层与补给空窗
## 7. 动态调整抽屉
## 8. 调整影响预览
## 9. 保存与异常状态
## 10. 原型交互映射
```

每个线框使用相同示例：成都至乐山、3 天、246km、Day 2 眉山至夹江、31km 补给空窗；动态调整示例使用“疲劳较高，Day 2 终点从夹江调整为丹棱”。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/v2-artifacts.test.mjs`

Expected: 低保真状态测试 PASS；Figma 说明与引擎文件相关测试仍可能失败。

- [ ] **Step 5: 提交低保真模型**

```powershell
git add docs/05-low-fidelity-prototype-v2.md tests/v2-artifacts.test.mjs
git commit -m "docs: add V2 low fidelity prototype"
```

### Task 3: 抽离并测试规划引擎

**Files:**
- Create: `demo-v2/plan-engine.js`
- Create: `tests/demo-v2-plan-engine.test.mjs`
- Modify: `demo-v2/index.html`

- [ ] **Step 1: 写规划与调整失败测试**

```js
// tests/demo-v2-plan-engine.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, buildAdjustment } from "../demo-v2/plan-engine.js";

test("buildPlan returns explainable three-day itinerary", () => {
  const plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" });
  assert.equal(plan.itinerary.length, 3);
  assert.equal(plan.averageDistance, 82);
  assert.ok(plan.itinerary.every((day) => day.reason.length > 0));
  assert.ok(plan.itinerary.some((day) => day.supplyGapKm >= 31));
});

test("fatigue adjustment moves Day 2 endpoint and preserves original input", () => {
  const plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" });
  const original = structuredClone(plan);
  const suggestion = buildAdjustment(plan, { reason: "fatigue", progressKm: 46, fatigue: "high" });
  assert.equal(suggestion.nextEndpoint, "丹棱");
  assert.equal(suggestion.before.day2Distance, 88);
  assert.equal(suggestion.after.day2Distance, 76);
  assert.deepEqual(plan, original);
});

test("invalid inputs are normalized", () => {
  const plan = buildPlan({ start: "", end: "", days: 1, totalDistance: 0, intensity: "unknown" });
  assert.equal(plan.query.start, "成都");
  assert.equal(plan.query.end, "乐山");
  assert.equal(plan.query.days, 2);
  assert.equal(plan.query.intensity, "standard");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/demo-v2-plan-engine.test.mjs`

Expected: FAIL，提示 `plan-engine.js` 不存在或未导出函数。

- [ ] **Step 3: 实现纯函数接口**

`demo-v2/plan-engine.js` 必须导出：

```js
export function buildPlan(query) {
  // 规范化 start、end、days、totalDistance、intensity；
  // 返回 { query, averageDistance, riskLevel, itinerary }；
  // itinerary 项包含 day、start、end、distance、hours、climb、supplyGapKm、supplyLevel、safetyLevel、reason。
}

export function buildAdjustment(plan, context) {
  // 不修改 plan；返回 { reason, nextEndpoint, explanation, before, after, revisedItinerary }。
}
```

实现中固定三日示例的 Day 2 为 88km、建议调整后 76km；其他天数按总里程平均值生成，保证每一日均有推荐理由。

- [ ] **Step 4: 将脚本切换为 ES Module**

在 `demo-v2/index.html` 中把脚本引用改为：

```html
<script type="module" src="script.js"></script>
```

- [ ] **Step 5: 运行引擎测试**

Run: `node --test tests/demo-v2-plan-engine.test.mjs`

Expected: 3 tests PASS。

- [ ] **Step 6: 提交规划引擎**

```powershell
git add demo-v2/plan-engine.js demo-v2/index.html tests/demo-v2-plan-engine.test.mjs
git commit -m "feat: add testable V2 planning engine"
```

### Task 4: 实现 V2 工作台结构与动态调整交互

**Files:**
- Modify: `demo-v2/index.html`
- Modify: `demo-v2/script.js`
- Modify: `tests/v2-artifacts.test.mjs`

- [ ] **Step 1: 写失败的结构测试**

在 `tests/v2-artifacts.test.mjs` 追加：

```js
test("V2 demo has accessible adjustment controls", () => {
  const html = readFileSync("demo-v2/index.html", "utf8");
  for (const id of ["generateButton", "dayCards", "adjustmentDrawer", "adjustmentPreview", "confirmAdjustment", "cancelAdjustment", "saveButton"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=["']polite["']/);
});
```

- [ ] **Step 2: 运行工件测试并确认失败**

Run: `node --test tests/v2-artifacts.test.mjs`

Expected: FAIL，指出新增抽屉或预览控件缺失。

- [ ] **Step 3: 更新 HTML 结构**

在左栏加入 `.ride-status-actions` 四个按钮；在右栏加入 `#recommendationReason`；在 `</main>` 后加入：

```html
<div class="drawer-backdrop" id="drawerBackdrop" hidden></div>
<aside class="adjustment-drawer" id="adjustmentDrawer" aria-labelledby="adjustmentTitle" hidden>
  <h2 id="adjustmentTitle">调整后续行程</h2>
  <p id="adjustmentContext"></p>
  <label>当前完成距离 <input id="progressInput" type="number" value="46" min="0"></label>
  <label>疲劳程度
    <select id="fatigueInput"><option value="low">较低</option><option value="medium">一般</option><option value="high">较高</option></select>
  </label>
  <button id="createAdjustment" type="button">生成调整建议</button>
  <section id="adjustmentPreview" hidden aria-live="polite"></section>
  <button id="confirmAdjustment" type="button" disabled>确认重新规划</button>
  <button id="cancelAdjustment" type="button">取消</button>
</aside>
```

- [ ] **Step 4: 重写 UI 状态机**

`demo-v2/script.js` 从 `plan-engine.js` 导入 `buildPlan` 和 `buildAdjustment`，并维护：

```js
const state = {
  intensity: "standard",
  selectedDay: 2,
  plan: null,
  pendingAdjustment: null,
  activeLayers: new Set(["food", "store", "hotel", "town", "repair"]),
};
```

事件规则：生成按钮替换 `state.plan`；每日卡片只更新 `selectedDay`；状态按钮只打开抽屉；生成建议只写入 `pendingAdjustment`；确认后才替换 `plan.itinerary`；取消时清空 `pendingAdjustment` 且不修改 `plan`。

- [ ] **Step 5: 运行语法和结构测试**

Run:

```powershell
node --check demo-v2\script.js
node --test tests\v2-artifacts.test.mjs tests\demo-v2-plan-engine.test.mjs
```

Expected: 语法检查通过，所有测试 PASS。

- [ ] **Step 6: 提交工作台交互**

```powershell
git add demo-v2/index.html demo-v2/script.js tests/v2-artifacts.test.mjs
git commit -m "feat: add V2 dynamic replanning flow"
```

### Task 5: 完成 V2 视觉与响应式布局

**Files:**
- Modify: `demo-v2/styles.css`

- [ ] **Step 1: 添加状态与抽屉视觉**

新增样式职责：

```css
.ai-reason-card { background:#eef8f3; border:1px solid #cfe6d9; border-radius:12px; }
.ride-status-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.change-positive { color:#19714f; }
.change-warning { color:#b85c24; }
.drawer-backdrop { position:fixed; inset:0; background:rgba(10,31,25,.36); z-index:20; }
.adjustment-drawer { position:fixed; top:0; right:0; width:min(420px,100%); height:100vh; z-index:21; overflow:auto; background:#fff; box-shadow:-16px 0 40px rgba(16,48,39,.18); }
```

补齐抽屉表单、前后对比、生成中和失败状态；沿用现有 CSS 变量，不引入新框架。

- [ ] **Step 2: 添加窄屏规则**

在 `@media (max-width: 900px)` 中保证 `.workspace` 按规划面板、地图、详情面板顺序单列；地图最小高度 520px；抽屉宽度为 100%；按钮触控高度不小于 40px。

- [ ] **Step 3: 启动本地预览并检查桌面布局**

Run: `python -m http.server 8000`

Expected: `http://localhost:8000/demo-v2/` 可打开；1440×900 下显示三栏，无横向溢出。

- [ ] **Step 4: 检查窄屏布局**

在浏览器 390×844 视口检查规划、地图、详情顺序，打开调整抽屉并确认所有字段和按钮可操作。

- [ ] **Step 5: 提交视觉样式**

```powershell
git add demo-v2/styles.css
git commit -m "style: polish V2 planning workspace"
```

### Task 6: 创建 Figma 高低保真副本

**Files:**
- Create: `docs/06-figma-high-fidelity-prototype-v2.md`
- Modify: `tests/v2-artifacts.test.mjs`

- [ ] **Step 1: 写失败的 Figma 说明测试**

在 `tests/v2-artifacts.test.mjs` 追加：

```js
test("Figma V2 documentation records the duplicate and interaction flow", () => {
  const figma = readFileSync("docs/06-figma-high-fidelity-prototype-v2.md", "utf8");
  assert.match(figma, /骑迹计划 V2 - 高低保真模型/);
  assert.match(figma, /https:\/\/www\.figma\.com\//);
  for (const phrase of ["低保真", "高保真", "动态调整", "影响预览", "确认重新规划"]) {
    assert.match(figma, new RegExp(phrase));
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/v2-artifacts.test.mjs`

Expected: FAIL，提示 V2 Figma 说明不存在。

- [ ] **Step 3: 在 Figma 中复制原文件**

打开原链接 `https://www.figma.com/design/uek2SBQw8A3WZPxa8WvLn0`，使用 Duplicate to drafts 创建副本并命名为 `骑迹计划 V2 - 高低保真模型`。不得在原文件内新增、删除或移动节点。

- [ ] **Step 4: 建立页面结构**

副本内建立 `00 Cover`、`01 Low Fidelity`、`02 High Fidelity`、`03 Components` 四个页面。低保真和高保真均包含：规划输入、规划结果、每日详情、补给图层、动态调整抽屉、影响预览、保存成功、生成失败八个 Frame。

- [ ] **Step 5: 更新高低保真画面**

按规格统一成都至乐山示例、状态文案和颜色语义；组件页至少包含按钮、分段控件、状态标签、每日卡片、AI 推荐理由卡、风险卡、补给图标、抽屉表单和影响对比组件。

- [ ] **Step 6: 建立原型连线**

建立“生成方案 → 规划结果 → 打开调整 → 生成建议 → 影响预览 → 确认重新规划 → 更新结果 → 保存成功”的点击路径；取消调整返回未变化的规划结果。

- [ ] **Step 7: 创建 Figma V2 说明**

`docs/06-figma-high-fidelity-prototype-v2.md` 记录副本名称与链接、页面结构、Frame 清单、组件、交互连线、视觉规范、与 Demo 对应关系及原文件未修改声明。

- [ ] **Step 8: 运行工件测试并提交**

Run: `node --test tests/v2-artifacts.test.mjs`

Expected: 所有工件测试 PASS。

```powershell
git add docs/06-figma-high-fidelity-prototype-v2.md tests/v2-artifacts.test.mjs
git commit -m "docs: record V2 Figma prototype"
```

### Task 7: 完整验证与交付

**Files:**
- Verify: `docs/05-low-fidelity-prototype-v2.md`
- Verify: `docs/06-figma-high-fidelity-prototype-v2.md`
- Verify: `demo-v2/`
- Verify: `tests/`

- [ ] **Step 1: 运行全部自动检查**

Run:

```powershell
node --check demo-v2\plan-engine.js
node --check demo-v2\script.js
node --test tests\demo-v2-plan-engine.test.mjs tests\v2-artifacts.test.mjs
```

Expected: 语法检查退出码 0；全部测试 PASS。

- [ ] **Step 2: 执行浏览器主流程**

依次验证生成、强度切换、图层筛选、每日卡片联动、四类途中状态入口、生成建议、取消、确认、保存与重置。Expected: 控件反馈正确，取消不会改动原计划，确认后数值和终点同步更新。

- [ ] **Step 3: 核对三类交付物**

对照 `docs/superpowers/specs/2026-09-21-rider-planning-model-v2-design.md`，逐项核对页面名称、字段、成都至乐山示例、31km 补给空窗、丹棱调整建议和异常状态。

- [ ] **Step 4: 重新计算原模型校验值**

Run:

```powershell
Get-FileHash docs\05-low-fidelity-prototype.md,docs\06-figma-high-fidelity-prototype.md,demo\index.html,demo\styles.css,demo\script.js -Algorithm SHA256
```

Expected: 与 Task 1 记录完全一致。

- [ ] **Step 5: 检查版本状态**

Run: `git status --short`

Expected: 只显示用户原有的未提交修改或与本任务明确相关的 V2 文件；原模型文件不应显示为本任务新增修改。

- [ ] **Step 6: 提交最终验证修正**

如验证产生必要修正，仅提交 V2 文件：

```powershell
git add docs/05-low-fidelity-prototype-v2.md docs/06-figma-high-fidelity-prototype-v2.md demo-v2 tests
git commit -m "test: verify V2 prototype artifacts"
```
