const axios = require('axios');
require('dotenv').config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function sendMessage(groupId, message) {
  try {
    await axios.post(`${WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: groupId,
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

module.exports = {
  sendMessage
};