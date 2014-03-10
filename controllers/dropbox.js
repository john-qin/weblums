var secrets 	= require('../config/secrets.js'),
	dbox 		= require('dbox'),
	User 		= require('../models/User'),
	DropboxUser = require('../models/DropboxUser'),
	DropboxEntry= require('../models/DropboxEntry'),
	path 		= require('path'),
	fs 			= require('fs'),
	mkdirp		= require('mkdirp'),
	_ 			= require('underscore');

// create dbox app object
var GetApp = function(){
	return dbox.app({
		"app_key": secrets.dropbox.key,
		"app_secret": secrets.dropbox.secret,
		"root": secrets.dropbox.root 
	});

};


// create dbox client object
var GetClient = function (req){

	var app = GetApp();
	var access_token = null;

	if(req.session && req.session.dropboxAccessToken){
		access_token = req.session.dropboxAccessToken;
	}

	// if dropbox access token is not in the session, find it from the MongoDB
	if(access_token == null){

		console.log("req.user = " + req.user);
		//console.log(req);

		User.findById(req.user.id, function(err, user){

			var dbAccessToken = _.findWhere(user.tokens, { kind: "dropbox" });
			access_token = dbAccessToken.accessToken;
			req.session.dropboxAccessToken = access_token;

			return app.client(accessToken);
		});
	} else {
		return app.client(access_token);
	}
};


// update dropbox user
var UpdateDropboxUser = function(dropbox_uid, reply){

	DropboxUser.findOne({dropbox_uid: dropbox_uiddropbox_uid}, function(err, existingDBUser){

		if(existingDBUser){
	        
	        // if existingDBUser found, update the user info
			existingDBUser.has_more = reply.has_more;
			existingDBUser.cursor = reply.cursor;
			existingDBUser.reset = reply.reset;
			existingDBUser.save(function(err){
						// throw  error here
			});
		} else {

			// if existingDBUser not found, create a new one and save it to MongoDB
			var dbUser = new DropboxUser({
				dropbox_uid: dropbox_uid,
				has_more: reply.has_more,
				cursor: reply.cursor,
				reset: reply.reset
			});

			dbUser.save(function(err){
						// throw error here
			});
		}
	});
};


var UpdateEntry = function(existingEntry, filePath, entry){
	existingEntry.revision 		= entry.revision;
	existingEntry.rev 			= entry.rev;
	existingEntry.thumb_exists 	= entry.thumb_exists;
	existingEntry.bytes 		= entry.bytes;
	existingEntry.modified 		= entry.modified;

	existingEntry.path 			= entry.path;
	existingEntry.path 			= filePath;
	existingEntry.is_dir 		= entry.is_dir;
	existingEntry.icon 			= entry.icon;
	existingEntry.root 			= entry.root;
	existingEntry.size 			= entry.size;

	existingEntry.deleted 		= false;
	existingEntry.downloaded 	= false;
	existingEntry.thumbnail 	= "";

	existingEntry.save(function(err){
							// throw error here
	});
};

var SaveNewEntry = function(dropbox_uid, filePath, entry){
	var newEntry = new DropboxEntry({
		dropbox_uid: 	dropbox_uid,
		revision: 		entry.revision,
		rev: 			entry.rev,
		thumb_exists: 	entry.thumb_exists,
		bytes: 			entry.bytes,
		modified: 		entry.modified,

		path: 			entry.path,
		path1: 			filePath,
		is_dir: 		entry.is_dir,
		icon: 			entry.icon,
		root: 			entry.root,
		size: 			entry.size,

		deleted: 		false,
		downloaded: 	false,
		thumbnail: 		""
	});

	newEntry.save(function(err){
		// throw error here

	});
};

// get image
var GetImage = function(file, req){
	var client = GetClient(req);

	client.get(file, function(status, reply, metadata){
		fs.writeFile(file, reply, function(err){
			if(err){
				throw err;
			}
			console.log('It\'s saved');
		});
	});
};

