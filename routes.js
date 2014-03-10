
module.exports = function(app, passportConf, passport){

	var homeController    = require('./controllers/home');
	var userController    = require('./controllers/user');
	var contactController = require('./controllers/contact');
	var forgotController  = require('./controllers/forgot');
	var resetController   = require('./controllers/reset');
	var connectController = require('./controllers/connect');
	var dropboxController = require('./controllers/dropbox');


	app.get('/', homeController.index);
	app.get('/login', userController.getLogin);
	app.post('/login', userController.postLogin);
	app.get('/logout', userController.logout);
	app.get('/forgot', forgotController.getForgot);
	app.post('/forgot', forgotController.postForgot);
	app.get('/reset/:token', resetController.getReset);
	app.post('/reset/:token', resetController.postReset);
	app.get('/signup', userController.getSignup);
	app.post('/signup', userController.postSignup);
	app.get('/contact', contactController.getContact);
	app.post('/contact', contactController.postContact);
	app.get('/account', passportConf.isAuthenticated, userController.getAccount);
	app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
	app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
	app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
	app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);


	app.get('/connect', connectController.index);
	//app.get('/connect/dropbox', dropboxController.);

	app.get('/dropbox/list', dropboxController.List);
	app.get('/test', dropboxController.Test);



	/**
	 * OAuth routes for sign-in.
	 */

	app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
	app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
	app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
	app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));

	app.get('/auth/dropbox', dropboxController.auth);
	app.get('/auth/dropbox/callback', dropboxController.callback)

};