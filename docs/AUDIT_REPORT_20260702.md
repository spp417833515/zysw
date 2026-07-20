# 全项目审查报告(pp:review 4维审查)

**日期**: 2026-07-02 | **范围**: 底层逻辑层 → 业务层 → UI 层,重点:流水系统、垫付/报销、工资、报表生成
**方法**: 5 路并行深审(流水+余额 / 垫付报销 / 工资员工 / 报表生成 / 前端UI),全部结论经代码精读 + 运行时实测 + sqlite3 数据复核三重验证

## 裁决

**状态: ❌ 驳回** | 评分 **55/100** | 🔴 18 | 🟡 ~25 | 🔵 ~12

> **修复进展(2026-07-02 当日)**:P0 + P1 + P2(报表)已全部修复并验证
> (P0/P1 34 项 + P2 报表 30 项行为测试全过、线上对账通过、正式报表三表勾稽严丝合缝)。
> 已修:全部 18 个 🔴 及关联 🟡(含报表期末时点口径、现金流量表本期列、分类映射三处、
> 应交税费落表、未分配利润与利润表净利润勾稽、报表接口路径穿越)。
> 剩余:P3 卫生项(死代码清理、超长函数拆分、hex 色值收敛等)。
> 详见文末"修复清单"。

- A 逻辑维: **重伤** —— 报销创建/手续费两个接口自 2026-03-08 起必然 500(功能瘫痪),多处双扣/不扣余额入口,报表三张表三种时间口径互不勾稽
- B 清洁维: **满分** —— 0 冲突标记 / 0 debugger / 0 console.log / 0 TODO / 0 旧版命名
- C 极简维: **中等** —— 16 个函数超 50 行(最大 confirm_salary 154 行),死代码若干(TransactionWizard 378 行整文件、mock/ 745 行、report/schemas.py 整文件且自带 NameError)
- D 图谱维: **无法执行** —— ppdocs-kg 服务全程 fetch failed(多次重试),工作流加载/图谱一致性/健康检查均缺席,待服务恢复后执行 /pp:sync 补课

---

## 一、🔴 CRITICAL 清单(必须修复)

### 后端·垫付/报销/流水

