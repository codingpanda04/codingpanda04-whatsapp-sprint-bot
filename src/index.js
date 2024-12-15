const express = require('express');
const bodyParser = require('body-parser');
const verifyWebhook = require('./middleware/webhookVerification');
const {
  handleSprintCommand,
  handleJoinCommand,
  handleWordsCommand,
  handleEndCommand,
  handleLeaveCommand
} = require('./handlers/commandHandlers');

const app = express();
app.use(bodyParser.json());

app.get('/webhook', verifyWebhook);

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object && 
        body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = body.entry[0].changes[0].value.messages[0];
      const groupId = message.chat.id;
      const senderId = message.from;
      const messageBody = message.text.body.toLowerCase();

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
});