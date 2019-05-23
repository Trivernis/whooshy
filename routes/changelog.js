const express = require('express'),
    router = express.Router(),
    globals = require('../lib/globals'),
    fsx = require('fs-extra'),
    mdEmoji = require('markdown-it-emoji'),
    md = require('markdown-it')()
    .use(mdEmoji);

/* GET home page. */
router.get('/', (req, res) => {
    let info = req.session.acceptedCookies? null: globals.cookieInfo;
    res.render('changelog/changes', { changelog: md.render(globals.changelog), info: info});
});

module.exports = router;
