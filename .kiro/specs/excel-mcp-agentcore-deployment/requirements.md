# Requirements Document

## Introduction

本文档定义了将 Excel MCP 服务器通过 Amazon Bedrock AgentCore Runtime 部署为托管服务的需求。该系统允许用户使用两条简单的命令（agentcore configure 和 agentcore launch）完成从容器镜像构建、身份认证配置到服务部署的全流程，并通过 Streamable HTTP 传输方式提供 MCP 服务访问能力。

## Glossary

- **MCP Server**: Model Context Protocol 服务器，提供标准化的上下文协议服务
- **Excel MCP Server**: 基于 Excel 操作的 MCP 服务器实现
- **AgentCore CLI**: Amazon Bedrock AgentCore 的命令行工具
- **CodeBuild**: AWS 的持续集成服务，用于构建容器镜像
- **Amazon Cognito**: AWS 的身份认证和用户管理服务
- **Bedrock AgentCore Runtime**: Amazon Bedrock 的代理核心运行时环境
- **Streamable HTTP**: 支持流式传输的 HTTP 通信协议
- **Container Image**: 容器镜像，包含应用程序及其依赖的打包格式
- **Access Endpoint**: 访问端点，客户端用于连接服务的 URL
- **Authenticated Client**: 已通过身份验证的客户端应用

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望能够通过简单的配置命令设置部署参数，以便快速准备 MCP 服务器的部署环境。

#### Acceptance Criteria

1. WHEN 用户执行 agentcore configure 命令 THEN the AgentCore CLI SHALL 收集并验证所有必需的部署配置参数
2. WHEN 配置参数包含 MCP 服务器源信息 THEN the AgentCore CLI SHALL 验证源路径的有效性并记录配置
3. WHEN 配置参数包含 AWS 区域信息 THEN the AgentCore CLI SHALL 验证区域的可用性并保存配置
4. WHEN 配置完成 THEN the AgentCore CLI SHALL 将配置持久化到本地配置文件
5. WHEN 配置参数缺失或无效 THEN the AgentCore CLI SHALL 提供清晰的错误信息并拒绝保存配置

### Requirement 2

**User Story:** 作为开发者，我希望系统能够自动构建容器镜像，以便将 MCP 服务器打包为可部署的格式。

#### Acceptance Criteria

1. WHEN 用户执行 agentcore launch 命令 THEN the AgentCore CLI SHALL 触发 CodeBuild 项目开始构建流程
2. WHEN CodeBuild 构建容器镜像 THEN the CodeBuild Service SHALL 使用配置的 MCP 服务器源代码创建容器镜像
3. WHEN 容器镜像构建成功 THEN the CodeBuild Service SHALL 将镜像推送到 Amazon ECR 容器注册表
4. WHEN 容器镜像构建失败 THEN the AgentCore CLI SHALL 显示构建日志并返回错误状态
5. WHILE 构建过程进行中 THEN the AgentCore CLI SHALL 显示实时构建进度信息

### Requirement 3

**User Story:** 作为系统管理员，我希望系统能够自动配置身份认证机制，以便保护 MCP 服务器的访问安全。

#### Acceptance Criteria

1. WHEN 部署流程启动 THEN the AgentCore CLI SHALL 创建或配置 Amazon Cognito 用户池
2. WHEN Cognito 用户池创建完成 THEN the AgentCore CLI SHALL 配置应用客户端和身份验证流程
3. WHEN 身份认证配置完成 THEN the AgentCore CLI SHALL 将认证信息关联到 MCP 服务器部署
4. WHEN 客户端请求访问 THEN the Bedrock AgentCore Runtime SHALL 验证客户端的 Cognito 身份令牌
5. IF 客户端未提供有效令牌 THEN the Bedrock AgentCore Runtime SHALL 拒绝访问并返回 401 未授权错误

### Requirement 4

**User Story:** 作为开发者，我希望系统能够自动将 MCP 服务器部署到托管环境，以便无需管理底层基础设施。

#### Acceptance Criteria

