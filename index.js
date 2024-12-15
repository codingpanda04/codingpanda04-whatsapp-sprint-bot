const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const verifyWebhook = require('./middleware/webhookVerification');
const {
  handleSprintCommand,
  handleJoinCommand,
  handleWordsCommand,
  handleEndCommand,
  handleLeaveCommand
} = require('./handlers/commandHandlers');

// Load environment variables
dotenv.config();

const app = express();

// Parse JSON bodies
app.use(bodyParser.json());

// Basic health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('WhatsApp Sprint Bot is running!');
});

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  console.log('Received webhook verification request');
  console.log('Query parameters:', req.query);
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Mode:', mode);
  console.log('Token:', token);
  console.log('Challenge:', challenge);
  console.log('Expected token:', process.env.VERIFY_TOKEN);

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    console.log('Missing mode or token');
    res.sendStatus(403);
  }
});

// Webhook message handling endpoint
app.post('/webhook', async (req, res) => {
  console.log('Received webhook POST request');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;

    if (body.object && 
        body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = body.entry[0].changes[0].value.messages[0];
      const groupId = message.chat.id;
      const senderId = message.from;
      const messageBody = message.text.body.toLowerCase();

      console.log('Processing message:', {
        groupId,
        senderId,
        messageBody
      });

      if (!messageBody.startsWith('/')) {
        return res.sendStatus(200);
      }

      const [command, ...args] = messageBody.split(' ');

      switch (command) {
        case '/sprint':
          await handleSprintCommand(groupId, senderId, args);
          break;
        case '/join':
          await handleJoinCommand(groupId, senderId);
          break;
        case '/words':
          await handleWordsCommand(groupId, senderId, args);
          break;
        case '/end':
          await handleEndCommand(groupId, senderId);
          break;
        case '/leave':
          await handleLeaveCommand(groupId, senderId);
          break;
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`WhatsApp Sprint Bot is listening on port ${port}`);
  console.log('Environment variables loaded:');
  console.log('- VERIFY_TOKEN:', process.env.VERIFY_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('- PHONE_NUMBER_ID:', process.env.PHONE_NUMBER_ID ? '✓ Set' : '✗ Missing');
  console.log('- WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('- UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✓ Set' : '✗ Missing');
  console.log('- UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✓ Set' : '✗ Missing');
});
