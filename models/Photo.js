var mongoose = require('mongoose'),
    _  = require('underscore');

var photoSchema = new mongoose.Schema({
    userId:         ObjectId,
    type:           String, //dropbox, instagram, facebook
    createdOn:      {type: Date, default: Date.now},
    isDeleted:      {type: Boolean, default: false},
    isDownloaded:   {type: Boolean, default: false},

    dropbox: {
        path: String,
        info: {
            revision:       Number,
            rev:            String,
            thumb_exists:   Boolean,
            bytes:          Number,
            modified:       Date,
            client_mtime:   Date,
            path:           { type: String, unique: true},
            is_dir:         Boolean,
            icon:           String,
            root:           String,
            mime_type:      String,
            size:           String,
        }
    }
});


photoSchema.pre('save', function(next) {

    var photo = this;

    if(photo.type == 'dropbox' && _.isEmpty(photo.dropbox)){
        photo.isDeleted = true;
        next();
    }

    next();
});

module.exports = mongoose.model('Photo', photoSchema);