1. WHEN 容器镜像构建完成且认证配置就绪 THEN the AgentCore CLI SHALL 将 MCP 服务器部署到 Bedrock AgentCore Runtime
2. WHEN 部署到运行时环境 THEN the Bedrock AgentCore Runtime SHALL 启动容器实例并验证服务健康状态
3. WHEN 服务健康检查通过 THEN the Bedrock AgentCore Runtime SHALL 创建可访问的服务端点
4. WHEN 部署完成 THEN the AgentCore CLI SHALL 返回访问端点 URL 和认证信息
5. WHEN 部署失败 THEN the AgentCore CLI SHALL 显示详细错误信息并回滚部署

### Requirement 5

**User Story:** 作为客户端开发者，我希望能够通过 Streamable HTTP 协议访问 MCP 服务器，以便实现高效的流式数据传输。

#### Acceptance Criteria

1. WHEN 已认证客户端向端点发送请求 THEN the Bedrock AgentCore Runtime SHALL 通过 Streamable HTTP 协议转发请求到 MCP 服务器
2. WHEN MCP 服务器返回响应 THEN the Bedrock AgentCore Runtime SHALL 通过 Streamable HTTP 协议流式传输响应到客户端
3. WHEN 客户端建立连接 THEN the Bedrock AgentCore Runtime SHALL 保持连接以支持双向流式通信
4. WHEN 传输过程中发生错误 THEN the Bedrock AgentCore Runtime SHALL 向客户端返回明确的错误信息
5. WHILE 流式传输进行中 THEN the Bedrock AgentCore Runtime SHALL 维护连接状态并处理背压

### Requirement 6

**User Story:** 作为新用户，我希望获得基于 Jupyter Notebook 的快速入门指导，以便快速学会如何使用部署的 MCP 服务器。

#### Acceptance Criteria

1. WHEN 用户访问快速入门文档 THEN the System SHALL 提供包含完整示例的 Jupyter Notebook 文件
2. WHEN Notebook 执行身份认证步骤 THEN the Notebook SHALL 演示如何获取和使用 Cognito 身份令牌
3. WHEN Notebook 执行连接步骤 THEN the Notebook SHALL 演示如何连接到托管的 MCP 服务器端点
4. WHEN Notebook 执行操作示例 THEN the Notebook SHALL 演示如何通过 Streamable HTTP 发送请求和接收响应
5. WHEN Notebook 包含代码示例 THEN the Notebook SHALL 提供可直接运行的 Python 代码片段

### Requirement 7

**User Story:** 作为开发者，我希望命令行工具提供清晰的反馈和日志，以便了解部署过程的每个阶段状态。

#### Acceptance Criteria

1. WHEN 任何命令执行 THEN the AgentCore CLI SHALL 显示当前操作的进度指示器
2. WHEN 关键步骤完成 THEN the AgentCore CLI SHALL 输出成功消息和相关资源信息
3. WHEN 错误发生 THEN the AgentCore CLI SHALL 输出包含错误原因和建议解决方案的消息
4. WHERE 用户启用详细日志模式 THEN the AgentCore CLI SHALL 输出详细的调试信息
5. WHEN 部署完成 THEN the AgentCore CLI SHALL 输出摘要信息包括端点 URL 和后续步骤指引

### Requirement 8

**User Story:** 作为开发者，我希望系统能够处理 uvx 命令格式的 MCP 服务器定义，以便支持标准的 MCP 服务器启动方式。

#### Acceptance Criteria

1. WHEN 配置接收 uvx 命令格式 THEN the AgentCore CLI SHALL 解析命令参数提取服务器包名和版本
2. WHEN 构建容器镜像 THEN the CodeBuild Service SHALL 在容器中安装 uvx 和指定的 MCP 服务器包
3. WHEN 容器启动 THEN the Bedrock AgentCore Runtime SHALL 使用 uvx 命令启动 MCP 服务器进程
4. WHEN MCP 服务器包含环境变量配置 THEN the AgentCore CLI SHALL 将环境变量传递到容器运行时
5. WHEN 服务器包版本更新 THEN the System SHALL 支持重新部署以使用新版本
