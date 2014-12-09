var db = require('../models')

exports.create = function(message, callback) {
  var message = new db.Message()
  message.content = message.content
  message.creator = message.creator
  message.save(callback)
};
exports.read = function(callback) {
  db.Message.find({
  }, null, {
    sort: {
      'createAt': -1
    },
    limit: 20
  }, callback)
};
