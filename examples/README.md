# Excel MCP Server Examples

This directory contains examples and quick start guides for using the deployed Excel MCP Server.

## Quick Start Notebook

The `quickstart.ipynb` Jupyter Notebook provides a comprehensive, step-by-step guide to:

1. **Authenticate** with Amazon Cognito
2. **Connect** to your deployed MCP server
3. **Discover** available tools
4. **Send requests** and receive responses
5. **Handle streaming** data efficiently
6. **Manage errors** and token refresh

## Prerequisites

Before running the notebook, ensure you have:

- Python 3.8 or higher
- Jupyter Notebook or JupyterLab installed
- A deployed Excel MCP Server (via `agentcore launch`)
- Your deployment credentials:
  - Cognito User Pool ID
  - Cognito Client ID
  - MCP Endpoint URL
  - AWS Region
  - Username and Password

## Installation

1. Install Jupyter:
```bash
pip install jupyter
```

2. Install required dependencies:
```bash
pip install boto3 requests
```

3. Launch Jupyter:
```bash
jupyter notebook
```

4. Open `quickstart.ipynb` and follow the instructions

## Configuration

Before running the notebook, you'll need to update the following configuration values:

```python
# Cognito Configuration
COGNITO_USER_POOL_ID = 'your-user-pool-id'
COGNITO_CLIENT_ID = 'your-client-id'
AWS_REGION = 'us-east-1'
USERNAME = 'your-username'
PASSWORD = 'your-password'

# MCP Endpoint
MCP_ENDPOINT_URL = 'https://your-endpoint.execute-api.us-east-1.amazonaws.com/prod/mcp'
```

You can find these values in the output of the `agentcore launch` command.

## Features Demonstrated

### Authentication (Requirements 6.2)
- Cognito user authentication
- Access token retrieval
- Token refresh mechanism

### Connection (Requirements 6.3)
- MCP client initialization
- Endpoint connection
- Session management

### Request/Response (Requirements 6.4)
- Synchronous requests
- Streaming responses
- Tool discovery and invocation

### Code Examples (Requirements 6.5)
- All code is ready to run
- Comprehensive error handling
- Real-world usage patterns

## Troubleshooting

### Authentication Errors

If you encounter authentication errors:
- Verify your Cognito credentials are correct
- Ensure the user exists in the Cognito User Pool
- Check that the Client ID matches your deployment

### Connection Errors

If you can't connect to the endpoint:
- Verify the endpoint URL is correct
- Ensure your access token is valid
- Check network connectivity and firewall rules

### Token Expiration

Access tokens expire after a set period (default: 1 hour). Use the token refresh function:
```python
new_access_token = refresh_access_token(refresh_token)
mcp_client = MCPClient(MCP_ENDPOINT_URL, new_access_token)
```

## Additional Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Amazon Cognito User Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the deployment logs from `agentcore launch`
3. Consult the main project documentation
