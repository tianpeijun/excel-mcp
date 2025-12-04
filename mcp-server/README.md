# Excel MCP Server for Amazon Bedrock AgentCore

将 [excel-mcp-server](https://pypi.org/project/excel-mcp-server/) 部署到 Amazon Bedrock AgentCore 的包装器。

## 快速开始

### 本地测试

```bash
cd mcp-server
EXCEL_FILES_PATH=/tmp/excel_files python3 mcp_server.py
```

### 部署到 AgentCore

```bash
cd mcp-server
export PATH="$HOME/.local/bin:$PATH"
agentcore deploy
```

## 调用示例

```bash
# 1. 获取 Token
TOKEN=$(curl -s -X POST "https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=excel-mcp-api/access" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

# 2. 调用 MCP Server
curl -s -X POST "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3AYOUR_AWS_ACCOUNT_ID%3Aruntime%2Fexcel_mcp_oauth-H2LQqD8kpU/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

## 详细文档

查看 [DEPLOYMENT.md](DEPLOYMENT.md) 获取完整的部署指南、OAuth 配置和已知问题解决方案。
