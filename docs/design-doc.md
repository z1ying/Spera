# Design Document — ImpactLink（TPW 影响数据框架）

**赛事**：Hack for Social Impact 2026，Justice Reform 赛道，合作方 Transformative Programming Works（TPW）
**时间盒**：2026-10-24 09:00 – 10-25 18:00（约 33 小时，含睡眠实际可开发约 16–20 小时）
**配套文档**：`hsi-tpw-prep.md`（战略准备稿，本文档的上游；冲突时以本文档为准）

---

## 0. 给执行 Agent 的说明（先读这一节）

- **你的任务**：按第 11 节的构建顺序实现本系统，每个里程碑跑完其验收清单再进入下一个。不要跳步。
- **已锁定决策**（第 2 节）：不得自行更换技术栈、口径、校准锚。若发现锁定项不可行，停下来在 `DECISIONS.md` 记录原因并选择本文档给出的备选，不要静默改道。
- **你的裁量区**：组件内部实现、样式细节、变量命名、非关键文案。
- **完成定义**：第 15 节成功标准全部可勾选 + 演示模式可离线完整跑通 3 分钟动线（第 10 节）。
- **禁止事项**：不接入任何真实个人数据；不把合成数据标注为真实数据；不在演示路径上依赖未缓存的外部 API 调用。

---

## 1. 产品概述

### 1.1 一句话

把 120 家社区组织（CBO）各自的过程数据（报名/出勤/完成）与结果数据（释放后被捕/定罪/再入狱）用假名化钥匙拼起来，按 CDCR 官方口径算出影响，并一键生成资方级报告。

### 1.2 用户与场景

| 用户 | 场景 | 成功长这样 |
|---|---|---|
| TPW 政策/倡导人员 | 准备议会游说材料（BRIGHT/RIGHT 拨款，$2,000–2,500 万量级） | 5 分钟产出一页带口径脚注的影响报告 |
| CBO 项目负责人 | 每季度交数据给 TPW | 上传自己的脏表格，系统自动对齐 schema 并回执数据质量等级 |
| 资助方/议员办公室 | 审阅影响证据 | 数字可追溯到定义与来源，保守口径经得起追问 |

### 1.3 非目标（本期不做）

- 真实 CDCR/假释数据接口（法律与权限问题，只做文件导入）
- 个案管理（case management）功能
- 预测性风险评分（伦理红线：不给个人打"再犯风险"分，只做群体统计）

---

## 2. 锁定技术决策

| 项 | 锁定 | 备选（仅当锁定项不可行） |
|---|---|---|
| 形态 | Next.js（App Router）+ TypeScript 单体应用 | — |
| 数据库 | SQLite（单文件 `data/impactlink.db`），Prisma ORM | — |
| 样式 | Tailwind CSS | — |
| 图表 | Recharts | — |
| 字段映射 LLM | Gemini API（赛事赞助商，现场发放 credits）；调用点仅在导入向导 | 无 key 时降级为规则映射（列名模糊匹配 + 人工选择），功能不中断 |
| 报告导出 | 报告页专用打印样式，浏览器打印为 PDF | — |
| 部署 | 本机 `localhost:3000` 演示；数据与缓存全部本地 | 同步部署一份 Vercel 只读演示（有时间才做） |
| 随机种子 | 合成数据生成器固定 seed = 42，结果可复现 | — |

**演示模式开关**：环境变量 `DEMO_MODE=1` 时，LLM 映射改为回放预缓存结果，断网可完整演示。

---

## 3. 仓库结构

