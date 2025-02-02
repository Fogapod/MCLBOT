const winston = require('winston');

module.exports = {
  debounce: true,
  fn: async (main, oldUser, newUser) => {
    if (oldUser.tag === newUser.tag) {
      return false;
    }

    return {
      key: newUser.id,
      payload: {
        userID: newUser.id,
        oldTag: oldUser.tag,
        newTag: newUser.tag,
      },
    };
  },

  debouncedFn: async (main, eventPayload) => {
    const oldTag = eventPayload.oldTag.split('#');
    const newTag = eventPayload.newTag.split('#');

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
    if (oldTag[0] !== newTag[0] && oldTag[1] !== newTag[1]) { // username & discrim changed => tag change
      winston.debug(`User ${eventPayload.oldTag} changed tag to ${eventPayload.newTag}`);

      await main.db.name_logs.create({
        user_id: eventPayload.userID,
        type: 'TAG', // tag change
        before: eventPayload.oldTag,
        after: eventPayload.newTag,
        timestamp: Date.now(),
      });
    } else if (oldTag[0] === newTag[0]) { // username did not change => discrim change
      winston.debug(`User ${eventPayload.oldTag} changed just the discriminator to ${eventPayload.newTag}`);

      await main.db.name_logs.create({
        user_id: eventPayload.userID,
        type: 'DISCRIMINATOR', // discriminator change
        before: oldTag[1],
        after: newTag[1],
        timestamp: Date.now(),
      });
    } else { // leftover is username change
      winston.debug(`User ${eventPayload.oldTag} changed just the username to ${eventPayload.newTag}`);

      await main.db.name_logs.create({
        user_id: eventPayload.userID,
        type: 'USERNAME', // username change
        before: oldTag[0],
        after: newTag[0],
        timestamp: Date.now(),
      });
    }

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const isMuted = await main.db.muted_members.findOne({
      where: {
        target_id: eventPayload.userID,
      },
    });

    if (!isMuted) {
      return;
    }

    winston.debug(`User ${eventPayload.newTag} has entries in the mute database, updating information...`);

    main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    main.db.muted_members.update({
      target_tag: eventPayload.newTag,
    }, {
      where: {
        target_id: eventPayload.userID,
      },
    });
  },
};
