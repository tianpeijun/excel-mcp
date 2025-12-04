# Excel MCP Server - Amazon Bedrock AgentCore 部署指南

## 概述

本项目将 [excel-mcp-server](https://pypi.org/project/excel-mcp-server/) 部署到 Amazon Bedrock AgentCore，提供 Excel 文件操作和 S3 下载功能。

## 部署信息

### MCP Server Endpoint

```
https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A418295705866%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT
```

### Agent ARN

```
arn:aws:bedrock-agentcore:us-east-1:418295705866:runtime/excel_mcp_oauth-H2LQqD8kpU
```

## Quick Suite 配置

### MCP 连接配置

| 配置项 | 值 |
|--------|-----|
| **Connector** | Model Context Protocol |
| **Authentication Type** | Service-to-service OAuth |
| **Base URL** | `https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A418295705866%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT` |
| **Token URL** | `https://excel-mcp-demo-pool.auth.us-east-1.amazoncognito.com/oauth2/token` |
| **Client ID** | `48o70t8to7ovcbv5p5hidh3v0o` |
| **Client Secret** | `fap80bagav3c9oeb3lth0l4v3tebi17a5l3fmvno0jgp21bsv4h` |
| **Scope** | `excel-mcp-api/access` |

### OAuth 认证详情

| 配置项 | 值 |
|--------|-----|
| **Cognito User Pool ID** | `us-east-1_AaIo0mR27` |
| **Cognito Domain** | `excel-mcp-demo-pool` |
| **Discovery URL** | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AaIo0mR27/.well-known/openid-configuration` |

## 可用工具

### S3 下载功能（自定义扩展）

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `create_workbook_and_upload` | **推荐** 创建 Excel 并上传到 S3 | `filename`, `data`, `sheet_name` |
| `upload_to_s3_and_get_download_url` | 上传现有文件到 S3 | `filepath`, `custom_filename` |
| `list_excel_files` | 列出目录中的 Excel 文件 | 无 |

### Excel 操作工具（来自 excel-mcp-server）

| 工具名 | 说明 |
|--------|------|
| `create_workbook` | 创建新工作簿 |
| `create_worksheet` | 创建新工作表 |
| `write_data_to_excel` | 写入数据到工作表 |
| `read_data_from_excel` | 读取工作表数据 |
| `apply_formula` | 应用 Excel 公式 |
| `validate_formula_syntax` | 验证公式语法 |
| `format_range` | 格式化单元格范围 |
| `create_chart` | 创建图表 |
| `create_pivot_table` | 创建数据透视表 |
| `create_table` | 创建 Excel 表格 |
| `merge_cells` / `unmerge_cells` | 合并/取消合并单元格 |
| `copy_range` | 复制单元格范围 |
| `insert_rows` / `insert_columns` | 插入行/列 |
| `delete_sheet_rows` / `delete_sheet_columns` | 删除行/列 |

## S3 下载功能配置

### S3 配置

| 配置项 | 值 |
|--------|-----|
| **S3 Bucket** | `bedrock-agentcore-codebuild-sources-418295705866-us-east-1` |
| **S3 Prefix** | `excel-downloads/` |
| **链接有效期** | 3600 秒（1 小时） |

### IAM 权限

AgentCore 执行角色 `AmazonBedrockAgentCoreSDKRuntime-us-east-1-df8e088a86` 需要以下 S3 权限：

```json
{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject"],
    "Resource": "arn:aws:s3:::bedrock-agentcore-codebuild-sources-418295705866-us-east-1/excel-downloads/*"
}
```

添加权限命令：
```bash
aws iam put-role-policy \
  --role-name AmazonBedrockAgentCoreSDKRuntime-us-east-1-df8e088a86 \
  --policy-name S3ExcelDownloadsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject"],
        "Resource": "arn:aws:s3:::bedrock-agentcore-codebuild-sources-418295705866-us-east-1/excel-downloads/*"
    }]
}'
```

## 调用示例

### 获取 OAuth Token

```bash
TOKEN=$(curl -s -X POST "https://excel-mcp-demo-pool.auth.us-east-1.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=48o70t8to7ovcbv5p5hidh3v0o&client_secret=fap80bagav3c9oeb3lth0l4v3tebi17a5l3fmvno0jgp21bsv4h&scope=excel-mcp-api/access" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
```

### 创建 Excel 并获取下载链接（推荐）

```bash
curl -s -X POST "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A418295705866%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_workbook_and_upload",
      "arguments": {
        "filename": "报价查询.xlsx",
        "data": [["产品", "价格", "数量"], ["商品A", 100, 5], ["商品B", 200, 3]],
        "sheet_name": "Sheet1"
      }
    },
    "id": 1
  }'