```
impactlink/
  prisma/schema.prisma        # 第 4 节数据模型
  data/                       # SQLite 文件 + 种子 CSV（git 忽略 db）
  scripts/
    generate_synthetic.ts     # 第 5 节生成器
    validate_synthetic.ts     # 第 5.4 节校验器
    seed.ts                   # 生成 → 校验 → 入库 一条龙
  src/
    app/
      page.tsx                # 总览仪表盘
      import/page.tsx         # 导入向导
      orgs/[id]/page.tsx      # 机构详情
      report/page.tsx         # 一键报告（打印优化）
      api/ ...                # 导入、映射、指标接口
    lib/
      metrics.ts              # 第 7 节指标引擎（纯函数，可单测）
      mapping.ts              # 第 6 节映射逻辑 + Gemini 封装
      privacy.ts              # 假名化 + 小单元抑制
    components/ ...
  tests/metrics.test.ts       # 指标引擎单元测试（第 7.4 节用例）
  DECISIONS.md                # 执行期决策日志
```

---

## 4. 数据模型（Prisma / SQL 等价定义）

```sql
Organization(id TEXT PK, name TEXT, program_types TEXT /*JSON*/, facilities TEXT /*JSON*/, data_grade TEXT /*A|B|C*/)
Program(id TEXT PK, org_id FK, name TEXT, type TEXT /*education|vocational|sud|restorative|reentry|other*/,
        facility TEXT, start_date DATE, end_date DATE)
Participant(participant_key TEXT PK /*哈希假名, 见 4.1*/, release_year INT, age_band TEXT, gender TEXT, risk_band TEXT)
Enrollment(id TEXT PK, participant_key FK, program_id FK, enroll_date DATE,
           status TEXT /*enrolled|completed|dropped*/, completion_date DATE NULL,
           credits TEXT /*JSON: {MCC:bool, RACC:bool, EMC:bool}*/)
Outcome(id TEXT PK, participant_key FK, event_type TEXT /*arrest|conviction|return_to_custody*/,
        event_date DATE, offense_level TEXT /*felony|misdemeanor*/)
CostParam(key TEXT PK, value REAL, source TEXT, year INT)
  -- 预置: avg_cost_year=127788 (LAO 2025-26), marginal_cost_year=21534 (LAO 2025-26),
  --       baseline_conviction_3yr=0.391 (CDCR FY2019-20)
ImportJob(id TEXT PK, org_id FK, file_name TEXT, status TEXT, mapping TEXT /*JSON*/, issues TEXT /*JSON*/, created_at DATETIME)
```

### 4.1 假名化规则（`privacy.ts`）

- **（v1.6 修订）** `participant_key = HMAC-SHA256(NETWORK_KEY, normalize(CDCR 编号))`。CDCR 编号是过程侧（机构）与结果侧（CDCR/假释/法院）都记录的公共标识；NETWORK_KEY 由 TPW 作为数据管理方保管，只发给各数据源本地运行的哈希工具，中心库只收 key、永不存密钥。用 HMAC 而非裸 SHA-256：CDCR 编号短且格式固定，裸哈希可被穷举反推。原"机构内 ID + 机构私有盐"方案作废——结果系统拿不到机构内 ID 和盐，两半数据在现实中无法 join（见 §23）。
- 所有聚合查询过 `suppressSmallCells()`：分组 n < 10 的结果替换为 `"<10"` 并不参与图表绘制。
- 数据库中禁止出现姓名、出生日期、案号字段——schema 层面就不存在。

---

## 5. 合成数据生成器（scripts/generate_synthetic.ts）

### 5.1 规模与结构

- 8 家虚构 CBO（规模不一：年服务量 80–600 人），3 个释放队列（2021/2022/2023），参与者总量 **5,000 ± 5%**。
- 每名参与者：报名 1 个项目 → 完成/辍学 → 学分 → 释放 → 3 年随访结果事件。

### 5.2 概率链（初始参数，生成后按 5.4 微调至命中锚点）

| 环节 | 参数 |
|---|---|
| 完成率 | 教育 0.72 / 职业 0.68 / 戒瘾 0.55 / 修复性司法 0.75 / 重返支持 0.80 |
| 完成者获学分 | 任一学分 0.65；其中 EMC 0.30、RACC 0.28、MCC 0.42（可重叠） |
| 三年定罪概率（按最高学分层） | 无学分 0.456 / 有任一学分 0.392 / EMC 0.261 / RACC 0.211 |
| 未报名对照组 | 另生成 2,000 名"未参与"合成对照，定罪率 0.456（与无学分层同锚） |
| 事件时间 | 定罪事件日期在释放后 3 年内按递减风险分布（第 1 年占比 ~45%） |

