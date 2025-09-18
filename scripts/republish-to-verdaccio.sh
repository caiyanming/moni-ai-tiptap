#!/bin/bash

# Unpublish and republish all packages to Verdaccio registry
# Usage: ./scripts/republish-to-verdaccio.sh

REGISTRY="http://registry.fufenxi.com:4873/"

echo "Republishing packages to Verdaccio registry: $REGISTRY"
echo "========================================"

# Counter for tracking
UNPUBLISH_SUCCESS=0
UNPUBLISH_FAILED=0
PUBLISH_SUCCESS=0
PUBLISH_FAILED=0
FAILED_PACKAGES=()

# Phase 1: Unpublish all packages
echo ""
echo "Phase 1: Unpublishing existing packages..."
echo "----------------------------------------"

for dir in packages/*/; do
  if [ -f "$dir/package.json" ]; then
    # Extract package name
    pkg_name=$(cat "$dir/package.json" | grep '"name"' | head -1 | cut -d'"' -f4)

    echo "Unpublishing $pkg_name..."
    npm unpublish $pkg_name --registry="$REGISTRY" --force 2>/dev/null

    if [ $? -eq 0 ]; then
      echo "✅ Successfully unpublished $pkg_name"
      ((UNPUBLISH_SUCCESS++))
    else
      echo "⚠️  Could not unpublish $pkg_name (may not exist)"
      ((UNPUBLISH_FAILED++))
    fi
  fi
done

echo ""
echo "Unpublish Summary: ✅ $UNPUBLISH_SUCCESS succeeded, ⚠️  $UNPUBLISH_FAILED skipped"

# Phase 2: Publish all packages
echo ""
echo "Phase 2: Publishing packages..."
echo "----------------------------------------"

for dir in packages/*/; do
  if [ -f "$dir/package.json" ]; then
    # Extract package name
    pkg_name=$(cat "$dir/package.json" | grep '"name"' | head -1 | cut -d'"' -f4)

    echo "Publishing $pkg_name..."

    # Navigate to package directory and publish
    (cd "$dir" && npm publish --registry="$REGISTRY" --access public 2>/dev/null)

    if [ $? -eq 0 ]; then
      echo "✅ Successfully published $pkg_name"
      ((PUBLISH_SUCCESS++))
    else
      echo "❌ Failed to publish $pkg_name"
      ((PUBLISH_FAILED++))
      FAILED_PACKAGES+=("$pkg_name")
    fi
  fi
done

# Final Summary
echo ""
echo "========================================"
echo "Final Summary:"
echo "✅ Successfully published: $PUBLISH_SUCCESS packages"
echo "❌ Failed to publish: $PUBLISH_FAILED packages"

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
  echo ""
  echo "Failed packages:"
  for pkg in "${FAILED_PACKAGES[@]}"; do
    echo "  - $pkg"
  done
fi

echo ""
echo "Done!"