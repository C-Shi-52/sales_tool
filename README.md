# 内部报价网页工具（sales_tool）

本项目是一个单体 Web 应用，面向公司内部 **销售** 与 **管理员** 使用，支持动态需求录入、规则驱动报价计算、日志追溯与快照留存。

## 1. 整体技术方案与模块划分

### 技术栈
- Next.js 14（App Router，页面 + API 一体化）
- React 18
- Prisma ORM
- SQLite（默认本地文件数据库，便于内网快速部署）

### 模块划分
- `app/login`：登录页
- `app/quotes`：报价单列表
- `app/quotes/[id]/form`：动态需求填写页
- `app/quotes/[id]/result`：报价结果页（支持利润率、税率、招采比例调整并重算）
- `app/admin/rules`：管理员规则管理页
- `app/api/**`：后端接口
- `lib/calc.ts`：核心计算逻辑（后端）
- `lib/ruleEngine.ts`：动态字段可见性/必填/校验表达式引擎
- `prisma/schema.prisma`：数据库模型定义
- `prisma/seed.ts`：初始化账号、规则、参数、动态字段配置

---

## 2. 数据库结构设计

已实现表（模型）如下：
- `users`
- `quotes`
- `quote_forms`
- `quote_results`
- `quote_result_snapshots`
- `pricing_direct_rules`
- `pricing_step_rules`
- `pricing_combo_rules`
- `system_parameters`
- `form_field_rules`
- `audit_logs`

说明：
- `quotes` 存业务主记录；`quote_forms` 存原始表单 JSON。
- `quote_results` 存最新计算结果。
- `quote_result_snapshots` 存历史快照，后续规则变化不会覆盖。
- `audit_logs` 存创建、修改、重算、快照、规则变更、参数变更等行为。

---

## 3. 动态表单与规则引擎设计

### 动态字段规则（`form_field_rules`）
每个字段支持：
- `visibleWhen`
- `requiredWhen`
- `validationRule`
- `editableRoles`

并按 `section + orderNo` 渲染页面，避免写死静态页面。

### 表达式机制
- 前后端都使用轻量表达式执行器（`new Function + with(data)`）来评估条件。
- 隐藏字段不参与必填校验。
- 表单级校验：`payment_ratio_1 + ... + payment_ratio_4 = 1`。

### 固定五类三维分类
已按 `scene_cat_1..5` 固定字段组实现，不是无限新增列表。

---

## 4. API 与前端页面实现

### 已实现核心接口
- `POST /api/auth/login`
- `POST /api/quotes`
- `GET /api/quotes`
- `GET /api/quotes/:id`
- `PUT /api/quotes/:id/form`
- `POST /api/quotes/:id/calculate`
- `GET /api/quotes/:id/result`
- `POST /api/quotes/:id/snapshot`
- 管理端维护接口：
  - `GET/PUT /api/admin/direct-rules`
  - `GET/PUT /api/admin/step-rules`
  - `GET/PUT /api/admin/combo-rules`
  - `GET/PUT /api/admin/system-parameters`
  - `GET/PUT /api/admin/form-field-rules`
  - `GET /api/admin/audit-logs`

### 页面
1. 登录页：用户名/密码 + 失败提示
2. 需求页：规则驱动动态显示、动态必填、动态校验、保存草稿、重算
3. 结果页：各模块成本、总成本、周期、资金成本、最终报价、参数可调重算、快照回看
4. 管理员页：规则与系统参数维护、审计日志查看

---

## 5. 核心计算逻辑说明

在 `lib/calc.ts` 中由后端统一计算，前端不硬编码核心公式。

### 步长计价（按要求）
```text
step_count = ceil(x / step_size)
chargeable_steps = max(step_count - free_steps, 0)
cost = chargeable_steps * step_price
```
已用于：
- `unified_platform_point_count`
- `external_hardware_point_count`
- `external_software_point_count`
- `video_point_count`
- `dashboard_count`

### 实施周期
```text
impl_work_days = total_labor_cost / day_rate / avg_impl_people
impl_natural_days = impl_work_days * workday_to_naturalday_factor
```

### 回款加权平均到账时间
```text
Tavg = t + d*(0.7n2 + n3 + n4) + b*n4
```

### 资金成本
```text
finance_cost = S * r * max(Tavg - d/2, 0) / 365
```

### 总成本与最终报价
```text
total_cost = all_module_costs + impl_mgmt_cost + business_expense + other_amortization + finance_cost
target_pre_tax_revenue = total_cost * (1 + profit_rate)
final_quote = target_pre_tax_revenue / (1 - tax_rate - procurement_rate)
```

---

## 6. 权限说明

- 销售：仅能查看/编辑自己的报价，能调利润率/税率/招采比例并重算，能保存快照。
- 管理员：可看全部报价，可维护规则、参数、动态字段规则，可看全日志。
- 权限由 API 层进行校验。

---

## 7. 数据库初始化方式

### 环境变量
复制 `.env.example` 为 `.env` 并设置：
```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret"
```

### 初始化命令
```bash
npm install
npm run db:init
```

初始化后将自动创建：
- 管理员账号：`admin / admin123`
- 销售账号：`sales1 / sales123`
- 默认系统参数、步长规则、直接规则、组合规则、动态字段规则

---

## 8. 启动方式

```bash
npm run dev
```

打开：`http://localhost:3000`

---

## 9. 项目结构说明

```text
app/
  api/
  login/
  quotes/
  admin/
  components/
lib/
  auth.ts
  calc.ts
  prisma.ts
  ruleEngine.ts
prisma/
  schema.prisma
  seed.ts
```

---

## 10. 开发假设（明确说明）

1. 本阶段采用账号密码登录 + JWT Cookie，不接 SSO。
2. 动态表达式采用受控内网场景的简化表达式执行方式，后续可替换为 DSL/AST 解析器增强安全性。
3. 管理页采用轻量编辑表格，优先保证规则可维护性与快速交付。
4. 核心目标是结构清晰、规则可配置、计算可维护、结果可追溯；UI 设计可在下一阶段迭代。
