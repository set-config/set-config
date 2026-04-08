#!/bin/bash
# post-publish-test.sh - Verify published packages work correctly
# Usage: ./post-publish-test.sh <version>
# Example: ./post-publish-test.sh 0.0.8

set -e

VERSION=${1:-latest}
REGISTRY="--registry https://registry.npmjs.org/"
TMPDIR=$(mktemp -d)
cd "$TMPDIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo "=== Testing @set-config/core@$VERSION ==="
npx -p @set-config/core@$VERSION $REGISTRY set-config --help > /dev/null && pass "core: --help works" || fail "core: --help failed"
npx -p @set-config/core@$VERSION $REGISTRY set-config init test.json --format json 2>/dev/null && pass "core: init JSON" || fail "core: init JSON failed"
npx -p @set-config/core@$VERSION $REGISTRY set-config set test.json a.b.c 123 2>/dev/null && pass "core: set value" || fail "core: set value failed"
npx -p @set-config/core@$VERSION $REGISTRY set-config get test.json a.b.c 2>/dev/null | grep -q "123" && pass "core: get value" || fail "core: get value failed"
npx -p @set-config/core@$VERSION $REGISTRY set-config set test.json x.yaml.a 1 2>&1 | grep -q "not supported\|Format not supported" && pass "core: YAML not supported without adapter" || fail "core: should reject YAML without adapter"

echo ""
echo "=== Testing @set-config/yaml@$VERSION ==="
npx -p @set-config/yaml@$VERSION $REGISTRY set-config init test.yaml --format yaml 2>/dev/null && pass "yaml: init YAML" || fail "yaml: init YAML failed"
npx -p @set-config/yaml@$VERSION $REGISTRY set-config set test.yaml x.y.z 456 2>/dev/null && pass "yaml: set YAML value" || fail "yaml: set YAML value failed"
npx -p @set-config/yaml@$VERSION $REGISTRY set-config get test.yaml x.y.z 2>/dev/null | grep -q "456" && pass "yaml: get YAML value" || fail "yaml: get YAML value failed"

echo ""
echo "=== Testing @set-config/toml@$VERSION ==="
npx -p @set-config/toml@$VERSION $REGISTRY set-config init test.toml --format toml 2>/dev/null && pass "toml: init TOML" || fail "toml: init TOML failed"
npx -p @set-config/toml@$VERSION $REGISTRY set-config set test.toml p.q.r 789 2>/dev/null && pass "toml: set TOML value" || fail "toml: set TOML value failed"
npx -p @set-config/toml@$VERSION $REGISTRY set-config get test.toml p.q.r 2>/dev/null | grep -q "789" && pass "toml: get TOML value" || fail "toml: get TOML value failed"

echo ""
echo "=== Testing @set-config/cli@$VERSION (full-featured) ==="
npx -p @set-config/cli@$VERSION $REGISTRY set-config formats 2>/dev/null | grep -q "JSON" && pass "cli: supports JSON" || fail "cli: JSON support missing"
npx -p @set-config/cli@$VERSION $REGISTRY set-config formats 2>/dev/null | grep -q "YAML" && pass "cli: supports YAML" || fail "cli: YAML support missing"
npx -p @set-config/cli@$VERSION $REGISTRY set-config formats 2>/dev/null | grep -q "TOML" && pass "cli: supports TOML" || fail "cli: TOML support missing"
npx -p @set-config/cli@$VERSION $REGISTRY set-config init cli-test.json --format json 2>/dev/null && pass "cli: init JSON" || fail "cli: init JSON failed"
npx -p @set-config/cli@$VERSION $REGISTRY set-config init cli-test.yaml --format yaml 2>/dev/null && pass "cli: init YAML" || fail "cli: init YAML failed"
npx -p @set-config/cli@$VERSION $REGISTRY set-config init cli-test.toml --format toml 2>/dev/null && pass "cli: init TOML" || fail "cli: init TOML failed"
npx -p @set-config/cli@$VERSION $REGISTRY set-config set cli-test.yaml a.b.c 999 2>/dev/null && pass "cli: set YAML value" || fail "cli: set YAML value failed"
npx -p @set-config/cli@$VERSION $REGISTRY set-config set cli-test.toml d.e.f 888 2>/dev/null && pass "cli: set TOML value" || fail "cli: set TOML value failed"

echo ""
echo "=== Cleanup ==="
cd / && rm -rf "$TMPDIR"
pass "cleanup complete"

echo ""
echo -e "${GREEN}All tests passed!${NC}"
