const sprintService = require('../services/sprintService');
const { sendMessage } = require('../services/whatsappService');

async function handleSprintCommand(groupId, senderId, args) {
  const existingSession = await sprintService.getSession(groupId);
  if (existingSession?.isActive) {
    await sendMessage(groupId, '❌ A sprint session is already active in this group!');
    return;
  }

  const validDurations = [30, 60, 90, 120];
  const duration = parseInt(args[0]) || 30;

  if (!validDurations.includes(duration)) {
    await sendMessage(groupId, '❌ Invalid duration. Please choose 30, 60, 90, or 120 minutes.');
    return;
  }

  const session = await sprintService.createSession(duration, groupId, senderId);

  await sendMessage(groupId,
    `🚀 Sprint session started!\n` +
    `⏱️ Duration: ${duration} minutes\n` +
    `👤 Started by: <@${senderId}>\n` +
    `Join using /join command\n\n` +
    `Sprint ends at: ${new Date(session.endTime).toLocaleTimeString()}`
  );
}

async function handleJoinCommand(groupId, senderId) {
  const session = await sprintService.getSession(groupId);
  
  if (!session?.isActive) {
    await sendMessage(groupId, '❌ No active sprint session in this group. Start one with /sprint');
    return;
  }

  if (session.participants[senderId]) {
    await sendMessage(groupId, '❌ You are already in this sprint session!');
    return;
  }

  session.participants[senderId] = { wordCount: 0 };
  await sprintService.updateSession(groupId, session);
  await sendMessage(groupId, `✅ <@${senderId}> joined the sprint session!`);
}

async function handleWordsCommand(groupId, senderId, args) {
  const session = await sprintService.getSession(groupId);
  
  if (!session?.isActive) {
    await sendMessage(groupId, '❌ No active sprint session in this group.');
    return;
  }

  if (!session.participants[senderId]) {
    await sendMessage(groupId, '❌ You are not part of this sprint session. Use /join to join.');
    return;
  }

  const wordCount = parseInt(args[0]);
  if (isNaN(wordCount) || wordCount < 0) {
    await sendMessage(groupId, '❌ Please provide a valid word count (positive number).');
    return;
  }

  session.participants[senderId].wordCount = wordCount;
  await sprintService.updateSession(groupId, session);
  await sendMessage(groupId, `✅ Word count updated for <@${senderId}>: ${wordCount} words`);
}

async function handleEndCommand(groupId, senderId) {
  const session = await sprintService.getSession(groupId);
  
  if (!session?.isActive) {
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

  for (const [participantId, data] of Object.entries(session.participants)) {
    summary += `<@${participantId}>: ${data.wordCount} words\n`;
    totalWords += data.wordCount;
  }

  summary += `\nTotal words written: ${totalWords}`;
  await sendMessage(groupId, summary);
  
  await sprintService.deleteSession(groupId);
}

async function handleLeaveCommand(groupId, senderId) {
  const session = await sprintService.getSession(groupId);
  
  if (!session?.isActive) {
    await sendMessage(groupId, '❌ No active sprint session in this group.');
    return;
  }

  if (!session.participants[senderId]) {
    await sendMessage(groupId, '❌ You are not part of this sprint session.');
    return;
  }

  delete session.participants[senderId];
  await sprintService.updateSession(groupId, session);
  await sendMessage(groupId, `👋 <@${senderId}> left the sprint session.`);

  if (senderId === session.starterId) {
    await handleEndCommand(groupId, senderId);
  }
}

module.exports = {
  handleSprintCommand,
  handleJoinCommand,
  handleWordsCommand,
  handleEndCommand,
  handleLeaveCommand
};