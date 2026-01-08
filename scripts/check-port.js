#!/usr/bin/env node

/**
 * Helper script to check if a port is in use and optionally kill the process
 * Usage: node scripts/check-port.js [port] [--kill]
 */

const port = process.argv[2] || 3000;
const shouldKill = process.argv.includes('--kill');

const { exec } = require('child_process');

// Check for process on port (works on macOS/Linux)
exec(`lsof -ti:${port}`, (error, stdout, stderr) => {
  if (error) {
    console.log(`✅ Port ${port} is available`);
    process.exit(0);
  }

  const pid = stdout.trim();
  if (pid) {
    console.log(`⚠️  Port ${port} is in use by process ${pid}`);
    
    if (shouldKill) {
      console.log(`🔪 Killing process ${pid}...`);
      exec(`kill -9 ${pid}`, (killError) => {
        if (killError) {
          console.error(`❌ Failed to kill process: ${killError.message}`);
          process.exit(1);
        } else {
          console.log(`✅ Process ${pid} killed. Port ${port} is now available.`);
          process.exit(0);
        }
      });
    } else {
      console.log(`💡 To kill this process, run: node scripts/check-port.js ${port} --kill`);
      console.log(`   Or manually: kill -9 ${pid}`);
      process.exit(1);
    }
  }
});

