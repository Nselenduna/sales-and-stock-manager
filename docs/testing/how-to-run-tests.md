# How to Run Tests - Complete Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Test Commands Reference

### Basic Test Execution

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, exit on completion)
npm test -- --ci --watchAll=false
```

### Running Specific Test Types

```bash
# Unit tests only
npm test -- __tests__/components/
npm test -- __tests__/hooks/
npm test -- __tests__/lib/

# Integration tests
npm test -- __tests__/integration/

# Security tests  
npm test -- __tests__/security/

# Performance tests
npm test -- __tests__/performance/

# End-to-end tests
npm test -- __tests__/e2e/

# Sales-related tests
npm test -- __tests__/sales/
```

### Running Specific Files or Patterns

```bash
# Run specific test file
npm test -- LoginScreen.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="authentication"

# Run tests for specific component
npm test -- --testPathPattern="SalesScreen"

# Run tests that changed since last commit
npm test -- --onlyChanged

# Run tests related to changed files
npm test -- --changedSince=main
```

## Test Configuration Options

### Jest CLI Options

```bash
# Verbose output (show all test results)
npm test -- --verbose

# Run tests in parallel (default: true)
npm test -- --maxWorkers=4

# Disable parallel execution
npm test -- --runInBand

# Update snapshots
npm test -- --updateSnapshot

# Generate coverage report
npm test -- --coverage

# Specify coverage directory
npm test -- --coverage --coverageDirectory=coverage

# Run tests with specific timeout
npm test -- --testTimeout=10000
```

### Environment Variables

```bash
# Set test environment
NODE_ENV=test npm test

# Enable debug logging
DEBUG=true npm test

# Disable console output during tests
SILENT=true npm test

# Use different configuration
JEST_CONFIG=jest.config.ci.js npm test
```

## Development Workflow

### Test-Driven Development (TDD)

```bash
# 1. Start in watch mode
npm run test:watch

# 2. Write failing test first
# 3. Write minimal code to pass
# 4. Refactor while keeping tests green
# 5. Repeat cycle
```

### Testing New Features

```bash
# Create test file for new component
touch __tests__/components/NewComponent.test.tsx

# Run only the new test during development
npm test -- NewComponent.test.tsx --watch

# Add integration tests
touch __tests__/integration/new-feature-flow.test.tsx
```

### Debugging Tests

```bash
# Run tests with debug output
npm test -- --verbose --no-cache

# Run single test with full output
npm test -- --testNamePattern="specific test name" --verbose

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Coverage Reports

### Generating Coverage

```bash
# Basic coverage report
npm run test:coverage

# Coverage with specific threshold
npm run test:coverage -- --coverageThreshold='{"global":{"lines":80}}'

# Coverage for specific directories
npm run test:coverage -- --collectCoverageFrom="src/components/**/*.{ts,tsx}"

# Coverage in different formats
npm run test:coverage -- --coverageReporters=html,text,lcov
```

### Reading Coverage Output

#### Console Output
```
=============================== Coverage summary ===============================
Statements   : 80.25% ( 1205/1502 )
Branches     : 72.15% ( 387/536 )
Functions    : 76.32% ( 145/190 )
Lines        : 81.50% ( 1156/1418 )
==================================================================================
```

#### Coverage Files Generated
```
coverage/
├── clover.xml          # Clover format
├── coverage-final.json # JSON format
├── lcov.info          # LCOV format
└── lcov-report/       # HTML report
    └── index.html     # Open in browser
```

### Viewing HTML Coverage Report

```bash
# Generate and open HTML report
npm run test:coverage && open coverage/lcov-report/index.html

# On Windows
npm run test:coverage && start coverage/lcov-report/index.html

# Using Python server
cd coverage/lcov-report && python -m http.server 8000
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Docker Testing

```bash
# Run tests in Docker container
docker run --rm -v $(pwd):/app -w /app node:18 npm test

# Build test image
docker build -t sales-app-test -f Dockerfile.test .
docker run --rm sales-app-test
```

## Advanced Test Scenarios

### Performance Testing

```bash
# Run performance tests only
npm test -- __tests__/performance/