### 5.3 脏度注入（生成即带毛病，这是演示的一部分）

- 3 份机构导出表使用 3 种风格：① 英文标准列名 ② 缩写列名（`PrtcpntID, ProgNm, StrtDt`）③ 西班牙语列名
- 5% 单元格缺失；2% 重复行；日期混用 `MM/DD/YYYY`、`YYYY-MM-DD`、`DD-Mon-YY` 三种格式
- 项目名同义异写（如 "GED Prep" / "GED Preparation" / "ged-prep"）
- 结果数据单独一份 outcomes 文件（模拟外部系统导出），字段风格与机构表完全不同

### 5.4 校验器（scripts/validate_synthetic.ts）——验收门槛

生成后自动输出对照表，**全部满足才可入库**：

- [ ] 各学分层三年定罪率与锚点偏差 ≤ 2 个百分点
- [ ] 参与者总量 ∈ [4750, 5250]；每队列 ≥ 1,400 人
- [ ] 漏斗单调：报名 ≥ 完成 ≥ 获学分
- [ ] 无 participant_key 重复；无完成日期早于报名日期（脏数据注入到原始 CSV，清洗后
...[truncated 9691 chars]
---

## 6. 导入管线（src/lib/mapping.ts + 导入向导）

### 6.1 流程

1. 上传 CSV → 解析前 20 行样本 + 列名清单
2. 映射建议：Gemini 输入（列名 + 3 行样本 + 目标 schema 字段说明）→ 输出每列的 `{target_field, confidence}`；置信度 ≥ 0.8 自动预选，< 0.8 标红待人工确认
3. 人工确认页：逐列下拉修正 → 保存为该机构映射模板
4. 清洗入库：日期多格式解析（`MM/DD/YYYY`、`YYYY-MM-DD`、`DD-Mon-YY`）、项目名同义词归一（字典 + 未命中项人工归类队列）、重复行按 participant_key + program 去重
5. 校验回执：异常逐条列出（完成早于报名、缺失关键字段、孤儿 participant_key），**不静默吞掉**；按结果给机构数据等级 A（结果已关联）/ B（仅过程）/ C（关键字段缺失）
6. **（v1.6 新增）匹配率**：每次导入回执必须显示 `matched / total` 的 participant_key 匹配率（对参与者登记表），结果数据导入另拆分为"关联到项目参与者 / 关联到对照人群"；未匹配记录逐条列出，不丢弃、不猜测。匹配率是 join 框架的头号质量指标。

### 6.2 演示缓存

`DEMO_MODE=1` 时第 2 步回放 `data/mapping_cache.json`（周六上午用真实 Gemini 跑一遍 3 份样例表后生成），演示不依赖网络。

---

## 7. 指标引擎（src/lib/metrics.ts，纯函数）

### 7.1 公式（口径对齐 CDCR：三年随访，定罪率为主指标）

```
conviction_rate(cohort, tier) = |{p: p 在释放后 3 年内有 conviction 事件}| / |cohort|
avoided_returns = (rate_baseline − rate_participants) × n_participants
savings_conservative = avoided_returns × return_years × marginal_cost_year   (21534)
savings_capacity     = avoided_returns × return_years × avg_cost_year        (127788)
```

- `return_years` 为明示假设参数，默认 1.0，UI 可调（0.5–2.5），报告脚注必须打印当前取值。
- 基线默认 = 无学分层（0.456）；报告可切换为全州基线（0.391），切换时标题同步注明口径。

### 7.2 标准算例（单元测试期望值）

