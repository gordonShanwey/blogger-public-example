#!/bin/bash

# Git commit and push script
# Takes commit message as argument and runs git add, commit, and push

# Check if commit message is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a commit message"
    echo "Usage: $0 'your commit message'"
    exit 1
fi

commit_message="$1"

echo "Running git commands..."
echo "1. git add ."
git add .

echo "2. git commit -m '$commit_message'"
git commit -m "$commit_message"

echo "3. git push"
git push

echo "Done! All git commands completed successfully." 