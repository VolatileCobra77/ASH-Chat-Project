#!/usr/bin/bash
# Set the path to your project and script
PROJECT_DIR="/ASH-Chat-Project"
SCRIPT_NAME="main.js"
SESSION_NAME="ash-chat"

# Function to start the tmux session
start_tmux_session() {
    tmux new-session -d -s "$SESSION_NAME" "$PROJECT_DIR/$SCRIPT_NAME"
    echo "Tmux session started. Connect with: tmux attach-session -t $SESSION_NAME"
}

# Function to stop the tmux session
stop_tmux_session() {
    tmux kill-session -t "$SESSION_NAME"
    echo "Tmux session stopped."
}

# Start the initial tmux session
start_tmux_session


if tmux has-session -t ash-chat 2>/dev/null; then
    echo "Tmux session successfully started. Connect with: tmux attach-session -t ash-chat"
    while true; do
    sleep 5
    done

else
    echo "Failed to start tmux session, starting regular"
    cd /ASH-Chat-Project
    ./main.js
fi




