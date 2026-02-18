#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_NAME="@cobbl-ai/sdk"

cd "$PACKAGE_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  echo "Usage: $0 [bump_type] [--tag <tag>] [--dry-run]"
  echo ""
  echo "If no bump_type is given, publishes the current version as-is."
  echo ""
  echo "Examples:"
  echo "  $0                          # Publish current version"
  echo "  $0 patch                    # 0.1.0 -> 0.1.1"
  echo "  $0 minor                    # 0.1.0 -> 0.2.0"
  echo "  $0 major                    # 0.1.0 -> 1.0.0"
  echo "  $0 prepatch --tag beta      # 0.1.0 -> 0.1.1-beta.0"
  echo "  $0 prerelease --tag beta    # 0.1.1-beta.0 -> 0.1.1-beta.1"
  echo "  $0 patch --dry-run          # Preview without publishing"
  echo "  $0 --dry-run                # Preview current version without publishing"
  exit 1
}

BUMP_TYPE=""
TAG=""
DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    -*)
      usage
      ;;
    *)
      if [ -z "$BUMP_TYPE" ]; then
        BUMP_TYPE="$1"
      else
        usage
      fi
      shift
      ;;
  esac
done

if [ -n "$BUMP_TYPE" ]; then
  case "$BUMP_TYPE" in
    patch|minor|major|premajor|preminor|prepatch|prerelease) ;;
    *) usage ;;
  esac
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}=== ${PACKAGE_NAME} Release ===${NC}"
echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory has uncommitted changes.${NC}"
  echo "Please commit or stash your changes before releasing."
  exit 1
fi

# Check npm auth
if ! npm whoami &>/dev/null; then
  echo -e "${RED}Error: Not logged in to npm.${NC}"
  echo "Run 'npm login' first."
  exit 1
fi

# Bump version (if requested)
if [ -n "$BUMP_TYPE" ]; then
  if [ -n "$TAG" ]; then
    NEW_VERSION=$(npm version "$BUMP_TYPE" --preid "$TAG" --no-git-tag-version)
  else
    NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version)
  fi
  NEW_VERSION="${NEW_VERSION#v}"
  echo -e "New version:     ${GREEN}${NEW_VERSION}${NC}"
else
  NEW_VERSION="$CURRENT_VERSION"
  echo -e "Publishing:      ${GREEN}${NEW_VERSION}${NC} (no version bump)"
fi
echo ""

# Run tests
echo -e "${BLUE}Running tests...${NC}"
pnpm test
echo -e "${GREEN}Tests passed.${NC}"
echo ""

# Typecheck
echo -e "${BLUE}Running typecheck...${NC}"
pnpm typecheck
echo -e "${GREEN}Typecheck passed.${NC}"
echo ""

# Build (clean + build via prepublishOnly)
echo -e "${BLUE}Building...${NC}"
pnpm clean && pnpm build
echo -e "${GREEN}Build complete.${NC}"
echo ""

# Show what will be published
echo -e "${BLUE}Package contents:${NC}"
npm pack --dry-run 2>&1 | head -30
echo ""

if [ "$DRY_RUN" = true ]; then
  if [ -n "$BUMP_TYPE" ]; then
    echo -e "${YELLOW}Dry run complete. Reverting version bump.${NC}"
    git checkout package.json
  else
    echo -e "${YELLOW}Dry run complete.${NC}"
  fi
  exit 0
fi

# Confirm
echo -e "${YELLOW}About to publish ${PACKAGE_NAME}@${NEW_VERSION} to npm.${NC}"
read -r -p "Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  if [ -n "$BUMP_TYPE" ]; then
    echo "Aborting. Reverting version bump."
    git checkout package.json
  else
    echo "Aborting."
  fi
  exit 1
fi

# Publish
if [ -n "$TAG" ]; then
  pnpm publish --access public --tag "$TAG" --no-git-checks
else
  pnpm publish --access public --no-git-checks
fi

echo ""
echo -e "${GREEN}Published ${PACKAGE_NAME}@${NEW_VERSION}${NC}"

# Git commit and tag (only if version was bumped)
if [ -n "$BUMP_TYPE" ]; then
  git add package.json
  git commit -m "release: ${PACKAGE_NAME}@${NEW_VERSION}"
fi

git tag "${PACKAGE_NAME}@${NEW_VERSION}"

echo -e "${GREEN}Created tag: ${PACKAGE_NAME}@${NEW_VERSION}${NC}"
echo ""

# Push commit and tag
echo -e "${BLUE}Pushing to remote...${NC}"
git push && git push --tags
echo -e "${GREEN}Pushed to remote.${NC}"
