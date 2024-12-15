const { sendMessage } = require('./whatsappApi');

class SprintSession {
  constructor(duration, groupId, starterId) {
    this.duration = duration;
    this.groupId = groupId;
    this.starterId = starterId;
    this.participants = new Map([[starterId, { wordCount: 0 }]]);
    this.startTime = Date.now();
    this.endTime = Date.now() + (duration * 60 * 1000);
    this.isActive = true;
  }
}

async function handleMessage(message, activeSprintSessions) {
  const groupId = message.chat.id;
  const senderId = message.from;
  const messageBody = message.text.body.toLowerCase();

  if (!messageBody.startsWith('/')) return;

  const [command, ...args] = messageBody.split(' ');

  switch (command) {
    case '/sprint':
      await handleSprintCommand(groupId, senderId, args, activeSprintSessions);
      break;
    case '/join':
      await handleJoinCommand(groupId, senderId, activeSprintSessions);
      break;
    case '/words':
      await handleWordsCommand(groupId, senderId, args, activeSprintSessions);
      break;
    case '/end':
      await handleEndCommand(groupId, senderId, activeSprintSessions);
      break;
    case '/leave':
      await handleLeaveCommand(groupId, senderId, activeSprintSessions);
      break;
    default:
      await sendMessage(groupId, 'Unknown command. Available commands: /sprint, /join, /words, /end, /leave');
  }
}

async function handleSprintCommand(groupId, senderId, args, activeSprintSessions) {
  if (activeSprintSessions.has(groupId)) {
    await sendMessage(groupId, '❌ A sprint session is already active in this group!');
    return;
  }

  const validDurations = [30, 60, 90, 120];
  const duration = parseInt(args[0]) || 30;

  if (!validDurations.includes(duration)) {
    await sendMessage(groupId, '❌ Invalid duration. Please choose 30, 60, 90, or 120 minutes.');
    return;
  }

  const session = new SprintSession(duration, groupId, senderId);
  activeSprintSessions.set(groupId, session);

  await sendMessage(groupId, 
    `🚀 Sprint session started!\n` +
    `⏱️ Duration: ${duration} minutes\n` +
    `👤 Started by: <@${senderId}>\n` +
    `Join using /join command\n\n` +
    `Sprint ends at: ${new Date(session.endTime).toLocaleTimeString()}`
  );

  // Set timeout to end sprint
  setTimeout(async () => {
    if (activeSprintSessions.has(groupId) && activeSprintSessions.get(groupId).isActive) {
      await handleEndCommand(groupId, 'SYSTEM', activeSprintSessions);
    }
  }, duration * 60 * 1000);
}

async function handleJoinCommand(groupId, senderId, activeSprintSessions) {
  const session = activeSprintSessions.get(groupId);
  
  if (!session) {
    await sendMessage(groupId, '❌ No active sprint session in this group. Start one with /sprint');
    return;
  }

  if (session.participants.has(senderId)) {
    await sendMessage(groupId, '❌ You are already in this sprint session!');
    return;
  }

  session.participants.set(senderId, { wordCount: 0 });
  await sendMessage(groupId, `✅ <@${senderId}> joined the sprint session!`);
}

async function handleWordsCommand(groupId, senderId, args, activeSprintSessions) {
  const session = activeSprintSessions.get(groupId);
  
  if (!session) {
    await sendMessage(groupId, '❌ No active sprint session in this group.');
    return;
  }

  if (!session.participants.has(senderId)) {
    await sendMessage(groupId, '❌ You are not part of this sprint session. Use /join to join.');
    return;
  }

  const wordCount = parseInt(args[0]);
  if (isNaN(wordCount) || wordCount < 0) {
    await sendMessage(groupId, '❌ Please provide a valid word count (positive number).');
    return;
  }

  session.participants.get(senderId).wordCount = wordCount;
  await sendMessage(groupId, `✅ Word count updated for <@${senderId}>: ${wordCount} words`);
}

async function handleEndCommand(groupId, senderId, activeSprintSessions) {
  const session = activeSprintSessions.get(groupId);
  
  if (!session) {
    await sendMessage(groupId, '❌ No active sprint session in this group.');
    return;
  }

  if (senderId !== 'SYSTEM' && senderId !== session.starterId) {
    await sendMessage(groupId, '❌ Only the person who started the sprint can end it.');
    return;
  }

  session.isActive = false;
  const duration = Math.floor((Date.now() - session.startTime) / (60 * 1000));
  
  let summary = `📊 Sprint Summary (${duration} minutes):\n\n`;
  let totalWords = 0;

  for (const [participantId, data] of session.participants) {
    summary += `<@${participantId}>: ${data.wordCount} words\n`;
    totalWords += data.wordCount;
  }

  summary += `\nTotal words written: ${totalWords}`;
  await sendMessage(groupId, summary);
  
  activeSprintSessions.delete(groupId);
}

async function handleLeaveCommand(groupId, senderId, activeSprintSessions) {
  const session = activeSprintSessions.get(groupId);
  
  if (!session) {
    await sendMessage(groupId, '❌ No active sprint session in this group.');
    return;
  }

  if (!session.participants.has(senderId)) {
    await sendMessage(groupId, '❌ You are not part of this sprint session.');
    return;
  }

  session.participants.delete(senderId);
  await sendMessage(groupId, `👋 <@${senderId}> left the sprint session.`);

  if (senderId === session.starterId) {
    await handleEndCommand(groupId, senderId, activeSprintSessions);
  }
}

module.exports = {
  handleMessage
};