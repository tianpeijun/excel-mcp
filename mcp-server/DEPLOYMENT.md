# Excel MCP Server - Amazon Bedrock AgentCore 部署指南

## 概述

本项目将 [excel-mcp-server](https://pypi.org/project/excel-mcp-server/) 部署到 Amazon Bedrock AgentCore，提供 Excel 文件操作的 MCP 服务。

## 部署信息

### MCP Server Endpoint

```
https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3AYOUR_AWS_ACCOUNT_ID%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT
```

### Agent ARN

```
arn:aws:bedrock-agentcore:us-east-1:YOUR_AWS_ACCOUNT_ID:runtime/excel_mcp_oauth-H2LQqD8kpU
```

## OAuth 认证配置

| 配置项 | 值 |
|--------|-----|
| **Authentication Type** | Service-to-service OAuth (Client Credentials) |
| **Client ID** | `YOUR_CLIENT_ID` |
| **Client Secret** | `YOUR_CLIENT_SECRET` |
| **Token URL** | `https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token` |
| **Scope** | `excel-mcp-api/access` |
| **Discovery URL** | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AaIo0mR27/.well-known/openid-configuration` |

## 调用示例

### 1. 获取 OAuth Token

```bash
TOKEN=$(curl -s -X POST "https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=excel-mcp-api/access" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

echo "Token: ${TOKEN:0:50}..."
```

### 2. 列出所有工具

```bash
curl -s -X POST "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3AYOUR_AWS_ACCOUNT_ID%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

### 3. 创建 Excel 工作簿

```bash
curl -s -X POST "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3AYOUR_AWS_ACCOUNT_ID%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "create_workbook", "arguments": {"filepath": "test.xlsx"}}, "id": 2}'
```

## 本地测试

### 启动本地服务器

```bash
cd mcp-server
EXCEL_FILES_PATH=/tmp/excel_files python3 mcp_server.py
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

### 问题 1: agentcore invoke CLI 返回 406 错误

**原因:** `agentcore invoke` CLI 工具没有正确设置 `Accept: application/json, text/event-stream` header。

**解决方案:** 使用 curl 或 Python 脚本直接调用 AgentCore API，确保设置正确的 Accept header。

### 问题 2: excel-mcp-server 日志写入 /var 失败

**原因:** AgentCore 运行时环境没有 `/var` 目录的写权限。

**解决方案:** 在 `mcp_server.py` 中 patch `logging.FileHandler`，将日志重定向到 `/tmp/`。

### 问题 3: FastMCP 需要 stateless_http=True

**原因:** AgentCore 要求 MCP 服务器支持无状态 HTTP 模式。

**解决方案:** 创建自己的 FastMCP 实例并设置 `stateless_http=True`，然后复制 excel-mcp-server 的工具。

### 问题 4: Cognito OIDC Discovery URL 格式

**原因:** Cognito 的 OIDC discovery URL 格式与常规不同。

**正确格式:**
```
https://cognito-idp.{region}.amazonaws.com/{user-pool-id}/.well-known/openid-configuration
```

**错误格式:**
```
https://{domain}.auth.{region}.amazoncognito.com/.well-known/openid-configuration
```

### 问题 5: Cognito Client Credentials Token 没有 aud claim

**原因:** Cognito client_credentials flow 生成的 token 没有 `aud` claim，只有 `client_id`。

**解决方案:** 在 AgentCore 配置中使用 `allowedClients` 而不是 `allowedAudience`。

## 可用的 Excel 工具

部署成功后，以下工具可用：

- `create_workbook` - 创建新的 Excel 工作簿
- `apply_formula` - 应用 Excel 公式到单元格
- `validate_formula_syntax` - 验证公式语法
- `read_cell` - 读取单元格内容
- `write_cell` - 写入单元格内容
- `read_range` - 读取单元格范围
- `write_range` - 写入单元格范围
- 更多工具...

## 文件存储说明

Excel 文件存储在 `/tmp/excel_files/` 目录，这是临时存储：
- 适合演示和测试
- 实例重启后数据会丢失
- 如需持久化，需要集成 S3 或 EFS

## AWS 资源

- **Cognito User Pool ID:** `us-east-1_AaIo0mR27`
- **Cognito User Pool Name:** `excel-mcp-demo-mcp-pool`
- **Cognito Domain:** `YOUR_COGNITO_DOMAIN`
- **IAM Execution Role:** `AmazonBedrockAgentCoreSDKRuntime-us-east-1-df8e088a86`
