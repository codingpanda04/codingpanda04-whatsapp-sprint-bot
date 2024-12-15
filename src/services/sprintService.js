const redis = require('../config/redis');

class SprintService {
  constructor() {
    this.SPRINT_KEY_PREFIX = 'sprint:';
    this.EXPIRY_TIME = 60 * 60 * 3; // 3 hours in seconds
  }

  async createSession(duration, groupId, starterId) {
    const session = {
      duration,
      groupId,
      starterId,
      participants: { [starterId]: { wordCount: 0 } },
      startTime: Date.now(),
      endTime: Date.now() + (duration * 60 * 1000),
      isActive: true
    };

    await redis.set(
      this.SPRINT_KEY_PREFIX + groupId,
      JSON.stringify(session),
      { ex: this.EXPIRY_TIME }
    );

    return session;
  }

  async getSession(groupId) {
    const session = await redis.get(this.SPRINT_KEY_PREFIX + groupId);
    return session ? JSON.parse(session) : null;
  }

  async updateSession(groupId, session) {
    await redis.set(
      this.SPRINT_KEY_PREFIX + groupId,
      JSON.stringify(session),
      { ex: this.EXPIRY_TIME }
    );
  }

  async deleteSession(groupId) {
    await redis.del(this.SPRINT_KEY_PREFIX + groupId);
  }
}

module.exports = new SprintService();