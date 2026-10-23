# HSI 2026 · TPW 合成演示数据 (今晚已备好 ✅)

实现 `../hsi-tpw-design-doc.md` §5（合成数据生成器）+ §4.1（假名化规则）的全部锁定项，
验收报告见 `validation_report.md`（§5.4 全部门槛通过）。

## 怎么用（周末）

- `participants.csv` / `enrollments.csv` / `outcomes.csv` / `organizations.csv` /
  `programs.csv` / `cost_params.csv` — 干净种子数据，列名 1:1 对应 design doc §4 的
  Prisma schema，`seed.ts` 可直接入库。`participant_key` 为 SHA256(机构内ID:机构盐值)，
  中心库无原始身份。
- `control_participants.csv` — 2000 名"未参与"合成对照（定罪率 45.6%，再入狱率 ~44%），
  演示"参与者 vs 未参与者"对比用。
- `sample_import_A_english.csv` / `sample_import_B_abbrev.csv` /
  `sample_import_C_spanish.csv` — 3 份机构脏导出表（英文标准列名 / 缩写列名 /
  西班牙语列名），`participant_key` 与干净数据一致，可现场演示"映射→join"。
  注入毛病：5% 缺失单元格、2% 重复行、3 种日期格式混用、项目名同义异写、
  完成早于报名异常（`validation_report.md` 末尾有每份表的毛病清单）。
- `sample_import_D_outcomes_external.csv` — 模拟外部结果系统的导出（字段风格完全不同），
  演示跨系统假名关联。
- `generate_synth_data.py` — 生成器本体。`seed=42`（锁定，可复现）；
  重新跑 `python3 generate_synth_data.py` 即可再生全部文件。

## 校准说明

- §5.2 允许"生成后按 §5.4 微调至命中锚点"：脚本用确定性校准步（seed=42 的 RNG）
  最小翻转定罪事件，使各学分层命中锚点 ±1pp（严于 2pp 验收门槛）。
- 唯一偏离 §5.2 初始参数的一处：完成者获学分概率 0.65 → 0.70（spec 明确允许微调），
  目的是让参与者整体三年定罪率（38.5%）低于全州基线 39.1%——这是 pitch 头条数字
  （prep doc §6）成立的前提。
- 剂量-效应梯度（无 46.0% → 任一 38.2% → EMC 25.3% → RACC ~22%）复现 CDCR 公开梯度；
  参与者再入狱率 ~22.9% vs 对照组 ~44.4%，对应 TPW 官网 21% vs 44% 的说法。

## 免责（演示时必须说）

全部为合成数据，不得标注为真实数据。真实部署时替换为机构真实记录。
