
module.exports = {
  up(queryInterface, Sequelize) {
    return queryInterface.createTable('guild_prefix', {
      guild_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      prefix: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down(queryInterface, Sequelize) {
    return queryInterface.dropTable('guild_prefix');
  },
};
