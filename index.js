const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

// ─── Config ───
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Xerxo backend webhook URL
const PORT = process.env.PORT || 3001;

if (!BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}
if (!WEBHOOK_URL) {
  console.error('ERROR: WEBHOOK_URL environment variable is required');
  process.exit(1);
}

console.log(`Discord Bridge starting...`);
console.log(`Webhook URL: ${WEBHOOK_URL}`);

// ─── Discord Client ───
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Track messages sent by us to avoid infinite loops
const sentMessages = new Set();

client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag} (ID: ${client.user.id})`);
  console.log(`Guilds: ${client.guilds.cache.size}`);
  console.log(`Forwarding messages to: ${WEBHOOK_URL}`);
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages (including our own)
  if (message.author.bot) return;
  
  // Ignore messages we recently sent
  if (sentMessages.has(message.id)) return;

  // Only process messages that mention the bot or are in DMs
  const isMentioned = message.mentions.has(client.user);
  const isDM = !message.guild;
  
  // Process if: DM, or bot is mentioned, or message starts with !xerxo
  const content = message.content.trim();
  const isCommand = content.toLowerCase().startsWith('!xerxo') || content.toLowerCase().startsWith('/xerxo');
  
  if (!isDM && !isMentioned && !isCommand) return;

  // Clean the message content (remove bot mention)
  let cleanContent = content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .replace(/^[!/]xerxo\s*/i, '')
    .trim();

  if (!cleanContent) {
    cleanContent = 'Hello';
  }

  console.log(`Message from ${message.author.tag} in ${isDM ? 'DM' : message.guild.name}#${message.channel.name || 'dm'}: ${cleanContent.slice(0, 100)}`);

  // Forward to Xerxo webhook
  try {
    const payload = {
      content: cleanContent,
      author: {
        id: message.author.id,
        username: message.author.tag,
        bot: false,
      },
      discord_channel_id: message.channel.id,
      guild_id: message.guild?.id || null,
      message_id: message.id,
      is_dm: isDM,
    };

    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    console.log(`Webhook response: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error(`Webhook forward error: ${err.message}`);
  }
});

// ─── Health check server ───
const app = express();

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: client.user?.tag || 'connecting...',
    guilds: client.guilds?.cache?.size || 0,
    uptime: process.uptime(),
    webhook_url: WEBHOOK_URL,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: client.isReady() ? 'connected' : 'disconnected' });
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`Health check server on port ${PORT}`);
});

client.login(BOT_TOKEN).catch((err) => {
  console.error(`Discord login failed: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

