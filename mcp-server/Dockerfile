FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port 8000 (AgentCore expects MCP at 0.0.0.0:8000/mcp)
EXPOSE 8000

# Run the MCP server
CMD ["python", "mcp_server.py"]
