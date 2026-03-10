
console.log(`Attempting Discord login with token: ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}`);
console.log(`Token length: ${BOT_TOKEN.length}`);

// Catch any unhandled errors from the client
client.on('error', (err) => {
  console.error(`Discord client error: ${err.message}`);
});

client.on('warn', (msg) => {
  console.warn(`Discord warning: ${msg}`);
});

client.on('debug', (msg) => {
  // Only log important debug messages
  if (msg.includes('Heartbeat') || msg.includes('Session') || msg.includes('Gateway') || msg.includes('token') || msg.includes('Intent') || msg.includes('connect') || msg.includes('error') || msg.includes('close')) {
    console.log(`[DEBUG] ${msg}`);
  }
});

// Set a timeout — if login takes more than 30s, something is wrong
const loginTimeout = setTimeout(() => {
  console.error('ERROR: Discord login timed out after 30 seconds. Check:');
  console.error('  1. Is DISCORD_BOT_TOKEN valid? Try resetting it in Discord Developer Portal');
  console.error('  2. Are Privileged Gateway Intents enabled? (Message Content Intent)');
  console.error('  3. Is the bot application not deleted/disabled?');
}, 30000);

client.login(BOT_TOKEN)
  .then(() => {
    clearTimeout(loginTimeout);
    console.log('Discord login promise resolved successfully');
  })
  .catch((err) => {
    clearTimeout(loginTimeout);
    console.error(`Discord login failed: ${err.message}`);
    console.error(`Error code: ${err.code}`);
    console.error(`Full error:`, err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});
