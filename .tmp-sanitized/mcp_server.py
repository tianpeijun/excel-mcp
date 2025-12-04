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

# S3 configuration for file downloads
# Option 1: Set via environment variable EXCEL_S3_BUCKET
# Option 2: Hardcode your bucket name below
S3_BUCKET = os.environ.get("EXCEL_S3_BUCKET", "")  # Set your bucket name here or via env var
S3_PREFIX = os.environ.get("EXCEL_S3_PREFIX", "excel-downloads/")  # S3 key prefix
PRESIGNED_URL_EXPIRY = int(os.environ.get("PRESIGNED_URL_EXPIRY", "3600"))  # 1 hour default

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
# STEP 4: Add S3 download tool
# ============================================================
import boto3
from botocore.exceptions import ClientError
from datetime import datetime


@mcp.tool()
def upload_to_s3_and_get_download_url(filepath: str, custom_filename: str = "") -> str:
    """
    Upload Excel file to S3 and return a presigned download URL.
    
    Args:
        filepath: Path to the Excel file (relative to EXCEL_FILES_PATH or absolute)
        custom_filename: Optional custom filename for the download (default: original filename)
    
    Returns:
        JSON string with download URL or error message
    """
    import json
    
    if not S3_BUCKET:
        return json.dumps({
            "success": False,
            "error": "S3_BUCKET not configured. Set EXCEL_S3_BUCKET environment variable."
        })
    
    # Resolve file path
    excel_files_path = os.environ.get("EXCEL_FILES_PATH", "/tmp/excel_files")
    if not os.path.isabs(filepath):
        full_path = os.path.join(excel_files_path, filepath)
    else:
        full_path = filepath
    
    # Check if file exists
    if not os.path.exists(full_path):
        return json.dumps({
            "success": False,
            "error": f"File not found: {filepath}"
        })
    
    try:
        from urllib.parse import quote
        
        s3_client = boto3.client("s3")
        
        # Generate S3 key
        filename = custom_filename if custom_filename else os.path.basename(filepath)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"{S3_PREFIX}{timestamp}_{filename}"
        
        # URL encode filename for Content-Disposition header (RFC 5987)
        encoded_filename = quote(filename, safe='')
        content_disposition = f"attachment; filename*=UTF-8''{encoded_filename}"
        
        # Upload to S3
        s3_client.upload_file(
            full_path,
            S3_BUCKET,
            s3_key,
            ExtraArgs={
                "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "ContentDisposition": content_disposition
            }
        )
        
        # Generate presigned URL
        download_url = s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": s3_key,
                "ResponseContentDisposition": content_disposition
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
        
        print(f"[S3] Uploaded {filepath} to s3://{S3_BUCKET}/{s3_key}", flush=True)
        
        return json.dumps({
            "success": True,
            "download_url": download_url,
            "filename": filename,
            "s3_bucket": S3_BUCKET,
            "s3_key": s3_key,
            "expires_in_seconds": PRESIGNED_URL_EXPIRY,
            "message": f"文件已上传，点击链接下载: {download_url}"
        })
        
    except ClientError as e:
        return json.dumps({
            "success": False,
            "error": f"S3 error: {str(e)}"
        })
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        })


@mcp.tool()
def list_excel_files() -> str:
    """
    List all Excel files in the working directory.
    
    Returns:
        JSON string with list of available Excel files
    """
    import json
    
    excel_files_path = os.environ.get("EXCEL_FILES_PATH", "/tmp/excel_files")
    
    try:
        files = []
        if os.path.exists(excel_files_path):
            for f in os.listdir(excel_files_path):
                if f.endswith((".xlsx", ".xls")):
                    full_path = os.path.join(excel_files_path, f)
                    files.append({
                        "filename": f,
                        "size_bytes": os.path.getsize(full_path),
                        "modified": datetime.fromtimestamp(
                            os.path.getmtime(full_path)
                        ).isoformat()
                    })
        
        return json.dumps({
            "success": True,
            "files": files,
            "count": len(files),
            "directory": excel_files_path
        })
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        })


@mcp.tool()
def create_workbook_and_upload(filename: str, data: list = None, sheet_name: str = "Sheet1") -> str:
    """
    Create a new Excel workbook, optionally write data, and upload to S3 for download.
    This is a convenience tool that combines create_workbook, write_data_to_excel, and upload_to_s3_and_get_download_url.
    
    Args:
        filename: Name of the Excel file (e.g., "报价查询.xlsx")
        data: Optional list of lists containing data to write (e.g., [["Name", "Price"], ["Item1", 100]])
        sheet_name: Name of the worksheet (default: "Sheet1")
    
    Returns:
        JSON string with download URL or error message
    """
    import json
    from openpyxl import Workbook
    
    excel_files_path = os.environ.get("EXCEL_FILES_PATH", "/tmp/excel_files")
    os.makedirs(excel_files_path, exist_ok=True)
    
    # Ensure filename ends with .xlsx
    if not filename.endswith(".xlsx"):
        filename = filename + ".xlsx"
    
    filepath = os.path.join(excel_files_path, filename)
    
    try:
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = sheet_name
        
        # Write data if provided
        if data:
            for row_idx, row_data in enumerate(data, start=1):
                for col_idx, value in enumerate(row_data, start=1):
                    ws.cell(row=row_idx, column=col_idx, value=value)
        
        # Save workbook
        wb.save(filepath)
        print(f"[CREATE] Created workbook: {filepath}", flush=True)
        
        # Upload to S3
        if not S3_BUCKET:
            return json.dumps({
                "success": False,
                "error": "S3_BUCKET not configured"
            })
        
        from urllib.parse import quote
        
        s3_client = boto3.client("s3")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"{S3_PREFIX}{timestamp}_{filename}"
        
        # URL encode filename for Content-Disposition header (RFC 5987)
        encoded_filename = quote(filename, safe='')
        content_disposition = f"attachment; filename*=UTF-8''{encoded_filename}"
        
        s3_client.upload_file(
            filepath,
            S3_BUCKET,
            s3_key,
            ExtraArgs={
                "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "ContentDisposition": content_disposition
            }
        )
        
        download_url = s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": s3_key,
                "ResponseContentDisposition": content_disposition
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
        
        print(f"[S3] Uploaded to s3://{S3_BUCKET}/{s3_key}", flush=True)
        
        return json.dumps({
            "success": True,
            "download_url": download_url,
            "filename": filename,
            "s3_bucket": S3_BUCKET,
            "s3_key": s3_key,
            "expires_in_seconds": PRESIGNED_URL_EXPIRY,
            "message": f"Excel文件已创建并上传，点击链接下载: {download_url}"
        })
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"Error: {str(e)}"
        })


print(f"S3 download tool registered (bucket: {S3_BUCKET or 'NOT SET'})", flush=True)

# ============================================================
# STEP 5: Run the server
# ============================================================
if __name__ == "__main__":
    print("Starting MCP server on 0.0.0.0:8000/mcp (stateless_http=True)...", flush=True)
    mcp.run(transport="streamable-http")
