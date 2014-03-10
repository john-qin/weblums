var mongoose = require('mongoose');

var dropboxEntrySchema = new mongoose.Schema({
    //uid: Number,
    dropbox_uid: Number,
	revision: Number,
    rev: String,
    thumb_exists: Boolean,
    bytes: Number,
    modified: Date,
    path: { type: String, unique: true},
    path1: {type: String, unique: true},
    is_dir: Boolean,
    icon: String,
    root: String,
    size: String,
    deleted: Boolean,
    downloaded: Boolean,
    thumbnail: String
});

module.exports = mongoose.model('DropboxEntry', dropboxEntrySchema);