// create folder from the filePath
var CreateFolder = function(filePath, req){

	// console.log("filePath:" + filePath);
	filePath = path.dirname(filePath);
	// console.log("filePath:" + filePath);

	mkdirp(filePath, function(err){
		if(err){
			console.log("error: " + err);
		} else {
			// download files
			GetImage(filePath, req);
		}

	})
};

// update dropbox entry
var UpdateDropboxPhoto = function(accessToken, entries, req){

	var dropbox_uid = accessToken.uid;

	// iterate entry list
	_.each(entries, function(item){

		var entry = item[1];
		var filePath = item[0];
		var extension = path.extname(filePath).toUpperCase();

		//console.log("extension: " + extension);

		if(entry != null){	

			// if entry exists, and its an image file	
			if(extension == ".JPG" || extension == ".JPEG"){

				DropboxEntry.findOne({$and: [ {'dropbox_uid': dropbox_uid}, {'path': entry.path}]}, function(err, existingEntry){

					if(existingEntry){

						// if existingEntry found, update it
						UpdateEntry(existingEntry, filePath, entry);

					} else {

						// if existingEntry not found, save it, and create folder
						SaveNewEntry(dropbox_uid, filePath, entry);
						CreateFolder(path.dirname(process.mainModule.filename) + secrets.dropbox.photoPath + entry.path, req);
					}
				});
			}
			
		} else {

			// if entry does not exist, means it got deleted, update the existingEtnry to delete.
			if(extension == ".JPG" || extension == ".JPEG"){
				//console.log("filePath: " + filePath);

				DropboxEntry.findOne({$and: [ {'dropbox_uid': dropbox_uid}, {'path1': filePath}]}, function(err, existingEntry){

					if(existingEntry){
						existingEntry.deleted = true;
						existingEntry.save(function(err){
							// throw err here
						});
					}
				});
			}
		}
	});
};

// get a list of "delta entries"
var GetDelta = function (req, res, client, accessToken){

	var dropbox_uid = accessToken.uid;

	DropboxUser.findOne({dropbox_uid: dropbox_uid}, function(err, existingDBUser){

		var options = {};

		if(existingDBUser){

			// if existingDBUser found, get the cursor
			options = { cursor: existingDBUser.cursor};
			//console.log("options: " + JSON.stringify(options));
		}

		// get delta entry list
		client.delta(options, function(status, reply){
			
			if(status == 200){
				UpdateDropboxUser(dropbox_uid, reply);
				UpdateDropboxPhoto(accessToken, reply.entries, req);
			}

			res.send({status: status, reply: reply});	
		});		
	});
};

// Get dropbox RequestToken
exports.auth = function(req, res){

	if (!req.user) return res.redirect('/login');

	var app = GetApp();

	app.requesttoken(function(status, request_token){
		
		if(status == 200){
			req.session.dropboxRequestToken = request_token;
			res.redirect(request_token.authorize_url + "&oauth_callback=" + secrets.dropbox.callbackUrl);
		}
	});

};

// get dropbox access token
exports.callback = function(req, res){

	if (!req.user) return res.redirect('/login');

	if(req.session.dropboxRequestToken != null){

		var app = GetApp();

		app.accesstoken(req.session.dropboxRequestToken, function(status, access_token){

			if(status == 200){
				req.session.dropboxAccessToken = access_token;
				res.send({status: status, access_token: access_token});
				User.findById(req.user.id, function(err, user) {
		        	
		        	user.tokens.push({ kind: 'dropbox', accessToken: access_token });
		         	user.save();

		         	/*
					{
					  "status": 200,
					  "access_token": {
					    "oauth_token_secret": "sd3bw2b440imws5",
					    "oauth_token": "sagkzhkqkdgt1kib",
					    "uid": "14793810"
					  }
					}
		         	*/
		         	GetDelta(req, res, client, access_token);

		        });
			} else {

				//res.send({status: status});
				//todo: redirect to error page
			}
		});
	}
};


