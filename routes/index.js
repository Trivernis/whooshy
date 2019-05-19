const express = require('express');
const router = express.Router();
const globals = require('../lib/globals');


/* GET home page. */
router.get('/', function(req, res) {
  let info = req.session.acceptedCookies? null: globals.cookieInfo;
  res.render('index', { title: 'Trivernis.net', info: info});
});

module.exports = router;
