> ⚠️ **Outdated (2026-10-24):** written for the earlier synthetic outcome-linkage demo, which has been removed. Current direction: design doc §28 (real TPW program-run data). Rewrite before use.

# Spera — Pitch 讲稿（Round 1：4 分钟 + 1 分钟 Q&A）

语速基准 ~135 词/分钟，全文约 540 词。每段标注时间与屏幕动作。
语气：稳、慢、像在陈述事实，不像在推销。

---

**[0:00–0:35｜Slide 1：大数字页]**
“California spends under one percent of its corrections budget on rehabilitation.
It costs $127,788 a year to keep one person in prison. [1][3]
Community programs cut the return-to-prison rate from 44 percent to 21 percent. [4]
But today, they cannot prove it — not in the room where budgets are decided.”

**[0:35–1:05｜Slide 2：两半数据]**
“Here is why. The evidence is split in two.
Half lives in spreadsheets at 120 small community organizations — who enrolled, who finished, who earned credits.
The other half lives in state systems — who was arrested again, who was convicted, who went back.
Those two halves never meet.
So when Transformative Programming Works goes to Sacramento, all they can show is attendance.”

**[1:05–1:35｜Slide 2 停留，讲述者看向观众]**
“And the state's own numbers already point to the answer.
CDCR reports that people who earn no program credits are convicted again at 45.6 percent.
People who earn rehabilitative achievement credits: 21.1. [2]
The deeper the participation, the lower the rate.
What nobody can tell you is whether that holds for TPW's 120 organizations — program by program.
That is the question Spera lets TPW answer.”

**[1:35–3:00｜切到 live demo，操作者同步动作]**
“This is Spera.
[导入西班牙语 Q1 表] A program manager drops in her spreadsheet — Spanish headers, three different date formats, duplicates.
[映射确认页] The system proposes the mapping, she confirms it — she never fills in a new form.
[校验回执] Duplicates merged. Problem rows listed, not hidden. Her organizations are grade B: process data only.
[导入结果表 D] Now the other half — an export from a different system, different column names, different date formats.
[匹配率] Every record is linked by a keyed hash of the CDCR number. No name, no birth date ever reaches our database.
Match rate on screen — and every record that didn't match is listed. Her organizations move to grade A.
[导入 Q2 表，"Mapping remembered"] Next quarter, same spreadsheet: it maps itself. One click. That is how impact gets tracked, not just measured once.
[切到总览页，梯度图动画] Both halves of the evidence, in one place.
In this demonstration data the gradient reads forty-six, thirty-eight, twenty-five, twenty-two —
calibrated to CDCR's published 45.6 to 21.1. [2] With real records, this is the chart TPW has never been able to draw.
[点击生成报告] One click, and this is the page TPW takes to a hearing.
Both cost figures are printed — the conservative one first. [3]”

**[3:00–3:35｜Slide 4：报告页截图或停留在报告]**
“Every number on that page carries its source.
Conviction rates follow CDCR's primary measure: conviction within three years of release. [1]
Costs come from the Legislative Analyst's Office.
We report the marginal cost — $21,534 — as the headline saving, because that is the honest number for next year's budget. [3]”

（框架一句，可放在 3:00 段落末尾）“And none of this is hard-coded to California. The join rules, the measures, the cost figures live in one framework file — any nonprofit can write its own. The software refuses any number without a source.”

**[3:35–4:00｜Slide 5：试点请求]**
“We are asking TPW for five pilot organizations and ninety days.
Five orgs submit real data. One real cohort report comes out.
Evidence TPW can take to Sacramento.
The programs already work. We built the proof.”

---

## 决赛版（5 分钟）增补

在 4 分钟版的结尾请求之前，插入人的原话（Slide 5 背景，慢读）：
“One of TPW's own program leaders said it best:
'When you've been told you are worthless, and someone from your community shows you that you actually are worth something, that is a transforming experience.' [4]
Our job is to make sure that transformation shows up in the data, too.”
其余段落各放慢半拍即可，不要再加新信息。

## Q&A 最高频三问（各 20 秒版）

**选择偏差**：“Fair question. We report association, plus a dose-response gradient — the deeper the participation, the lower the rate — which is one of the classic patterns that supports a real effect. The framework's next step is matched comparisons, and the data model already supports it.”

**省钱口径**：“We lead with the marginal cost — $21,534 per person-year — because that's what next year's budget actually saves. The $127,788 average is the long-run capacity number, and it's labeled as such on the report. Both come from the LAO.”

**赛后谁维护**：“The repo is public, the handover memo is written, and the pilot plan names what TPW needs to run it: one part-time data steward. We are proposing five orgs and ninety days, with a named contact on their side and us on ours.”

## 数字纪律（v1.6 修订）

- 合成数据里的结论**不是发现**：生成器按 CDCR 学分层校准，"辍学者≈未报名"等模式是校准的结果，不得当作洞察讲。
- 台上只讲两类数字：带编号的公开数字（[1]–[4]），以及明确说"in this demonstration data"的合成数字。
- 匹配率、重复数、问题行数以现场回执为准，台词不写死具体值。

## 演示纪律

- 演示者与讲述者分开：一个人讲，一个人操作，永远不低头找按钮
- 每段台词说完再做下一个动作，宁可停顿，不要边找边说
- 数字只说整数版（45.6 可说 forty-five point six，其余节省额说 “nine and a half million”）
- 引用编号 [1]–[4] 对应 design doc §18 参考文献，Devpost 页面同步标注