# Run with performance monitoring
npm test -- --logHeapUsage

# Test with memory limits
node --max-old-space-size=4096 node_modules/.bin/jest
```

### Security Testing

```bash
# Run security-focused tests
npm test -- __tests__/security/

# Test with security audit
npm audit && npm test

# Run with strict security checks
npm test -- --detectOpenHandles --forceExit
```

### Cross-Platform Testing

```bash
# Test on different Node versions
nvm use 16 && npm test
nvm use 18 && npm test
nvm use 20 && npm test

# Test with different React Native versions
npm test -- --testEnvironment=node
```

## Troubleshooting Common Issues

### Test Failures

```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests without cache
npm test -- --no-cache

# Debug failing tests
npm test -- --verbose --no-coverage FailingTest.test.tsx
```

### Performance Issues

```bash
# Run tests sequentially (if parallel issues)
npm test -- --runInBand

# Limit worker processes
npm test -- --maxWorkers=2

# Skip slow tests during development
npm test -- --testPathIgnorePatterns=__tests__/e2e/
```

### Memory Issues

```bash
# Increase memory limit
node --max-old-space-size=8192 node_modules/.bin/jest

# Check for memory leaks
npm test -- --logHeapUsage --detectOpenHandles
```

### Mock Issues

```bash
# Clear all mocks before tests
npm test -- --clearMocks

# Reset modules between tests
npm test -- --resetModules

# Isolate modules for each test
npm test -- --isolateModules
```

## Pre-commit Testing

### Husky Setup

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm test -- --passWithNoTests",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

### Lint-staged Configuration

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "npm test -- --findRelatedTests --passWithNoTests"
    ]
  }
}
```

## Team Workflow

### Code Review Checklist

- [ ] New features have corresponding tests
- [ ] Tests cover happy path and error cases
- [ ] Coverage threshold maintained
- [ ] No test files committed with `.skip` or `.only`
- [ ] Tests are deterministic (no flaky tests)

### Branch Testing Strategy

```bash
# Feature branch testing
git checkout feature/new-feature
npm test -- --onlyChanged

# Before merging
npm run test:coverage
npm run lint
npm run type-check
```

### Release Testing

```bash
# Full test suite before release
npm run test:coverage
npm run lint
npm run type-check
npm run build

# Regression test suite
npm test -- __tests__/e2e/ --verbose
```

## IDE Integration

### VS Code

Install recommended extensions:
- Jest
- Jest Runner
- Coverage Gutters

### Configuration (.vscode/settings.json)

```json
{
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true,
  "coverage-gutters.showLineCoverage": true,
  "coverage-gutters.coverageFileNames": [
    "lcov.info",
    "coverage.xml"
  ]
}
```

### Running Tests from IDE

- **F5**: Debug current test file
- **Ctrl+Shift+P > Jest: Start Runner**: Start Jest runner
- **Right-click > Run Test**: Run specific test

## Useful Scripts

### Custom npm Scripts

```json
{
  "scripts": {
    "test:unit": "jest __tests__/components/ __tests__/hooks/ __tests__/lib/",
    "test:integration": "jest __tests__/integration/",
    "test:e2e": "jest __tests__/e2e/",
    "test:security": "jest __tests__/security/",
    "test:performance": "jest __tests__/performance/",
    "test:changed": "jest --onlyChanged",
    "test:related": "jest --findRelatedTests",
    "test:debug": "jest --verbose --no-cache --runInBand"
  }
}
```

### Shell Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias nt="npm test"
alias ntw="npm run test:watch"
alias ntc="npm run test:coverage"
alias ntu="npm test -- __tests__/components/"
alias nti="npm test -- __tests__/integration/"
```

---

**Need Help?**
- Check test logs for detailed error messages
- Review mock configurations in `__mocks__/`
- Consult team testing guidelines in `docs/testing/`
- Ask team members for pair debugging sessions

**Quick References:**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](./testing-strategy.md)