队列 n = 1,800，参与组定罪率 0.211，无学分基线 0.456，return_years = 1.0：
→ avoided = (0.456 − 0.211) × 1800 = **441 人**
→ 保守节省 = 441 × 21,534 = **$9.50M**
→ 容量口径 = 441 × 127,788 = **$56.35M**

### 7.3 小单元抑制

任何分组 n < 10：数值替换为 `"<10"`，不绘图、不进报告（privacy.ts 统一拦截）。

### 7.4 单元测试（tests/metrics.test.ts）

- 用 7.2 算例断言三项输出（浮点容差 0.5%）
- 空队列返回 null 而非 0；随访不足 3 年的队列（release_year > 2023）自动排除并计数提示

---

## 8. 界面规格

| 页面 | 内容 | 关键组件 |
|---|---|---|
| 总览 `/` | 头条数字卡（参与者总数、参与组定罪率 vs 基线、避免再入狱、保守节省额）+ 学分梯度图 + 漏斗图 | 数字卡、Recharts 条形/漏斗 |
| 导入 `/import` | 三步向导：上传 → 映射确认 → 校验回执 | 映射表（置信度色标）、异常清单 |
| 机构 `/orgs/[id]` | 单机构漏斗、队列趋势、数据等级徽章 | — |
| 报告 `/report` | 第 9 节结构，打印样式优化 | `@media print` 布局、口径脚注 |

**视觉打磨（M6，后置）**：数字 count-up 动画、漏斗逐级填充、梯度条入场动画；主色沉稳（深绿/石板灰），动画轻快但不幼稚化——受众是议员与资助方。所有动画必须可降级（prefers-reduced-motion）。

---

## 9. 报告规格（一键生成，固定一页）

1. 头条：本队列三年定罪率 X% vs 基线 39.1%（全州）/ 45.6%（无学分层）；避免再入狱 ≈ N 人
2. 漏斗 + 学分梯度图
3. 钱：双口径并列（保守 $A 边际成本 / 容量 $B 平均成本），假设参数明示
4. 方法脚注（英文原文，勿改写）：
   > "Rates follow CDCR's primary measure: conviction within three years of release. Cost figures use the Legislative Analyst's Office 2025-26 estimates (marginal cost $21,534 and average cost $127,788 per person-year). Demonstration data are synthetic, calibrated to published CDCR and TPW statistics."
5. 数据等级逐机构标注；小单元抑制声明

---

## 10. 演示动线（3 分钟，live demo 主交付）

| 时间 | 动作 | 台词要点 |
|---|---|---|
| 0:00–0:30 | 总览页 | 开场数字：惩教预算 <1% 花在康复；关一个人 $127,788/年 |
| 0:30–1:20 | 导入西班牙语样例表 | 脏表进 → Gemini 映射（回放缓存）→ 人工确认一列 → 入库，"120 家机构 120 种表头" |
| 1:20–2:10 | 回总览 | 梯度图动画：45.6→39.2→26.1→21.7，"参与越深，定罪率越低——这是 CDCR 自己的数字" |
| 2:10–2:45 | 报告页一键生成 | 双口径并排："我们主动报保守的那个" |
| 2:45–3:00 | 收尾 | 试点计划：5 家机构、90 天；"周一就能用" |

**备用**：5 页 deck（问题/框架/梯度图/报告截图/试点计划）应对无演示环节或设备故障；周六开场确认评审形式后二选一为主。

---

## 11. 构建顺序与里程碑验收

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M0（今晚） | 合成数据集（已由准备工作完成，见 `hsi-demo-data/`，验收全绿）+ 本文档冻结 | validation_report.md 全 ✅ |
| M1（周六上午） | 仓库脚手架 + Prisma schema + seed 入库 | `pnpm seed` 跑通，库内 5,000 参与者 |
| M2（周六下午） | 指标引擎 + 单元测试 | 7.4 测试全绿 |
| M3（周六下午） | 导入向导（含 Gemini 映射 + 缓存生成） | 3 份样例表全部导入成功并回执异常清单 |
| M4（周六晚） | 总览仪表盘（静态样式即可） | 头条数字与校验报告一致 |
| M5（周六晚） | 报告页 + 打印样式 | 一页 PDF 导出，脚注完整 |
| M6（周日全天） | 优化 + 动画打磨 + 演示彩排 + 赛后交付物（第 17 节） | 3 分钟动线完整跑通 ≥ 2 次；第 15、17 节清单全勾 |