| # | 位置 | 问题 | 证据 |
|---|------|------|------|
| 1 | reimbursement/service.py:58,68 | **创建报销批次必然 500**:`total=0.0; total+=txn.amount`,amount 是 Numeric→Decimal,`float+=Decimal` 抛 TypeError。d44b758(2026-03-08)把 Float 改 Numeric 引入回归,**此后报销创建从未成功**(库中唯一批次是 2026-02-25 的) | 用服务同款解释器对真实库实测复现 |
| 2 | reimbursement/service.py:144 | **手续费路径必然 500**:`account.balance -= data.fee`(Decimal-=float)同类 TypeError | 实测复现;对照 employee/service.py:479 有正确的 Decimal(str()) 转换 |
| 3 | transaction/service.py 全文 | **已入报销批次的流水无任何守卫**:可被单独确认(personal→company 补扣)、修改金额、删除;批次 total_amount 是创建时快照不联动 → 批次打款时**双重扣款**或按过期金额扣款 | 待支出 Tab 前端 selector 只按 type 过滤,不排除 personal/在批次流水 |
| 4 | transaction/service.py:141-161,272 | **未确认流水创建即计余额**:`_update_balance` 只跳过 personal 不看 payment_confirmed;主记账页创建 paymentConfirmed:false + accountId 必填 → **待到账未到账即虚增余额**;而对账脚本 fix_balance_inconsistency.py 按"仅 confirmed"重算 → 两套语义共存,对账后再确认会永久失衡 | 代码+前端 TransactionCreate.tsx:54 并读 |
| 5 | transaction/models.py:29 vs 线上 DDL | **模型与库漂移 + 线上无外键**:库中 category_id NOT NULL vs 模型 nullable=True(不带 categoryId 创建流水→500;complete_batch 的 fee_txn category_id=None 修完 #2 也会撞死);PRAGMA foreign_key_list 为空,伪造 account_id 可入库 | /tmp 副本 INSERT 实测 |
| 6 | reimbursement/service.py:194-204 | **报销打款只扣余额不落流水**:余额恒等式必须带账外补偿项才成立(实测:balance = initial + 流水净额 − 2524.78 批次),现金流量表永远看不到真实打款 | sqlite3 对账实测,分毫不差 |

### 后端·工资

| # | 位置 | 问题 | 证据 |
|---|------|------|------|
| 7 | employee/service.py:170,465-467 | **自缴税 memo 污染累计预扣**:prev_cumulative_tax 直接 sum 历史 tax 字段,自缴月的 tax(4月的90)只是 memo 公司从未预扣 → 员工切回代扣模式当月**少扣税 90** | python 复算:7月切回代扣,按存储税=270.6,按实际预扣=360.6 |
| 8 | employee/service.py:717-719 | **update_salary_record 改税公式错**:`net=base−tax` ①丢社保公积金 ②对自缴记录摧毁 net=base 语义 → 改回原值都会凭空造出 −90 幽灵差额 | 推演:对4月记录改 tax=90 → net 变 7910 |

### 后端·报表(tax_report.py)

| # | 位置 | 问题 | 证据 |
|---|------|------|------|
| 9 | :719-724 | **现金流量表"本期列"期初/期末公式错**:两列都拿 Σinitial_balance 当期初 → 本期列期末现金 = **−21467.58(负数)**,与同表累计列 65617.47、资产负债表 57612.97 三方互相矛盾,报税一眼被识破 | 生成文件 Sheet2 R28/R29 复算 |
| 10 | :100,109-199 | **资产负债表全科目"当前时点"口径**(货币资金/应收/应付/应付薪酬取当下值,非报告期末):Q2 报表货币资金少 8004.5(7/1 发的 6月工资被提前扣);严格期末口径下应付职工薪酬应含 6月工资 8000 | 实测 8004.5 分毫不差 |
| 11 | :773-784,813-816 | **利润表名义权责实为收付实现制**:工资按流水日期入费用 → 6月工资(7/1流水)漏出 Q2 利润表;而 `_get_salary_expense` 算好的权责工资放进 common_data 后**无任何填表函数消费(死数据)** | grep 确认无消费方 |
| 12 | :40-56,204-217,636 | **分类关键词映射缺陷**:①"税"字兜底把个税代缴 43.4+缴税款 5369.1 全计入"税金及附加"(费用虚增) ②"业务招待"命中销售费用的"业务"被遮蔽,永远到不了管理费用其中项 ③利息收入混入营业收入,R23"利息费用"却填转账手续费 | 生成文件逐格复算证实 |
| 13 | :156-199 | **应付职工薪酬潜伏双计**(7/1 修复的函数还差一刀):未确认 [SR:] 差额流水既进 item2 少付差额、又进 item3 员工垫付待报销 → 同一笔欠薪计 2 倍。当前库无未确认差额流水故未显现,必然复现 | 代码路径推演 + 分类实查 |

### 前端

| # | 位置 | 问题 | 证据 |
|---|------|------|------|
| 14 | pages/Account/AccountDetail.tsx:14,42 | 生产路由页"最近交易记录"用 **mock 假数据**渲染 | import mockTransactions 直接入表 |
| 15 | utils/taxCalculator.ts vs tax_report.py:652 | **企业所得税前后端两套算法**:前端分档 5%/10%/25%+年化,后端报税一律 5% → Dashboard 税预算与报税报表对同一利润给不同税额 | 两处代码并读 |
| 16 | pages/Tasks/components/PaymentConfirmModal.tsx:22 | 单笔确认**硬编码 'company' 且无账户选择**:对空账户流水(工资差额 account_id="")确认后**不绑账户、不扣余额**,后端静默通过 → 正是 de22680 修过的余额失衡的再入口(批量模态有 hasUnboundAccount 拦截,单笔没有) | 前后端代码并读 |
| 17 | store/useReimbursementStore.ts:63-86 | **报销 store 不检查 res.code**:后端业务错误返回 HTTP 200+code:1,前端弹"创建成功/已打款"假提示 → **掩盖了 #1/#2 瘫痪 4 个月**(transaction store 却检查 code,同一工程两套约定) | request.ts + store 并读 |
| 18 | Dashboard/components/PendingTasks.tsx:101 | "工资差额"入口跳 `/tasks?tab=salary-diff`,该 tab 已在 631e9c8 删除 → 点击后内容区空白 | Tabs activeKey 无匹配项 |

---

## 二、🟡 MAJOR 摘选(建议修复,按域归并)

**流水/账户**
- PUT /accounts 可直接改写 balance/initial_balance,一次调用击穿恒等式(与 de22680 目标冲突)
- type/amount 无输入校验:type 传非法串 → 旧效果回滚新效果静默不应用 → 余额悄悄失衡;负数/0 金额可入库
- 删除流水无引用保护:salary_record.transaction_id、批次 transaction_ids、发票引用全部可悬挂;删主工资流水后**三个视图口径互相矛盾**(salary-records 显示差额0/differences 显示欠全额/报表计0)
- `_update_balance` 对不存在账户静默跳过;transfer 的 to_account 不存在时单边扣款
- 并发丢失更新:balance 读-改-写无锁(单用户场景概率低)
- 批次号 RB-日期-count+1:同日删后重建/并发必撞 UNIQUE → 500;且用 UTC 日期,早8点前错一天
- transactionIds 不去重、可空数组、不校验 type/金额符号;actualAmount/fee 无 ge=0
- 打款 accountId 可不传/传错 → 批次标 paid 但一分不扣(静默)
- confirmed 状态批次无取消路径(手续费流水无法清理)

**工资**
- /calc-tax 不传 month 默认返回简单月度税,确认流程用累计口径 —— **43.4/90 双口径事故的结构性通道至今保留**;确认弹窗改实付不联动税额同理
- month_index 用"历史记录条数+1"而非实际受雇月数:漏录月份 → 起征点低估 → 税偏高;员工行改名复用(2月"老板"记录 employee_id 是师盼盼)污染累计基数
- 改 actualPaid 不清理已存在的 pending [SR:] 流水;generate_salary_settlement 幂等分支不校验旧流水金额是否过期
- [STAX:] 移除后代扣未缴个税无任何负债载体
- 删员工不级联;employee_id/transaction_id 无 ForeignKey

**报表**
- 报表下载/删除接口用户传 filename 直接 os.path.join,无 `../` 过滤 → **路径穿越**可下载 data.db、删任意 .xls
- 报表与发票/增值税完全脱节:Invoice/TaxSettings import 后零使用,应交税费恒空,所得税率 0.05 硬编码无视 TaxSettings 配置
- 未分配利润=资产−负债轧差,不与利润表勾稽(Q2 差 4770.23);"年初余额"用开户 initial_balance 冒充 1/1 余额(本库恰好=0 才没错)
- 现金口径按 Transaction.date 而非 payment_confirmed_at,跨期先记账后付款时错期
- 垫付已按私户确认后即退出应付账款,报销义务(pending/confirmed 批次)不进任何报表科目 → 少计对员工负债
- [SR:] 补发流水在现金流量表落"其他"而非"支付职工薪酬"(不重不漏,仅错行)
- 跨年 YTD/工资查询年界处理有误(当前数据未触发)

**前端**
- 前后端契约漂移:confirmPayment 未暴露 accountId(后端支持);TaxInfo/EmployeeReminder/SalaryRecord 类型缺后端已返回字段;TransactionFilter.tags 幽灵字段
- 刷新不成体系:单笔确认不刷账户 store(批量路径刷)、工资确认后不刷 pendingPayments/余额、报销打款后不刷余额/流水
- 提醒规则(3/7/30/60天阈值)为前端独有业务逻辑且同一笔可双重计数;TRANSFER_FEE=4.5 硬编码在 UI
- 发票金额/税额前端算后端信,不复核
- 侧边栏"超时提醒"徽标用当前分页 20 条计算,与 Tasks 页全量口径必然不一致
- WorkflowProgress 仍按 paymentAccountType 显示"公户/私户到账",88b6103 后语义失真
- AccountDetail 不 fetch,直接刷新/深链恒显示"账户不存在"

---

## 三、"43.4 之谜"结案(工资差额 46.6 的完整病理)

**确证结论**:一条记录生命周期内混用了两套算税口径,经"改实付不联动税额"的人工通道固化。

```
3-15  用户按【简单月度口径】税 90 → 实际转账 7910 (=8000−90)
3-16  确认弹窗默认税额来自【累计预扣口径】43.4
      (43.4 = 3% × [(3466.67(2月记录) + 8000) − 5000×2 − 20],
       其中 2月3466.67 本是"老板"的记录、员工行改名复用后混入累计基数;
       残余 20 元扣除来自确认当天的瞬态输入,已不可考)
      用户只改了实付 7910、没改税 → net=7956.6 与实付 7910 双双入库 → 幽灵差额 46.6
5-03  [SR:] 结算功能上线(631e9c8),事后生成补发流水,date 回填为 4-01(due_date)
7-01  报表 _get_unpaid_salary 不认 [SR:] 补发 → 幽灵负债 46.6 上报表(当日已修复)
```

**至今未堵的通道**:/calc-tax 默认简单口径 vs 确认流程累计口径(router.py:100)、确认弹窗改实付不联动税额 —— 同类事故随时可再发生。

---

## 四、C 维:编码风格

**超 50 行函数(16 个,摘最重)**:confirm_salary 154 | generate_tax_report 130 | update_transaction 80 | _fill_income_cols 75 | calc_tax_cumulative 72 | get_pay_reminders 71(嵌套4层) | generate_salary_settlement 70 | router.calc_tax 65(嵌套5层) | _get_unpaid_salary 65(循环内 await,N+1) | get_salary_differences 59(嵌套4层)。前端超 300 行组件 7 个(Tasks/index 539 最大)。

**死代码**:TransactionWizard.tsx(378行,零引用,含 88b6103 已废弃的公户/私户 Radio)| src/mock/data.ts(745行,唯一引用是 AccountDetail 的误用)| StatCard/useModal/usePagination(零引用)| report/schemas.py(整文件零引用且缺 `from typing import List`,一 import 即 NameError)| tax_report 的 salary_period 等 4 个权责工资键(算完无人消费)| import copy/TaxSettings/Invoice(死 import)| [STAX:] 常量与工厂函数(定义无调用)

**重复代码**:报表 _get_salary_expense/_get_salary_tax 整段复制(且双双死代码)| service.py get_receivables/get_payables 镜像复制 | 表头写入块重复 4 份 | _get_unpaid_salary 与 get_salary_differences 手工复制两份口径靠注释约定

**硬编码**:企业所得税 0.05 | TRANSFER_FEE=4.5(前端) | 工资分类 ID "25ad1b78…"/"cat_e2" | 前端 182 处 hex 色值(已有 theme token 体系,SalaryConfirmModal 28 处最多)

**B 维清洁度:全绿**(0 冲突标记/0 debugger/0 console.log/0 TODO/0 _old;唯一 print 在 seed.py 属合理)

---

## 五、修复优先级路线图

**P0 — 功能瘫痪与资金安全(立即)**
1. reimbursement/service.py 两处 Decimal 混算(#1/#2,各一行 `Decimal(str(...))`);顺手修 fee_txn 的 category_id=None(#5 连带)
2. 报销 store 检查 res.code(#17,否则修好了也看不见失败)
3. 单笔确认模态补账户选择或复用批量模态逻辑(#16)
4. AccountDetail 摘掉 mock(#14)

**P1 — 资金一致性**
5. transaction 端点加 reimbursement_batch_id 守卫(#3);报销打款落一笔公司支出流水(#6)
6. 统一余额语义为"确认才计"(#4,需迁移存量)+ alembic 消除 schema 漂移、补外键(#5)
7. 工资:累计预扣排除自缴 memo(#7)、update_salary_record 公式(#8)、堵双口径通道

**P2 — 报表口径**
8. 现金流量表本期列期初/期末(#9);期末时点余额=当前余额−期后流水净额(#10)
9. 利润表接上权责工资(#11);分类映射修"税/业务/利息"三处(#12);_get_unpaid_salary 排除 [SR:] 双计(#13)
10. 报表 router 路径穿越过滤

**P3 — 卫生**
11. 删死代码(约 1600 行);刷新逻辑收敛到 store 层统一失效;税/提醒/手续费口径下沉后端;超长函数拆分;hex 色值收敛 token

---

## 五点五、修复清单(2026-07-02 执行,P0+P1)

**后端**
- `reimbursement/service.py`:①创建批次 Decimal 混算修复+ID去重+type校验(#1);②手续费 Decimal 修复+分类落 `转账手续费`+账户校验(#2);③打款必须选账户、生成 `[RB:批次号]` 支出流水、余额与流水同源(#6)
- `reimbursement/schemas.py`:actualAmount/fee ≥0、transactionIds 非空、打款 accountId 必填
- `transaction/service.py`:①余额语义统一为 `_counts_toward_balance`(transfer 即时;收支=已确认且非私户才计),create/update/delete/confirm 全部走同一判定(#4);②确认防重(已确认拒绝二次确认);③批内流水守卫:确认/关键字段修改/删除均拒绝,合并付款跳过(#3);④工资主流水删除保护;⑤账户/分类存在性校验(无外键的应用层兜底,#5 部分);⑥无账户流水确认必须绑账户(堵静默不扣款)
- `transaction/schemas.py`:type/paymentAccountType 改 Literal 枚举、amount>0、accountId 非空
- `transaction/models.py`:category_id 对齐线上 DDL(NOT NULL)
- `transaction/router.py`:create/update/delete 补 ValueError 捕获
- `employee/service.py`:①累计预扣按 base−扣除−net 反推实际预扣,自缴 memo 不再污染(#7);②update_salary_record 按记录自身模式重算 net(自缴恒=base),余额调整仅限已确认非私户主流水,改税/改实付后联动同步 [SR:] 待处理差额流水(#8);③generate_salary_settlement 幂等分支同步过期金额;④confirm_salary 必须选发放账户
- `report/tax_report.py`:①权责费用排除 [RB:] 打款(防双计),现金口径排除 personal 垫付、含 [RB:] 打款;②应付账款补"已确认私户垫付未报销"项;③_get_unpaid_salary 第3项排除 [SR:] 流水(防与第2项双计,#13)
- `migrations/fix_balance_inconsistency.py`:有 [RB:] 流水的批次不再重复补偿

**前端**
- `PaymentConfirmModal`:私户垫付按 personal 确认(进待报销,不再误转公户),无账户流水强制选账户,错误透传(#16)
- `useReimbursementStore`:全部动作检查 res.code,假成功修复(#17);操作后联动刷新账户/待办
- `useTransactionStore.confirmPayment`:code 检查+accountId 透传+账户余额刷新
- `AccountDetail`:摘除 mock 数据,改真实 API+深链自动拉取(#14)
- `PendingTasks`:工资差额入口改跳「待支出」tab(#18)
- `Tasks`:工资确认后刷新待办+余额;SalaryConfirmModal/打款弹窗账户改必选
- `taxCalculator`:企业所得税对齐现行政策(≤300万统一5%),与后端报表同口径(#15)

**验证**:34 项行为测试(DB 副本)全部通过,覆盖余额语义/重复确认/批内守卫/报销全链路/工资差额联动/报表口径;线上冒烟 7 端点 200;非法输入 422;对账脚本线上通过(¥57612.97 分毫不差)。

**P2 报表口径重构(2026-07-02 第二批,tax_report.py)**
- **期末时点快照** `_get_snapshot`:货币资金/应收/应付/应付职工薪酬全部按「交易日期 ≤ 期末 + 确认状态」由流水重算,替代"当前 Account.balance"(修复 #10:Q2 货币资金 57612.97 → 65617.47,期后发的 6 月工资不再污染期末数;应付职工薪酬正确出现 8000)
- **现金流量表**:本期列期初 = 期间起点前一日快照(修复 #9:期末现金 −21467.58 → 65617.47,与 YTD 列、资产负债表三方一致);新增"收到其他(利息)"行;[SR:] 差额流水归入"支付职工薪酬"行;无 [RB:] 流水的历史批次打款计入"支付其他"
- **利润表**(修复 #11/#12):工资按所属月权责计提入管理费用(6 月工资回到 Q2,YTD 净利与资产负债表勾稽);利息收入剔出营业收入(101015.02 → 101000.00),净额负数体现在"利息费用"行;分类映射改最长关键词优先 + "业务招待"归管理费用(其中项 R20=5.0);企业所得税缴款描述识别后不再计费用行
- **应交税费落表**:所得税估提(利润×5%)− 已实缴 → 资产负债表 R11,年初列按上年末同口径;由此 **未分配利润 == 利润表本年累计净利润**(Q2:54736.60 == 54736.60;Q1 回归:82686.53 == 82686.53)
- **杂项**:报表下载/删除接口路径穿越修复(basename+realpath 双重限制);删除死文件 report/schemas.py、死函数 _get_salary_tax/_get_ytd_* 与死 import;工资期间查询跨年 ym 比较修复
- **验证**:30 项报表断言全过(Q2/Q1/年报三份逐格验证,含 ★勾稽项);正式生成的 Q2 报表资产=负债+权益=65617.47

## 六、审查缺口声明

- **D 维图谱一致性与 Phase 2 健康检查未执行**:ppdocs-kg MCP 服务全程 fetch failed(两日内 6+ 次重试)。流程图与代码的一致性、孤立节点、bind 覆盖均未验证。服务恢复后建议执行 /pp:sync,并把本报告的模块级结论回写节点文档。
- 并发类问题(余额读-改-写竞态)在单用户桌面场景风险低,列为 🟡 未计入驳回理由。
- generated_reports 中现存 Q2 文件(_20260702142400)是 7/1 修复**之前**生成的旧文件(46.6 仍在),需从界面重新生成。
