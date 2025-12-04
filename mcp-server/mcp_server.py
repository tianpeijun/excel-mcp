# mcp_server.py
# Excel MCP Server wrapper for Amazon Bedrock AgentCore deployment
# https://pypi.org/project/excel-mcp-server/
#
# AgentCore Requirements:
# - Host: 0.0.0.0, Port: 8000, Path: /mcp
# - stateless_http=True for session management
#
# Workarounds:
# 1. excel-mcp-server writes logs to /var/excel-mcp.log (not writable in AgentCore)
#    Solution: Patch logging.FileHandler to redirect to /tmp/

import os
import sys
import logging

# ============================================================
# STEP 1: Patch logging.FileHandler BEFORE importing excel_mcp
# ============================================================
_original_file_handler_init = logging.FileHandler.__init__


def _patched_file_handler_init(
    self, filename, mode="a", encoding=None, delay=False, errors=None
):
    """Redirect any /var/* log files to /tmp/"""
    if filename.startswith("/var/"):
        filename = "/tmp/" + os.path.basename(filename)
        print(f"[PATCH] Redirecting log file to: {filename}", flush=True)
    _original_file_handler_init(self, filename, mode, encoding, delay, errors)


logging.FileHandler.__init__ = _patched_file_handler_init

# ============================================================
# STEP 2: Set environment variables
# ============================================================
os.environ["EXCEL_FILES_PATH"] = "/tmp/excel_files"
os.makedirs("/tmp/excel_files", exist_ok=True)

print("Starting Excel MCP Server for AgentCore...", flush=True)
print(f"EXCEL_FILES_PATH: {os.environ['EXCEL_FILES_PATH']}", flush=True)
print(f"Python version: {sys.version}", flush=True)

# ============================================================
# STEP 3: Create FastMCP server with AgentCore settings
# ============================================================
from mcp.server.fastmcp import FastMCP

# Create FastMCP with AgentCore-required settings
mcp = FastMCP(
    name="excel-mcp",
    host="0.0.0.0",
    port=8000,
    stateless_http=True,  # Required for AgentCore!
)

# Import excel_mcp tools and register them
print("Loading excel_mcp tools...", flush=True)

try:
    from excel_mcp import server as excel_server

    original_mcp = excel_server.mcp

    # Copy all tools from excel_mcp to our mcp instance
    if hasattr(original_mcp, "_tool_manager") and hasattr(
        original_mcp._tool_manager, "_tools"
    ):
        for tool_name, tool_func in original_mcp._tool_manager._tools.items():
            print(f"  Registering tool: {tool_name}", flush=True)
            mcp._tool_manager._tools[tool_name] = tool_func

    print("Excel MCP tools loaded successfully", flush=True)

except Exception as e:
    print(f"Error loading excel_mcp tools: {e}", flush=True)
    import traceback

    traceback.print_exc()

    # Fallback: create a simple test tool
    @mcp.tool()
    def test_tool(message: str) -> str:
        """A simple test tool"""
        return f"Test response: {message}"

    print("Fallback: registered test_tool", flush=True)

# ============================================================
# STEP 4: Run the server
# ============================================================
if __name__ == "__main__":
    print("Starting MCP server on 0.0.0.0:8000/mcp (stateless_http=True)...", flush=True)
    mcp.run(transport="streamable-http")
