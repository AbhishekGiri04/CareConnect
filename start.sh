#!/bin/bash

echo "CareConnect - Starting Services..."
echo "======================================"

# Start Backend
echo "Starting Backend (Port 3001)..."
cd /Users/abhishekgiri/Downloads/GITHUB_PROJECTS/CareConnect/backend
npm start &
BACKEND_PID=$!

# Wait 5 seconds for backend to initialize
sleep 5

# Start Frontend
echo "Starting Frontend (Port 3002)..."
cd /Users/abhishekgiri/Downloads/GITHUB_PROJECTS/CareConnect/frontend
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 8

# Auto-open browser
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3002
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3002
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start http://localhost:3002
fi

echo ""
echo "CareConnect Started!"
echo "   Frontend: http://localhost:3002"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping CareConnect...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
