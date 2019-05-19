const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('There are no users :(');
});

module.exports = router;
