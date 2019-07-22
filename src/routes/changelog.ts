import {Router} from 'express';
import * as markdownIt from 'markdown-it';
// @ts-ignore
import * as mdEmoji from 'markdown-it-emoji';

import globals from '../lib/globals';

const router = Router();
const md = markdownIt(mdEmoji);

/* GET home page. */
router.get('/', (req, res) => {
    let info = req.session.acceptedCookies? null: globals.cookieInfo;
    res.render('changelog/changes', { changelog: md.render(globals.changelog), info: info});
});

export default router;
