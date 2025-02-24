#!/bin/bash

# Ensure we're in the root of the repository
cd "$(git rev-parse --show-toplevel)" || exit 1

# Create new orphan branch
git checkout --orphan temp_branch

# Add all files to the new branch
git add .

# Create new commit without history
git commit -m "Fresh start: Remove sensitive data"

# Delete the main branch
git branch -D main

# Rename temp branch to main
git branch -m main

# Remove all other branches and tags
git tag -d $(git tag -l)
git gc --aggressive --prune=all

# Force update the repository
echo "Ready to force push. Run: git push origin main --force"
