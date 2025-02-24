#!/bin/bash

# Create a fresh backup branch
git checkout -b backup_$(date +%Y%m%d_%H%M%S)

# Remove sensitive files from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch test-chatbot.sh analyze-chatbot.sh backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Remove the old refs
git for-each-ref --format="delete %(refname)" refs/original/ | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now
