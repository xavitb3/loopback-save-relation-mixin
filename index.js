const SaveRelation = require("./save-relation");

module.exports = app => {
  app.loopback.modelBuilder.mixins.define("SaveRelation", SaveRelation);
};
