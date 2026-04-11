#!/usr/bin/env node
// Wrapper to start Next.js dev server with proper PATH for Turbopack child processes
process.env.PATH = `/usr/local/bin:${process.env.PATH || ''}`;
process.chdir('/Users/brianhill/Desktop/ClaudeCode/seo-dashboard');
require('/Users/brianhill/Desktop/ClaudeCode/seo-dashboard/node_modules/next/dist/bin/next');