**排期修订（用户 2026-10-23 定）**：周六写完全部代码（M1–M5），周日只做优化、动画与 demo 准备，不再往周日排新功能。

每完成一个里程碑，在 DECISIONS.md 记一行（时间、验收结果、偏离项）。

---

## 12. 砍单顺序（时间不足时从上往下砍，永不砍 join 正确性与指标口径）

1. 机构详情页 → 2. LLM 映射改纯手动 → 3. 报告 PDF 改网页打印 → 4. 动画打磨 → 5. Vercel 只读部署

---

## 13. 风险与对策

| 风险 | 对策 |
|---|---|
| 现场网络（用户 2026-10-23 确认可用） | 在线为默认路径；Gemini 结果预缓存保留为廉价保险，不再作为设计约束 |
| TPW 现场给出真实样例数据、格式完全不同 | 导入向导本就是为未知格式设计；先跑样例表保底，真实表当加分演示 |
| 评委质疑合成数据 | 主动声明 + 校准锚对照表（validation_report）投屏；强调真实个人再犯数据依法不可得 |
| 评委质疑省钱数字注水 | 双口径 + LAO 出处 + 假设参数明示（第 7、9 节） |
| 评审形式临时变更（改 poster/deck） | 5 页备用 deck（第 10 节） |

---

## 14. 现场必问清单

**开场先确认**：0) 评审形式：现场演示几分钟？还是 deck/poster？
**问 TPW 代表**：1) 120 家机构现在用什么交数据（Excel/Google Sheets/纸质）？2) 结果数据现在能拿到什么粒度（CDCR 公开报告/机构自报/完全拿不到）？3) 报告的第一读者是谁（议员办公室/BRIGHT-RIGHT 评审/基金会）？4) 对外引用数字时 TPW 已承诺过什么口径？5) 隐私红线具体在哪（哪些字段绝不能出现）？6) 周一早上你们最想先拿这个框架干哪件事？

---

## 15. 成功标准（最终验收，全部可勾选）

- [ ] ≥ 3 种格式样例表导入同一 schema 并正确 join 结果数据
- [ ] 系统复现学分梯度（各层偏差 ≤ 2pp）与头条结论（参与组定罪率 < 全州基线 39.1%）
- [ ] 一键生成一页报告：双口径金额、口径脚注、数据等级齐全
- [ ] 全程零真实 PII、零未标注合成数据
- [ ] 断网状态下 3 分钟动线完整跑通

---

## 16. 附录：校准锚与术语

**数字速查**（全部公开来源，细表见准备稿 §4.1）：CDCR 全州基线 39.1%（FY2019-20）；无学分 45.6% / 有学分 39.2% / EMC 26.1% / RACC 21.1%（CDCR 2020-21）；TPW 口径再入狱率 44%（全州）→21%（CBO 参与者）；LAO 人均年成本 平均 $127,788 / 边际 $21,534（2025-26）。

**术语**：CBO = 社区组织；CDCR = 加州惩教署；LAO = 加州立法分析办公室；MCC/RACC/EMC = CDCR 三类项目学分（里程碑完成/康复成就/教育 merit 学分）；BRIGHT/RIGHT = TPW 正在游说的州级康复拨款项目。

*文档版本：v1.1（2026-10-23 补齐 §6–§16 并冻结）。执行中如需变更锁定项，先改本文档再改代码。*

---

## 17. 赛后交付：反 GitHub 坟场清单（用户 2026-10-23 定为硬要求）

