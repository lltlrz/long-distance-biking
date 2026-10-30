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

test("low fidelity model covers every agreed state", () => {
  const lowfi = readFileSync("docs/05-low-fidelity-prototype-v2.md", "utf8");
  for (const heading of ["规划输入", "规划结果", "每日详情", "补给图层", "动态调整", "影响预览", "异常状态"]) {
    assert.match(lowfi, new RegExp(heading));
  }
});

test("V2 demo has accessible adjustment controls", () => {
  const html = readFileSync("demo-v2/index.html", "utf8");
  for (const id of ["generateButton", "dayCards", "adjustmentDrawer", "adjustmentPreview", "confirmAdjustment", "cancelAdjustment", "saveButton"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=["']polite["']/);
});

test("Figma V2 documentation records the duplicate and interaction flow", () => {
  const figma = readFileSync("docs/06-figma-high-fidelity-prototype-v2.md", "utf8");
  assert.match(figma, /骑迹计划 V2 - 高低保真模型/);
  assert.match(figma, /https:\/\/www\.figma\.com\//);
  for (const phrase of ["低保真", "高保真", "动态调整", "影响预览", "确认重新规划"]) {
    assert.match(figma, new RegExp(phrase));
  }
});

test("mobile layout prevents form and header overflow", () => {
  const css = readFileSync("demo-v2/styles.css", "utf8");
  assert.match(css, /\.workspace>\*\{min-width:0\}/);
  assert.match(css, /\.two-col>label\{min-width:0\}/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /\.topbar\{flex-wrap:wrap/);
});
