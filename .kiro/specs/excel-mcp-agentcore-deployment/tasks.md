# Implementation Plan

- [x] 1. 设置项目结构和核心接口
  - 创建 TypeScript 项目结构（src/, tests/, types/）
  - 配置 TypeScript、Jest 和 fast-check
  - 定义核心数据模型接口（Config, DeploymentState, Endpoint 等）
  - 设置 AWS SDK 客户端配置
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 实现配置管理模块
  - [x] 2.1 实现配置验证逻辑
    - 编写参数验证函数（validateConfig）
    - 实现 AWS 区域验证
    - 实现源路径验证
    - 实现 uvx 命令解析
    - _Requirements: 1.1, 1.2, 1.3, 8.1_
  
  - [ ]* 2.2 编写配置验证属性测试
    - **Property 1: 配置参数验证完整性**
    - **Validates: Requirements 1.1, 1.5**
  
  - [ ]* 2.3 编写源路径验证属性测试
    - **Property 3: 源路径验证正确性**
    - **Validates: Requirements 1.2**
  
  - [ ]* 2.4 编写 AWS 区域验证属性测试
    - **Property 4: AWS 区域验证正确性**
    - **Validates: Requirements 1.3**
  
  - [ ]* 2.5 编写 uvx 命令解析属性测试
    - **Property 25: uvx 命令解析正确性**
    - **Validates: Requirements 8.1**
  
  - [x] 2.6 实现配置持久化
    - 编写 saveConfig 函数（保存到 JSON 文件）
    - 编写 loadConfig 函数（从 JSON 文件读取）
    - 实现配置文件路径管理
    - _Requirements: 1.4_
  
  - [ ]* 2.7 编写配置持久化属性测试
    - **Property 2: 配置持久化往返一致性**
    - **Validates: Requirements 1.4**

- [x] 3. 实现 CLI 命令接口
  - [x] 3.1 实现 configure 命令
    - 使用 Commander.js 定义命令参数
    - 实现参数收集和验证流程
    - 集成配置验证和保存逻辑
    - 实现错误处理和用户反馈
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 3.2 实现进度报告器
    - 使用 ora 实现进度指示器
    - 实现不同日志级别（info, error, success）
    - 实现详细模式支持
    - _Requirements: 7.1, 7.4_
  
  - [ ]* 3.3 编写进度输出属性测试
    - **Property 20: 命令执行显示进度**
    - **Validates: Requirements 7.1**
  
  - [ ]* 3.4 编写详细模式属性测试
    - **Property 23: 详细模式输出调试信息**
    - **Validates: Requirements 7.4**
  
  - [x] 3.5 实现错误消息格式化
    - 定义 UserMessage 接口实现
    - 实现错误分类逻辑
    - 实现建议生成逻辑
    - _Requirements: 7.3_
  
  - [ ]* 3.6 编写错误消息属性测试
    - **Property 22: 错误输出包含原因和建议**
    - **Validates: Requirements 7.3**

- [x] 4. 实现 CodeBuild 集成
  - [x] 4.1 实现构建触发逻辑
    - 使用 AWS SDK 创建/获取 CodeBuild 项目
    - 实现构建任务触发
    - 实现构建状态轮询
    - _Requirements: 2.1_
  
  - [ ]* 4.2 编写构建触发属性测试
    - **Property 5: Launch 命令触发构建**
    - **Validates: Requirements 2.1**
  
  - [x] 4.3 实现 Dockerfile 和 buildspec 生成
    - 根据配置生成 Dockerfile
    - 生成 buildspec.yml
    - 处理 uvx 和 MCP 服务器包安装
    - 处理环境变量注入
    - _Requirements: 2.2, 8.2, 8.4_
  
  - [ ]* 4.4 编写容器内容验证属性测试
    - **Property 6: 构建镜像包含正确内容**
    - **Validates: Requirements 2.2, 8.2**
  
  - [ ]* 4.5 编写环境变量传递属性测试
    - **Property 28: 环境变量正确传递**
    - **Validates: Requirements 8.4**
  
  - [x] 4.6 实现 ECR 集成
    - 创建/获取 ECR 仓库
    - 验证镜像推送成功
    - _Requirements: 2.3_
  
  - [ ]* 4.7 编写 ECR 推送属性测试
    - **Property 7: 成功构建推送到 ECR**
    - **Validates: Requirements 2.3**
  
  - [x] 4.8 实现构建进度监控
    - 实时获取构建日志
    - 显示构建阶段和进度
    - 处理构建失败情况
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 4.9 编写构建进度属性测试
    - **Property 8: 构建进度信息输出**
    - **Validates: Requirements 2.5**

- [x] 5. 实现 Cognito 身份认证集成
  - [x] 5.1 实现 Cognito 资源创建
    - 创建或获取 Cognito 用户池
    - 配置应用客户端
    - 配置令牌有效期
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 5.2 编写 Cognito 资源创建属性测试
    - **Property 9: 部署创建 Cognito 资源**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 5.3 实现认证信息关联
    - 将 Cognito 配置保存到部署配置
    - 生成客户端认证示例代码
    - _Requirements: 3.3_
  
  - [ ]* 5.4 编写认证信息关联属性测试
    - **Property 10: 认证信息关联到部署**
    - **Validates: Requirements 3.3**