主办方明示最看重"部署、 funded、 真正被用起来"。以下与功能同为交付物，周日 M6 内完成：

- [ ] GitHub 公开仓库：README 含问题陈述、框架图、运行方式、数据字典、合成数据声明与第 18 节完整引用
- [ ] 在线只读演示链接（Vercel，种子数据版），README 顶部可点
- [ ] 给 TPW 的一页交接说明（handover memo）：框架怎么用、机构交数据三步、90 天试点计划（5 家机构）与所需支持
- [ ] 仓库内 `docs/pilot-plan.md`：试点目标、成功判据（5 家机构完成首次导入、产出第一份真实队列报告）、时间线
- [ ] LICENSE（MIT）+ `.env.example`（不含真实 key）
- [ ] 提交页/Devpost 文案定稿（与 pitch 口径一致，数字带引用编号）

## 18. 引用规范与参考文献（用户 2026-10-23 定：所有数据来源真实、论文式标注）

**规范**：应用内与报告中每个关键数字旁标注来源编号（如 "39.1% [1]"）；报告页脚与 README 附完整文献表；禁止出现无出处的数字。

**参考文献（访问日期均为 2026-10-23）**

[1] California Department of Corrections and Rehabilitation. *Recidivism Report for Individuals Released from CDCR in Fiscal Year 2019-20*（三年定罪率 39.1%，主指标定义：三年随访、定罪率为主要再犯指标）. https://www.cdcr.ca.gov/research/offender-outcomes-characteristics/offender-recidivism/
[2] California Department of Corrections and Rehabilitation. *CDCR Recidivism Report Finds Recidivism Rates Drop*（FY2018-19 队列 41.9%；有学分 39.2% vs 无学分 45.6%；EMC 26.1%；RACC 21.1%）. News release, 2024-02-13. https://www.cdcr.ca.gov/news/2024/02/13/cdcr-recidivism-report-finds-recidivism-rates-drop-2/
[3] California Legislative Analyst's Office. *How Much Does It Cost to Incarcerate a Person?*（平均成本 $127,788/人/年；边际成本 $21,534/人/年，2025-26 预算）. https://lao.ca.gov/policyareas/cj/6_cj_inmatecost
[4] Transformative Programming Works. 官方网站（120 家组织；CBO 参与者再入狱率 21% vs 全州 44%；$1 投入省 $5 监禁成本；触达 19,043 人）. https://www.thetpw.org/
[5] Hack for Social Impact 2026. 活动与赛道说明（Justice Reform 题目原文：惩教预算 <1% 用于康复；TPW 目前只能追踪过程数据）. https://luma.com/59t8euck
[6] Hack for Social Impact. 组织方网站（往届成果：Green Policy Agent 于 COP16 展示；bild.ai 进入 YC 并获 $3M 种子轮；Tenant Case Navigator 获拨款部署于法律诊所）. https://www.hackforsocialimpact.com/

---

## 19. 组队自我介绍（30 秒，英文，周六开场组队用）

> "Hi, I'm a software engineer with a data engineering background. I'm building for TPW in Justice Reform: an impact-data framework that joins enrollment records with recidivism outcomes, using CDCR's official metrics. The data framework and calibrated demo dataset are already done — I need a frontend partner and someone who loves presenting. Who wants to win this track with me?"

招募优先级：前端/视觉 > 讲述者 > 再来一个后端。你的位置：数据管道 + 指标引擎 + 报告（主场），不要去抢前端的活。

*文档版本：v1.2（2026-10-23 用户修订：现场有网；周六写码、周日优化；新增第 17、18、19 节）。*

---

## 20. 产品切入角度锁定（v1.3，用户 2026-10-23 提出并确认方向）

**主用户 = TPW 的管理/政策团队**（不是议员，不是监狱管理者）。完整链条：

- **供数的人**：120 家 CBO 负责人——通过导入向导定期交数据，看自己机构的结果与全网基准
- **用数的人（主用户）**：TPW 团队——跨机构聚合、算影响、找哪些项目真的有效
- **看结论的人**：议员办公室与资助方——不登录系统，只接收一键生成的影响报告

