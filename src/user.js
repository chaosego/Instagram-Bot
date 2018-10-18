var cnf = require('../config/config.json');
var mongoose = require('mongoose');
var Moment = require('moment');
var Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

// define the schema for our user model
var userSchema = mongoose.Schema({
    username: {type: String},
    hashtag: {type: String, default: null},
    follow: {
        following: {type: Boolean},
        followedAt: {type: Date},
        markedArchive: {type: Boolean, default: false},
        archivedAt: {type: Date},
        bot: {type: Boolean}
    },
    _account: {type: String, default: cnf.username},
    _created: {type: Date, default: Date.now}
});

userSchema.plugin(deepPopulate);
// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