- [x] 6. 实现 Bedrock AgentCore Runtime 集成
  - [x] 6.1 实现部署触发逻辑
    - 检查前置条件（镜像和认证就绪）
    - 调用 AgentCore Runtime API 部署服务
    - _Requirements: 4.1_
  
  - [ ]* 6.2 编写部署触发属性测试
    - **Property 13: 前置条件满足触发部署**
    - **Validates: Requirements 4.1**
  
  - [x] 6.3 实现健康检查和端点创建
    - 执行服务健康检查
    - 创建访问端点
    - 验证端点可访问性
    - _Requirements: 4.2, 4.3_
  
  - [ ]* 6.4 编写健康检查属性测试
    - **Property 14: 部署执行健康检查**
    - **Validates: Requirements 4.2, 4.3**
  
  - [x] 6.5 实现部署结果返回
    - 返回端点 URL 和认证信息
    - 生成部署摘要
    - 提供后续步骤指引
    - _Requirements: 4.4, 7.5_
  
  - [ ]* 6.6 编写部署结果属性测试
    - **Property 15: 成功部署返回端点信息**
    - **Validates: Requirements 4.4**
  
  - [ ]* 6.7 编写部署摘要属性测试
    - **Property 24: 部署完成输出摘要**
    - **Validates: Requirements 7.5**
  
  - [x] 6.8 实现部署失败回滚
    - 检测部署失败
    - 执行资源清理
    - 恢复到上一个稳定版本（如果存在）
    - _Requirements: 4.5_

- [x] 7. 实现 Streamable HTTP 运行时处理器
  - [x] 7.1 实现令牌验证中间件
    - 提取 Authorization header
    - 验证 Cognito 令牌
    - 处理无效令牌（返回 401）
    - _Requirements: 3.4, 3.5_
  
  - [ ]* 7.2 编写令牌验证属性测试（拒绝）
    - **Property 11: 令牌验证拒绝无效请求**
    - **Validates: Requirements 3.5**
  
  - [ ]* 7.3 编写令牌验证属性测试（接受）
    - **Property 12: 令牌验证接受有效请求**
    - **Validates: Requirements 3.4**
  
  - [x] 7.4 实现请求转发逻辑
    - 建立到 MCP 服务器的连接
    - 转发客户端请求
    - _Requirements: 5.1_
  
  - [ ]* 7.5 编写请求转发属性测试
    - **Property 16: 认证请求正确转发**
    - **Validates: Requirements 5.1**
  
  - [x] 7.6 实现流式响应处理
    - 使用 chunked transfer encoding
    - 实现流式数据传输
    - 保持连接支持多次往返
    - _Requirements: 5.2, 5.3_
  
  - [ ]* 7.7 编写流式传输属性测试
    - **Property 17: 响应流式传输**
    - **Validates: Requirements 5.2**
  
  - [ ]* 7.8 编写连接保持属性测试
    - **Property 18: 连接保持支持双向通信**
    - **Validates: Requirements 5.3**
  
  - [x] 7.9 实现传输错误处理
    - 捕获传输错误
    - 返回明确的错误信息
    - _Requirements: 5.4_
  
  - [ ]* 7.10 编写传输错误属性测试
    - **Property 19: 传输错误返回明确信息**
    - **Validates: Requirements 5.4**

- [x] 8. 实现 launch 命令
  - [x] 8.1 实现完整部署流程编排
    - 加载配置
    - 触发构建
    - 设置认证
    - 部署到运行时
    - 返回结果
    - _Requirements: 2.1, 3.1, 4.1_
  
  - [x] 8.2 实现资源信息输出
    - 输出构建 ID
    - 输出 ECR 镜像 URI
    - 输出 Cognito 资源 ID
    - 输出端点 URL
    - _Requirements: 7.2_
  
  - [ ]* 8.3 编写资源信息输出属性测试
    - **Property 21: 成功步骤输出资源信息**
    - **Validates: Requirements 7.2**
  
  - [x] 8.4 实现容器启动命令配置
    - 使用 uvx 命令启动 MCP 服务器
    - 传递 transport 和 port 参数
    - _Requirements: 8.3_
  
  - [ ]* 8.5 编写容器启动命令属性测试
    - **Property 27: 容器使用 uvx 启动服务器**
    - **Validates: Requirements 8.3**

- [ ] 9. 实现版本更新支持
  - [ ] 9.1 实现版本检测和更新逻辑
    - 检测 MCP 服务器包版本变化
    - 触发重新构建
    - 执行重新部署
    - _Requirements: 8.5_
  
  - [ ]* 9.2 编写版本更新属性测试
    - **Property 29: 版本更新支持重新部署**
    - **Validates: Requirements 8.5**

- [ ] 10. 创建客户端 SDK 和示例
  - [ ] 10.1 实现 Python 客户端 SDK
    - 实现 MCPClient 类
    - 实现令牌管理
    - 实现流式请求/响应处理
    - _Requirements: 5.1, 5.2_
  
  - [x] 10.2 创建 Jupyter Notebook 快速入门
    - 创建 Notebook 文件
    - 添加身份认证示例
    - 添加连接示例
    - 添加请求/响应示例
    - 确保代码可直接运行
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ]* 12. 编写集成测试
  - 使用 Testcontainers 设置 LocalStack
  - 编写端到端部署测试
  - 测试完整的 configure -> launch -> 访问流程
  - _Requirements: 所有需求_

- [ ]* 13. 配置 CI/CD 管道
  - 创建 GitHub Actions 工作流
  - 配置单元测试运行
  - 配置属性测试运行
  - 配置集成测试运行
  - 配置代码覆盖率报告

- [ ] 14. 编写项目文档
  - [ ] 14.1 创建 README.md
    - 项目概述
    - 安装说明
    - 使用示例
    - API 文档链接
  
  - [ ] 14.2 创建 API 文档
    - CLI 命令参考
    - 配置文件格式
    - 错误代码参考
  
  - [ ] 14.3 创建故障排除指南
    - 常见错误和解决方案
    - 调试技巧
    - 支持资源链接

- [ ] 15. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户
