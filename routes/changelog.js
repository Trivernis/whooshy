const express = require('express'),
    router = express.Router(),
    globals = require('../lib/globals'),
    fsx = require('fs-extra'),
    mdEmoji = require('markdown-it-emoji'),
    md = require('markdown-it')()
    .use(mdEmoji);

let changelog = fsx.readFileSync('CHANGELOG.md', 'utf-8');

/* GET home page. */
router.get('/', (req, res) => {
    let info = req.session.acceptedCookies? null: globals.cookieInfo;
    res.render('changelog/changes', { changelog: md.render(changelog), info: info});
});

module.exports = router;
