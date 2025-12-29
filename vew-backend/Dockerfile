FROM node:18

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies  
RUN npm ci

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies (bypass externally-managed-environment)
RUN pip3 install --break-system-packages -r requirements.txt

# Copy application code
COPY . .

# Expose ports
EXPOSE 8080 8000

# Start both services
# Python WebSocket service on 8000, Node.js Express on 8080
CMD uvicorn realtime_ai_service:app --host 0.0.0.0 --port 8000 & node server.js
