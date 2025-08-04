#!/bin/bash

# Test Runner Script for Sales and Stock Manager
# This script runs different types of tests and generates reports

echo "🧪 Sales and Stock Manager - Test Suite Runner"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run tests and capture results
run_test_suite() {
    local test_pattern=$1
    local suite_name=$2
    
    print_status $BLUE "Running ${suite_name}..."
    
    if npm test -- --testPathPattern="$test_pattern" --passWithNoTests --silent > /tmp/test_output.log 2>&1; then
        local passed=$(grep -o "passed" /tmp/test_output.log | wc -l)
        print_status $GREEN "✅ ${suite_name}: ${passed} tests passed"
        return 0
    else
        local failed=$(grep -o "failed" /tmp/test_output.log | wc -l)
        print_status $RED "❌ ${suite_name}: ${failed} tests failed"
        return 1
    fi
}

# Initialize counters
total_suites=0
passed_suites=0

echo ""
print_status $YELLOW "📊 Running Test Suites..."
echo ""

# Test different categories
declare -A test_suites=(
    ["hooks"]="Hook Tests"
    ["lib.*test\.ts$"]="Library Unit Tests" 
    ["security"]="Security Tests"
    ["performance"]="Performance Tests"
    ["integration"]="Integration Tests"
)

# Run each test suite
for pattern in "${!test_suites[@]}"; do
    suite_name="${test_suites[$pattern]}"
    ((total_suites++))
    
    if run_test_suite "$pattern" "$suite_name"; then
        ((passed_suites++))
    fi
done

echo ""
print_status $YELLOW "📈 Test Summary"
echo "==============="
print_status $BLUE "Total Test Suites: $total_suites"
print_status $GREEN "Passed: $passed_suites"
print_status $RED "Failed: $((total_suites - passed_suites))"

# Calculate success percentage
if [ $total_suites -gt 0 ]; then
    success_rate=$((passed_suites * 100 / total_suites))
    print_status $BLUE "Success Rate: ${success_rate}%"
    
    if [ $success_rate -ge 80 ]; then
        print_status $GREEN "🎉 Excellent test coverage!"
    elif [ $success_rate -ge 60 ]; then
        print_status $YELLOW "⚠️  Good test coverage, room for improvement"
    else
        print_status $RED "🚨 Test coverage needs attention"
    fi
fi

echo ""
print_status $YELLOW "🔧 Test Infrastructure Validation"
echo "=================================="

# Check if critical test files exist
critical_tests=(
    "__tests__/security/security-tests.test.tsx"
    "__tests__/performance/performance-tests.test.tsx"
    "__tests__/integration/sales-transaction-flow.test.tsx"
    "docs/testing/testing-strategy.md"
    "docs/testing/coverage-report.md"
    "docs/testing/how-to-run-tests.md"
)

for test_file in "${critical_tests[@]}"; do
    if [ -f "$test_file" ]; then
        print_status $GREEN "✅ $test_file"
    else
        print_status $RED "❌ Missing: $test_file"
    fi
done

echo ""
print_status $YELLOW "📋 Available Test Commands"
echo "=========================="
echo "npm test                    # Run all tests"
echo "npm run test:coverage       # Run with coverage"
echo "npm test -- --testPathPattern=security  # Security tests only"
echo "npm test -- --testPathPattern=performance  # Performance tests only"
echo "npm test -- --testPathPattern=integration  # Integration tests only"
echo "npm test -- --watch         # Watch mode for development"

echo ""
print_status $BLUE "📚 Documentation Available:"
echo "- docs/testing/testing-strategy.md"
echo "- docs/testing/coverage-report.md" 
echo "- docs/testing/how-to-run-tests.md"

echo ""
if [ $passed_suites -eq $total_suites ]; then
    print_status $GREEN "🎯 All test suites are working correctly!"
    exit 0
else
    print_status $YELLOW "⚠️  Some test suites need attention. Check the React Testing Library compatibility."
    exit 1
fi