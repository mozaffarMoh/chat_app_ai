#!/bin/bash

# Check if a commit message was provided
if [ -z "$1" ]; then
  echo "Usage: ./push.sh \"Your commit message\""
  exit 1
fi

# Add all changes
git add .

# Commit with the message provided as the first argument
git commit -m "$1"

# Push to origin feras
git push
