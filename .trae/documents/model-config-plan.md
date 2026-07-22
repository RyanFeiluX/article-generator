# 模型配置对话框实现计划

## 需求分析

用户需要一个重新设计的配置对话框，包含以下核心功能：

1. **可用模型清单**：展示当前 APP 支持的所有 LLM 提供商及其模型列表（只读）
2. **已配置模型清单**：展示用户已经配置了有效 API Key 的模型/提供商，支持添加、删除操作
3. **当前使用选择**：用户可以从已配置模型清单中选择当前使用的模型
4. **永久保存**：已配置的模型参数永久保存在 localStorage 中，除非用户明确删除

## 现有代码分析

### 前端结构

| 文件                                        | 职责           |
| ----------------------------------------- | ------------ |
| `frontend/src/types/index.ts`             | 定义类型和默认配置    |
| `frontend/src/components/ConfigModal.tsx` | 当前配置对话框      |
| `frontend/src/App.tsx`                    | 主应用组件，管理配置状态 |

### 当前配置存储方式

* `localStorage['llm-config']`：当前选中的配置

* `localStorage['validated-keys']`：已验证的 API Key 映射

* `localStorage['tavily-api-key']`：Tavily API Key

## 设计方案

### 1. 数据模型设计

新增类型定义：

```typescript
// 单个已配置的提供商配置
export interface ConfiguredProvider {
  provider: LLMProvider;
  config: VolcConfig | OpenAIConfig | AzureConfig | AnthropicConfig | DeepSeekConfig | KimiConfig;
  name?: string;  // 用户自定义名称
  validated: boolean;  // 是否已验证
  createdAt: number;  // 创建时间戳
}

// 可用模型列表（静态配置）
export interface AvailableModel {
  provider: LLMProvider;
  providerName: string;
  models: string[];
  requiresEndpoint?: boolean;  // 是否需要 endpoint（Azure）
  requiresBaseUrl?: boolean;   // 是否需要 baseUrl（Custom）
}
```

### 2. 状态管理方案

```typescript
// App.tsx 中新增状态
const [configuredProviders, setConfiguredProviders] = useState<ConfiguredProvider[]>([]);
const [activeProviderKey, setActiveProviderKey] = useState<string>('');
```

存储到 localStorage：

* `localStorage['configured-providers']`：已配置提供商列表（JSON 数组）

* `localStorage['active-provider']`：当前活动提供商的 provider key

### 3. 配置对话框 UI 设计

采用左右分栏布局：

```
┌─────────────────────────────────────────────────────────────────┐
│                        配置对话框标题                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │     可用模型清单          │  │      已配置模型清单          │  │
│  │  ─────────────────────  │  │  ────────────────────────   │  │
│  │  • Volc Engine ARK      │  │  • [✓] Volc Engine ARK      │  │
│  │    - doubao-pro         │  │    doubao-pro               │  │
│  │    - doubao-lite        │  │    [删除] [设为默认]        │  │
│  │  • OpenAI               │  │  • Kimi (Moonshot)          │  │
│  │    - gpt-4              │  │    kimi-k2.6                │  │
│  │    - gpt-4o             │  │    [删除] [设为默认]        │  │
│  │  • Azure OpenAI         │  │                             │  │
│  │  • Anthropic Claude     │  │  [+ 添加新配置]             │  │
│  │  • DeepSeek             │  │                             │  │
│  │  • Kimi (Moonshot)      │  │                             │  │
│  │  • Custom API           │  │                             │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        详细配置区域                               │
│  选中的提供商配置表单（API Key、模型参数等）                       │
├─────────────────────────────────────────────────────────────────┤
│                        底部按钮区                                 │
│              [取消]                          [保存]               │
└─────────────────────────────────────────────────────────────────┘
```

### 4. 关键交互流程

#### 添加新配置流程

1. 用户点击「添加新配置」按钮
2. 弹出选择提供商的下拉菜单
3. 用户选择提供商后，显示该提供商的配置表单
4. 用户填写配置并验证 API Key
5. 验证通过后，添加到已配置模型清单

#### 切换当前使用模型流程

1. 用户在已配置模型清单中选择一个模型
2. 点击「设为默认」或直接点击选择
3. 更新 `activeProviderKey` 状态
4. 更新 localStorage

#### 删除已配置模型流程

1. 用户点击已配置模型旁的「删除」按钮
2. 弹出确认对话框
3. 确认后从列表中移除

### 5. 后端改动

后端基本不需要改动，保持现有的 `/api/validate-key` 验证接口即可。

## 实现步骤

### 步骤 1：更新类型定义

修改 `frontend/src/types/index.ts`：

* 新增 `ConfiguredProvider` 接口

* 新增 `AvailableModel` 接口

* 新增可用模型常量配置

### 步骤 2：更新 App.tsx 状态管理

修改 `frontend/src/App.tsx`：

* 新增 `configuredProviders` 状态及 localStorage 持久化

* 新增 `activeProviderKey` 状态及 localStorage 持久化

* 更新配置变更处理逻辑

* 更新传递给 ConfigModal 的 props

### 步骤 3：重写配置对话框组件

重写 `frontend/src/components/ConfigModal.tsx`：

* 实现左右分栏布局

* 左侧：可用模型清单（只读）

* 右侧：已配置模型清单（可操作）

* 底部：详细配置表单

* 实现添加、删除、选择、验证功能

### 步骤 4：更新国际化资源

检查并更新 `frontend/public/locales/` 下的中英文翻译文件

### 步骤 5：验证测试

* 测试配置添加、删除、选择功能

* 测试 localStorage 持久化

* 测试 API Key 验证流程

## 风险与注意事项

1. **数据迁移**：需要处理旧版配置格式（`llm-config`）到新版格式的迁移
2. **API Key 安全性**：API Key 存储在 localStorage 中，需考虑安全性
3. **兼容性**：确保与现有后端接口兼容
4. **UI 响应式**：确保在不同屏幕尺寸下正常显示

## 文件变更清单

| 文件                                        | 变更类型        |
| ----------------------------------------- | ----------- |
| `frontend/src/types/index.ts`             | 修改（新增类型和常量） |
| `frontend/src/App.tsx`                    | 修改（新增状态管理）  |
| `frontend/src/components/ConfigModal.tsx` | 重写（全新布局）    |
| `frontend/public/locales/zh/config.json`  | 修改（新增翻译）    |
| `frontend/public/locales/en/config.json`  | 修改（新增翻译）    |