**产品目的（一句）**：让 TPW 在每一次经费决策之前，手里有经得起追问的影响证据。

**对"实时运营大屏"构想的修正（已定）**：本产品不是实时运营系统。理由：① 实时入狱/出狱数据在 CDCR 手里，TPW 与参赛队都无权接入；② 再犯数据天然滞后（三年随访 + 定罪确认），"实时再犯"概念上不存在；③ CBO 的过程数据以表格按月/季汇集，是现实。因此产品形态 = **定期汇聚（季度）+ 队列成熟度标注**：每个释放队列标注随访完成度（如 2021 队列 100%、2023 队列随访中），总览页必须显示数据新鲜度与成熟度，不装实时。用户设想的数据脊柱（入狱/出狱/培训与表现/再犯类型与时间）与第 4 节 schema 一一对应，予以保留。

*文档版本：v1.3（2026-10-23 新增第 20 节：切入角度锁定）。*

---

## 21. 官方赛程确认与计划重排（v1.4，用户 2026-10-23 提供）

**周日官方时间线（已确认）**
- 15:00 — Hacking 结束，Devpost 提交截止（sharp，不许迟）
- 15:30–17:00 — Judging Round 1：**4 分钟 pitch + 1 分钟 Q&A**
- 17:00–18:00 — Final Demos & Crowd Favorite Voting：入围队 **5 分钟**展示（评委 + 观众 + 非营利伙伴在场，有观众投票）

**由此重排**
- 功能冻结提前到周日 **12:00**；12:00–14:00 只做 Devpost 提交页 + pitch 彩排 + 演示数据复位；14:00–15:00 缓冲与提交，禁止新功能
- 第 10 节 3 分钟动线作废，按下方 4 分钟结构执行；另备 5 分钟决赛版（多：人的原话收尾 + 试点细节 + 公众版报告）
- Q&A 只有 1 分钟 ≈ 1–2 个问题：只彩排最高频三问的 20 秒版（选择偏差、省钱口径、赛后谁维护）
- **Devpost 提交清单**（周日 12:00 前完成文案）：项目名 ImpactLink、一句话描述、长描述（问题/框架/洞察/引用口径）、GitHub 链接、演示链接、3–5 张截图、Built with 标签（Next.js / Prisma / Gemini）、赛道与合作方标注（Justice Reform · TPW）
- Crowd Favorite 存在观众投票 → 决赛版的可视化与故事版报告权重上升；动画打磨（M6）优先保总览页数字动画与梯度图

*文档版本：v1.4（2026-10-23 新增第 21 节：官方赛程与重排）。*

---

## 22. 视觉调性与 Deck 规范（v1.5，用户 2026-10-23 定）

**调性**：刑事司法题材**不用"可爱"**。视觉语言 = 克制、有尊严、有人味：深色稳重主色、大留白、动效只服务数字本身（count-up、梯度条生长、漏斗填充），无装饰性动画。"眼前一亮"来自三样：一张梯度图、一次现场脏表导入、一页当场生成的报告——清晰即冲击力。

**Deck 规范（备用 deck 与决赛版共用）**：共 5 页；每页**一个标题句 + 一个视觉**，正文 ≤ 15 个英文词；字号大到最后一排可读；禁止段落文字上墙。
1. “California spends under 1% of its corrections budget on rehabilitation.”（大数字页）
2. “Programs work. Nobody can prove it.”（两半数据断裂示意）
3. 梯度图整页（45.6 → 21.1）
4. 报告页截图（一页纸全貌）
5. “Five pilot orgs. Ninety days. Evidence TPW can take to Sacramento.” + TPW 公开原话收尾

