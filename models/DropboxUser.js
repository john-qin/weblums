var mongoose = require('mongoose');

var dropboxUserSchema = new mongoose.Schema({
	//uid: { type: Number, unique: true },
	dropbox_uid: {type: Number, unique: true},
	has_more: String,
	cursor: String,
	reset: Boolean
});

module.exports = mongoose.model('DropboxUser', dropboxUserSchema);