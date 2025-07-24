#!/usr/bin/env bash

set -euo pipefail

# ask for confirmation
read -p "Are you sure you want to release? (y/N) " -n 1 -r

# check if the user confirmed
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  printf "\n❌ Release cancelled.\n"
  exit 1
fi

printf "\nchecking current branch...\n"

# check if there are any uncommitted changes
if [[ $(git status --porcelain) ]]; then
  printf "❌ Uncommitted changes found. Please commit or stash them before releasing.\n"
  exit 1
fi

# check if the current branch is main 
if [[ $(git branch --show-current) != "main" ]]; then
  # if not then try to checkout main and fail if not possible
  if ! git checkout main; then
    printf "❌ Unable to checkout main branch. Please checkout main branch manually.\n"
    exit 1
  fi
fi

# pull the latest changes from main using rebase
git pull --rebase

# push the changes to main, this will run checks locally
git push origin main

# run tests
yarn test

# checkout and reset the release branch
git checkout -B release

# rebase main onto release
git rebase main

# push the changes to release without checks as this were already done in main
git push origin release --no-verify

# checkout main
git checkout main

printf "✅ Release branch updated.\n"
