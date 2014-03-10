/**
 * GET /connect
 * Connect page.
 */

exports.index = function(req, res) {

  if (!req.user) return res.redirect('/login');

  res.render('connect/index', {
    title: 'Connect'
  });
  
};

