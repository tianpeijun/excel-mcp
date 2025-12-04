# Excel MCP Server for Amazon Bedrock AgentCore

将 [excel-mcp-server](https://pypi.org/project/excel-mcp-server/) 部署到 Amazon Bedrock AgentCore，支持 Excel 文件操作和 S3 下载功能。

## 功能特性

- 📊 完整的 Excel 操作（创建、读写、格式化、图表、公式等）
- ☁️ S3 集成，自动上传并返回预签名下载链接
- 🔐 OAuth 2.0 认证（Cognito）
- 🚀 一键部署到 AgentCore

## Quick Suite 配置

### MCP 连接配置

| 配置项 | 值 |
|--------|-----|
| **Base URL** | `https://bedrock-agentcore.{region}.amazonaws.com/runtimes/{runtime-arn}/invocations?qualifier=DEFAULT` |
| **Token URL** | `https://{cognito-domain}.auth.{region}.amazoncognito.com/oauth2/token` |
| **Client ID** | `{your-client-id}` |
| **Client Secret** | `{your-client-secret}` |
| **Scope** | `{your-api-scope}/access` |

### 推荐提示词

```
请使用 create_workbook_and_upload 工具创建 Excel 文件。
文件名为"报价查询.xlsx"，将以下数据写入并返回 S3 下载链接：
[["产品", "价格", "数量"], ["商品A", 100, 5], ["商品B", 200, 3]]
```

## 可用工具

### 核心工具（推荐）

| 工具名 | 说明 |
|--------|------|
| `create_workbook_and_upload` | **推荐** 创建 Excel 并上传到 S3，返回下载链接 |
| `upload_to_s3_and_get_download_url` | 上传现有文件到 S3 |
| `list_excel_files` | 列出目录中的 Excel 文件 |

### Excel 操作工具

| 工具名 | 说明 |
|--------|------|
| `create_workbook` | 创建新工作簿 |
| `create_worksheet` | 创建新工作表 |
| `write_data_to_excel` | 写入数据 |
| `read_data_from_excel` | 读取数据 |
| `apply_formula` | 应用公式 |
| `format_range` | 格式化单元格 |
| `create_chart` | 创建图表 |
| `create_pivot_table` | 创建数据透视表 |
| `merge_cells` | 合并单元格 |

## 本地测试

```bash
cd mcp-server
EXCEL_FILES_PATH=/tmp/excel_files EXCEL_S3_BUCKET={your-bucket} python3 mcp_server.py
```

## 部署

```bash
cd mcp-server
export PATH="$HOME/.local/bin:$PATH"
agentcore deploy
```

## API 调用示例

```bash
# 1. 获取 Token
TOKEN=$(curl -s -X POST "https://{cognito-domain}.auth.{region}.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id={your-client-id}&client_secret={your-client-secret}&scope={your-scope}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

# 2. 创建 Excel 并获取下载链接
curl -s -X POST "https://bedrock-agentcore.{region}.amazonaws.com/runtimes/{runtime-arn}/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "create_workbook_and_upload", "arguments": {"filename": "test.xlsx", "data": [["A", "B"], [1, 2]]}}, "id": 1}'
```

## 详细文档

查看 [DEPLOYMENT.md](DEPLOYMENT.md) 获取完整的部署指南、IAM 权限配置和已知问题解决方案。