```

### 列出工具

```bash
curl -s -X POST "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A418295705866%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

## Quick Suite 提示词示例

```
请使用 create_workbook_and_upload 工具创建 Excel 文件。
文件名为"报价查询.xlsx"，将以下数据写入并返回 S3 下载链接：
[["产品", "价格", "数量"], ["商品A", 100, 5], ["商品B", 200, 3]]
```

## 本地开发

### 启动本地服务器

```bash
cd mcp-server
EXCEL_FILES_PATH=/tmp/excel_files EXCEL_S3_BUCKET=bedrock-agentcore-codebuild-sources-418295705866-us-east-1 /opt/homebrew/bin/python3.10 mcp_server.py
```

### 测试本地服务器

```bash
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

## 部署命令

```bash
cd mcp-server
export PATH="$HOME/.local/bin:$PATH"
agentcore deploy
```

## 已知问题和解决方案

### 问题 1: Quick Suite 中 MCP 工具列表不更新

**现象:** 部署新工具后，Quick Suite 的 Enabled Actions 列表没有显示新增的工具。

**原因:** Quick Suite 在创建 MCP 插件连接时会缓存工具列表，后续更新不会自动刷新。

**解决方案:** 删除并重新创建 MCP 插件连接：
1. 在 Quick Suite 控制台删除现有的 MCP 插件
2. 重新创建一个新的 MCP 插件连接
3. 新连接会获取最新的工具列表

### 问题 2: agentcore invoke CLI 返回 406 错误

**原因:** CLI 没有正确设置 `Accept: application/json, text/event-stream` header。

**解决方案:** 使用 curl 直接调用 API。

### 问题 3: excel-mcp-server 日志写入 /var 失败

**原因:** AgentCore 运行时没有 `/var` 目录写权限。

**解决方案:** 在 `mcp_server.py` 中 patch `logging.FileHandler`，重定向到 `/tmp/`。

### 问题 4: Cognito OIDC Discovery URL 格式

**正确格式:**
```
https://cognito-idp.{region}.amazonaws.com/{user-pool-id}/.well-known/openid-configuration
```

### 问题 5: Cognito Token 没有 aud claim

**解决方案:** 在 AgentCore 配置中使用 `allowedClients` 而不是 `allowedAudience`。

### 问题 6: 中文文件名下载报错

**原因:** S3 的 Content-Disposition header 不支持非 ASCII 字符。

**解决方案:** 使用 RFC 5987 编码：`filename*=UTF-8''%E6%8A%A5%E4%BB%B7.xlsx`

## AWS 资源

| 资源 | 值 |
|------|-----|
| **AWS Account ID** | `418295705866` |
| **Region** | `us-east-1` |
| **Cognito User Pool ID** | `us-east-1_AaIo0mR27` |
| **Cognito Domain** | `excel-mcp-demo-pool` |
| **IAM Execution Role** | `AmazonBedrockAgentCoreSDKRuntime-us-east-1-df8e088a86` |
| **S3 Bucket** | `bedrock-agentcore-codebuild-sources-418295705866-us-east-1` |
| **Agent ID** | `excel_mcp_oauth-H2LQqD8kpU` |
