// Quick test to understand scoring
const fs = require('fs');
const path = require('path');

// Simple test: what score do we get for various scenarios?
console.log("This test needs the actual code to run. Let me just examine what's happening...");

// The issue is likely:
// 1. Tag overlap scoring - might not work as expected
// 2. Budget tier matching when tier is null
// 3. Jitter range causing scores outside expected bounds

console.log("Expected failures:");
console.log("- tag overlap with partial matches might add more than expected");
console.log("- null budget tier handling");
console.log("- jitter range is 0-9 but actual hash might produce larger values");