**Mock 题的产品映射（mock 的用途是改产品，不是背答案）**
- 问一（机构不配合）→ 导入向导必须容忍任意表格，机构零改造
- 问五（第六张表）→ 产品定位写死："收口现有表格"，不是新填一张表
- 问六（怕被砍经费）→ 可见性规则做进系统：单家数据仅本机构 + TPW 可见，对外只聚合
- 问七（西班牙语/不会电脑）→ 样例表 C 常驻演示位；导入流程步数 ≤ 3
- 问十二（学员同意）→ 路线图新增"知情与申诉机制（与 TPW 共定）"，写进试点计划，不假装已解决

*文档版本：v1.5（2026-10-23 新增第 22 节：视觉调性、deck 规范、mock 的产品映射）。*

---

## 23. Join 可信度修订（v1.6，用户 2026-10-24 定）

赛题核心动作是 "Join disjoint records"。审查发现原设计的 join 只在合成数据里成立（结果表 D 与参与者表用同一批 key 生成，匹配率 100% 是构造出来的），现实中接不上。修订三项：

1. **公共标识 + 网络密钥**（§4.1 已改）：key 改为 HMAC-SHA256(NETWORK_KEY, CDCR 编号)。待现场向 TPW 确认：机构在监狱内的项目是否登记 CDCR 编号（§14 问题 2 / tpw-questions 第 4 题）。已知局限：持有 NETWORK_KEY 的数据源理论上可对自己知道的 CDCR 编号算 key；中心库对机构不开放行级数据，降低该风险。备选（若 TPW 不愿分发密钥）：TPW 作为中立匹配方（honest broker）统一做哈希。
2. **匹配率进回执**（§6.1 第 6 步）。
3. **演示动线改为两段导入**：先导入西班牙语表 C（过程数据，机构为 B 级）→ 再导入外部结果表 D（关联结果，匹配率上屏，机构升 A 级）→ 总览梯度图更新。为此新增 `npm run seed:demo`：种子入库时扣下 org-07/org-08 的报名与结果记录，由现场导入补回；`npm run seed` 保持全量（sanity 用）。

**真实结果数据来源**（pitch 与试点计划必须点名，不假装已解决）：CDCR 研究办公室数据申请 + 数据共享协议；或第三方研究机构作中立匹配方；短期由机构自报随访结果，以 B 级标注。

**合成数据纪律**：合成数据按学分层校准，其中的模式（如"辍学≈未报名"）是校准产物，不得作为发现讲述（pitch-script 已改）。

*文档版本：v1.6（2026-10-24 新增第 23 节；§4.1、§6.1 同步修订）。*

---

## 24. 框架化：面向"nonprofits generally"（v1.7，用户 2026-10-24 定）

1. **假释事件**：结果事件扩为 arrest / conviction / return_to_custody / **parole_violation / parole_discharge**（赛题点名 parole data）。parole_discharge 无罪名等级（offense_level 可空）。主指标不变（CDCR 三年定罪率）。
2. **口径配置化**：共享标识名、跟踪的结果事件、主指标与随访窗、学分体系与层级、校准锚、基线、成本全部移入 `config/frameworks/<id>.json`；`metrics.ts` 从配置读取。每个数值必须带引用编号，否则为 null——校验器拒绝无出处的数字（§18 引用纪律进代码）。附 `example-county-reentry.json` 模板（数值留空，不编造）。
3. **数据标准**：`docs/data-standard.md`——不依赖本软件也能执行的规则：两半数据 + 登记表、join key、文件字段、回执、数据等级、口径、隐私、他处采用步骤。
4. **持续追踪（第二季度自动映射）**：人工确认过的映射按表头签名存入 ImportJob；同格式的下一份文件自动套用（来源标"Mapping remembered"）。演示动线改为三段：Q1 西班牙语表（B 级）→ 外部结果表 D（匹配率上屏，升 A 级）→ Q2 同格式表（一键导入）。`demo_q1_spanish.csv` / `demo_q2_spanish.csv` 由样例表 C 按行序对半切分，**不是真实季度**。

*文档版本：v1.7（2026-10-24 新增第 24 节）。*
