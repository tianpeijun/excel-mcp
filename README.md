# Excel MCP AgentCore Deployment

Deploy Excel MCP Server to Amazon Bedrock AgentCore Runtime with two simple commands.

## Project Structure

```
.
├── src/
│   ├── types/           # TypeScript type definitions
│   │   ├── config.ts    # Configuration types
│   │   ├── deployment.ts # Deployment state types
│   │   ├── build.ts     # Build-related types
│   │   ├── mcp.ts       # MCP protocol types
│   │   ├── errors.ts    # Error handling types
│   │   └── index.ts     # Type exports
│   ├── aws/             # AWS SDK integration
│   │   ├── clients.ts   # AWS client configuration
│   │   └── index.ts     # AWS exports
│   ├── cli.ts           # CLI entry point
│   └── index.ts         # Main library entry
├── tests/               # Test files
│   └── setup.test.ts    # Setup verification tests
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
└── jest.config.js       # Jest test configuration
```

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Usage

```bash
# Configure deployment
agentcore configure --server "uvx excel-mcp-server" --region us-east-1 --project-name my-project

# Launch deployment
agentcore launch
```

## Requirements

- Node.js >= 18
- AWS credentials configured
- TypeScript >= 5.0

## License

MIT
