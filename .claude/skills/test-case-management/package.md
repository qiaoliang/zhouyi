# Test Case Management

测试用例管理 skills 包，提供测试用例文档生成、审查和管理相关的功能。

> 📌 **项目定制版本**
> - 基于全局版本 `~/.claude/skills/test-case-management/`
> - 可根据项目需求自由定制
> - 全局版本更新时，可选择同步

## 包含的 Skills

### create-main-rule
创建测试用例组织规则文档。

**功能**：
- 分析项目结构，自动提取产品信息和模块列表
- 根据模板生成测试用例组织规则文档
- 按优先级读取模板：项目模板 → 全局包模板 → 内置默认模板
- 输出到 `docs/testcases/00-通用规范-测试用例组织规则.md`

**使用方式**：
```
"创建测试用例组织规则"
"分析 src/modules 并创建测试用例规范"
```

---

### create-outline
创建测试用例总纲文档。

**功能**：
- 基于测试用例组织规则文档生成总纲
- 自动提取产品信息、模块列表、负责人信息
- 分析各模块功能范围
- 输出到 `docs/testcases/01-【产品名-版本号】测试用例总纲.md`

**使用方式**：
```
"创建测试用例总纲"
"根据组织规则创建总纲"
```

**依赖**：
- 需要先运行 `create-main-rule` 创建组织规则文档

---

### init-testcase
根据 PRD 文档或项目代码生成测试用例文件。

**功能**：
- 根据 PRD 或代码分析生成符合规范的测试用例
- 自动识别涉及的模块，新模块需确认
- 生成正常流程、边界条件、主要异常的测试用例
- 用例 ID 从 00001 开始，步长 5
- 自动更新测试用例总纲

**使用方式**：
```
"根据 PRD 生成测试用例"
"为 src/modules/auth 模块生成测试用例"
"初始化测试用例"
```

**依赖**：
- 需要先运行 `create-main-rule` 和 `create-outline`

**测试场景覆盖**：
- ✅ 正常流程
- ✅ 边界条件
- ✅ 主要异常

---

## 更多 Skills 即将添加

- 测试用例审查
- 测试报告导出
- ...

---

## 目录结构

```
# 全局基础版本（所有项目可用）
~/.claude/skills/test-case-management/
├── package.md
├── create-main-rule.md
├── create-outline.md
├── init-testcase.md
└── templates/

# 项目定制版本（本项目专用）
.claude/skills/test-case-management/
├── package.md                           ← 本文件
├── create-main-rule.md
├── create-outline.md
├── init-testcase.md
└── templates/
```

---

## 项目定制

本项目已配置自定义模板：
```
rules/00-通用规范-测试用例组织规则的规则模板.md
rules/01-xxx应用-测试用例总纲模板.md
```

可在此目录进一步定制：
- 修改 skill 行为
- 添加新的 skills
- 调整模板内容
