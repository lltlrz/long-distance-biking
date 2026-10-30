# RidePilot Agent 架构与实施记录

## 实施方案
复用原 HTML/CSS/JS 页面，新增 agent.js 接管生成、保存和调整入口。Python 提供单一 Agent，不引入框架、数据库或微服务。先数据工具、再 Agent、再前端、再测试与文档。

## 分工与工作流
FastAPI 接收 Pydantic 请求。无配置时使用明确标注的有限中文规则；配置 API key 和 model 后使用 OpenAI SDK chat.completions 的 tools 参数。模型选择函数及参数，后端通过工具白名单和 Pydantic 校验调用 Python，将结果以 role=tool 和 tool_call_id 回传，继续决策，最多五轮。最终回复必须为 JSON。结构化行程仅取成功工具输出，不采用模型生成的路线字段。每次调用记录参数、结果和状态。模型服务失败返回 502，不伪装成功或悄悄降级。

- get_route_summary：验证示例路线，枚举候选分日组合，保证总里程和每日里程上限。
- search_supply_pois：返回七种模拟 POI，标注来源、营业未知及可信度。
- calculate_supply_gaps：按路线里程位置计算含首尾区间的补给间隔，阈值25/35/50km。
- score_stop_candidates：Pandas 计算住宿40%、补给25%、里程20%、安全15%。安全偏好筛除低安全评分候选。
- analyze_route_risks：截取对应路段示例风险，叠加补给及用户天气、时间条件。
- replan_itinerary：当天已完成里程转换为全程位置，按时间、疲劳、天气计算可达范围，选择住宿候选，重算余程。不可行时返回 after=null。不会修改输入行程。

## 确认机制
服务器无持久化行程，响应只含 before/after/confirmed=false。前端保留 pending，确认才替换当前计划，取消清除建议。保存通过 localStorage 存到浏览器。

## 数据与限制
路线246km、所有位置、爬升、POI、服务评分、路段风险均为模拟；地图仍是原静态示意，不能导航。天气仅为用户报告。真实模型自然语言解释仍需人工核实，提示词不能绝对杜绝幻觉。规则模式仅支持有限中文表达，缺失状态询问用户。当前不提供服务端会话、身份认证或公网部署保护。

## 后续扩展
以同样输出契约替换 sample_data：地图提供折线和沿线累计距离；POI 提供营业时间、查询时间与可信度；天气提供观测时间、位置与供应商。每项保留独立来源，未知字段不自动填真值。增加路线版本与建议版本检查后再支持多人共享及持久化。

## 目录整理
服务入口调整为根目录 app.py，业务代码位于 ridepilot/，当前页面位于 frontend/，Python 测试合并至 tests/。启动使用 `python -m uvicorn app:app --reload`。保留 demo-v2 原型及其测试路径。本次整理后 Python 7 项测试通过，frontend/agent.js 语法检查通过。
