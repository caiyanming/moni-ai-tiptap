#!/bin/bash

# Publish all packages to Verdaccio registry
# Usage: ./scripts/publish-to-verdaccio.sh

REGISTRY="http://registry.fufenxi.com:4873/"

echo "Publishing packages to Verdaccio registry: $REGISTRY"
echo "----------------------------------------"

# Counter for tracking published packages
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_PACKAGES=()

# Iterate through all package directories
for dir in packages/*/; do
  if [ -f "$dir/package.json" ]; then
    # Extract package name and version
    pkg_name=$(cat "$dir/package.json" | grep '"name"' | head -1 | cut -d'"' -f4)
    pkg_version=$(cat "$dir/package.json" | grep '"version"' | head -1 | cut -d'"' -f4)

    echo "Processing $pkg_name@$pkg_version..."

    # Try to unpublish existing version first (ignore errors)
    echo "  Unpublishing existing version..."
    npm unpublish "$pkg_name@$pkg_version" --registry="$REGISTRY" --force 2>/dev/null || echo "  (No existing version to unpublish)"

    # Navigate to package directory and publish
    echo "  Publishing new version..."
    (cd "$dir" && npm publish --registry="$REGISTRY" --access public --tag beta 2>/dev/null)

    if [ $? -eq 0 ]; then
      echo "✅ Successfully published $pkg_name"
      ((SUCCESS_COUNT++))
    else
      echo "❌ Failed to publish $pkg_name"
      ((FAILED_COUNT++))
      FAILED_PACKAGES+=("$pkg_name")
    fi

    echo ""
  fi
done

echo "----------------------------------------"
echo "Publishing Summary:"
echo "✅ Successfully published: $SUCCESS_COUNT packages"
echo "❌ Failed to publish: $FAILED_COUNT packages"

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
  echo ""
  echo "Failed packages:"
  for pkg in "${FAILED_PACKAGES[@]}"; do
    echo "  - $pkg"
  done
fi

echo ""
echo "Done!"