# 合成数据验收报告 (§5.4)

seed=42 (锁定, 可复现) · 参与者 5000 · 对照组 2000 · enrollments 5000 · outcomes 8068

| 检查项 | 合成数据 | 锚点/期望 | n | 结果 |
|---|---|---|---|---|
| 3yr conviction | tier=none | 46.0% | 45.6% | 2531 | ✅ |
| 3yr conviction | tier=any | 38.2% | 39.2% | 1246 | ✅ |
| 3yr conviction | tier=emc | 25.3% | 26.1% | 549 | ✅ |
| 3yr conviction | tier=racc | 21.7% | 21.1% | 674 | ✅ |
| participants total in [4750,5250] | 5000 | 5000 | 5000 | ✅ |
| cohort 2021 >= 1400 | 1667 | 1400 | 1667 | ✅ |
| cohort 2022 >= 1400 | 1667 | 1400 | 1667 | ✅ |
| cohort 2023 >= 1400 | 1666 | 1400 | 1666 | ✅ |
| funnel monotone: enrolled >= completed >= credited | 5000>=3553>=2469 | monotone | 5000 | ✅ |
| no duplicate participant_key | 7000 | 7000 | 7000 | ✅ |
| completion_date < enroll_date in cleaned data = 0 | 0 | 0 | 5000 | ✅ |
| return_to_custody | participants ~=21% [info] | 22.5% | 21.0% | 5000 | ✅ |
| return_to_custody | control ~=44% [info] | 45.0% | 44.0% | 2000 | ✅ |
| conviction | participants < statewide 39.1% | 38.5% | 39.1% | 5000 | ✅ |

校准说明: §5.2 允许生成后微调。本脚本用确定性校准步 (seed=42 的 RNG) 最小翻转定罪事件,
使各学分层命中锚点 ±1pp (严于 2pp 验收门槛); 对照组未做校准, 直接验证抽样结果。

## 脏样例表 (现场演示"脏表进、干净证据出")
三份机构表 participant_key 与 participants.csv 一致, 可演示映射→join; 表④模拟外部结果系统。
注入毛病: 5% 缺失单元格、2% 重复行、3 种日期格式、项目名同义异写、完成早于报名异常。
- sample_import_A_english.csv: 2957 行 (含 54 重复行), 558 缺失单元格, 26 完成早于报名异常; 机构=org-01,org-02,org-03
- sample_import_B_abbrev.csv: 1599 行 (含 36 重复行), 299 缺失单元格, 10 完成早于报名异常; 机构=org-04,org-05,org-06
- sample_import_C_spanish.csv: 1648 行 (含 27 重复行), 321 缺失单元格, 7 完成早于报名异常; 机构=org-07,org-08,org-01

## 免责
全部为合成数据, 仅用于黑客松演示, 不得标注为真实数据。真实部署时替换为机构真实记录;
中心库设计为永不存储原始身份 (design doc §4.1)。
