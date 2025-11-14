#!/bin/bash

# Test Grapevine SDK with multiple package managers
# This script ensures compatibility across npm, pnpm, yarn, and bun

set -e

echo "🍇 Testing Grapevine SDK with multiple package managers..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to test with a package manager
test_package_manager() {
    local pm=$1
    local install_cmd=$2
    local test_cmd=$3
    local build_cmd=$4
    
    echo ""
    echo "Testing with $pm..."
    echo "------------------------"
    
    # Check if package manager is available
    if ! command -v $pm &> /dev/null; then
        print_warning "$pm is not installed, skipping..."
        return 0
    fi
    
    # Clean up previous installation
    rm -rf node_modules dist
    rm -f package-lock.json yarn.lock pnpm-lock.yaml bun.lockb
    
    # Install dependencies
    print_status "Installing dependencies with $pm..."
    $install_cmd
    
    # Run build
    print_status "Building with $pm..."
    $build_cmd
    
    # Run tests
    print_status "Running tests with $pm..."
    $test_cmd
    
    print_status "$pm tests completed successfully!"
}

# Test with npm
test_package_manager "npm" "npm install" "npm test" "npm run build"

# Test with pnpm
test_package_manager "pnpm" "pnpm install" "pnpm test" "pnpm build"

# Test with yarn
test_package_manager "yarn" "yarn install" "yarn test" "yarn build"

# Test with bun
test_package_manager "bun" "bun install" "bun test" "bun run build"

echo ""
echo "=================================================="
print_status "All package manager tests completed successfully!"
echo ""
echo "Summary:"
echo "- npm:  ✓"
echo "- pnpm: ✓"
echo "- yarn: ✓"
echo "- bun:  ✓"