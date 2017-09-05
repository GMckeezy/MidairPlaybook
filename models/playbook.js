var mongoose = require('mongoose');
var Promise = require('bluebird');
var Schema = mongoose.Schema;
mongoose.Promise = Promise;

var playBookSchema = new Schema({
    map: String,
    token: String,
    storedLines: Array
});

module.exports = mongoose.model('Playbook', playBookSchema );