// Get dropbox access token, then get user delta
exports.List = function(req, res){

	// check if user does not exist, redirect to login page
	if (!req.user) return res.redirect('/login');

	// get dropbox access token from the session
	var access_token = req.session.dropboxAccessToken == undefined ? null : req.session.dropboxAccessToken;

	// if dropbox access token is not in the session, find it from the MongoDB
	if(access_token == null){

		User.findById(req.user.id, function(err, user){

			var dbAccessToken = _.findWhere(user.tokens, { kind: "dropbox" });
			access_token = dbAccessToken.accessToken;
			req.session.dropboxAccessToken = access_token;

			var client 	= GetClient(access_token);
			GetDelta(req, res, client, access_token);
		});
	} else {
		var client 	= GetClient(access_token);
			GetDelta(req, res, client, access_token);
	}

};




// this is the end................................................


var GetShares = function(imagePath, client, req, res){

	client.shares(imagePath, {}, function(status, reply){
		res.send(reply);
	});

	/*
{
  "url": "https://db.tt/QdNant26",
  "expires": "Tue, 01 Jan 2030 00:00:00 +0000"
}
	*/

};


var GetMedia = function(imagePath, client, req, res){

	client.media(imagePath, {}, function(status, reply){
		res.send(reply);
	});

	/*
{
  "url": "https://dl.dropboxusercontent.com/1/view/8a84o62gwm8myys/four/hot_asian_220214_002.jpg",
  "expires": "Wed, 05 Mar 2014 06:17:45 +0000"
}
	*/

};

var GetThumbnails = function(imagePath, client, req, res){

	client.thumbnails(imagePath, {size: 'm'}, function(status, reply, metadata){
		//res.send(reply);

		require('fs').writeFile('koala_small.jpg', reply, function () {
    		console.log('Thumbnail saved!');
  		});
	});

	/*
{
  "url": "https://dl.dropboxusercontent.com/1/view/8a84o62gwm8myys/four/hot_asian_220214_002.jpg",
  "expires": "Wed, 05 Mar 2014 06:17:45 +0000"
}
	*/

};


var GetImage = function(imagePath, client, req, res){

	client.get(imagePath, {size: 'm'}, function(status, reply, metadata){
		//res.send(reply);

		require('fs').writeFile('koala.jpg', reply, function () {
    		console.log('Thumbnail saved!');
  		});
	});

	/*
{
  "url": "https://dl.dropboxusercontent.com/1/view/8a84o62gwm8myys/four/hot_asian_220214_002.jpg",
  "expires": "Wed, 05 Mar 2014 06:17:45 +0000"
}
	*/

};

var GetList = function(client, req, res){
	client.delta(function(status, reply){
		//console.log(reply)
		res.send(reply);
	});
};




exports.Test = function(req, res){


	//console.log("req.user: " + req.user);
	//console.log("req.user.id: " + req.user.id);

	if (!req.user) return res.redirect('/login');

	//console.log(req.session.dropboxAccessToken);

	var access_token = null;

	if(req.session.dropboxAccessToken){
		access_token = req.session.dropboxAccessToken;
	}

	// if dropbox access token is not in the session, find it from the MongoDB
	if(access_token == null){

		User.findById(req.user.id, function(err, user){

			var dbAccessToken = _.findWhere(user.tokens, { kind: "dropbox" });
			access_token = dbAccessToken.accessToken;
			req.session.dropboxAccessToken = access_token;

			var client 	= GetClient(req);
			//GetDelta(req, res, client, access_token);
			console.log("client: " + client);

			//GetThumbnails("/four/hot_asian_220214_002.jpg", client, req, res);
			GetList(client, req, res);
		});
	} else {
		var client 	= GetClient(req);
		//GetDelta(req, res, client, access_token);
		//GetImage("/four/hot_asian_220214_002.jpg", client, req, res);
		GetList(client, req, res);
	}
};