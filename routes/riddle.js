const express = require('express'),
    router = express.Router(),
    cproc = require('child_process'),
    fsx = require('fs-extra');

const rWordOnly = /^\w+$/;

let downloads = {};

class RedditDownload {
    constructor(file) {
        this.file = file;
        this.status = 'pending';
        this.progress = 'N/A';
        this.process = null;
    }
}

/**
 * Generates an id for a subreddit download.
 * @param subreddit
 * @returns {string}
 */
function generateDownloadId(subreddit) {
    return Date.now().toString(16);
}

/**
 * Starts the subreddit download by executing the riddle python file.
 * @param subreddit {String}
 * @returns {string}
 */
function startDownload(subreddit) {
    if (rWordOnly.test(subreddit)) {
        let downloadId = generateDownloadId(subreddit);
        let dlFilePath = `./public/static/${downloadId}.zip`;
        let dlWebPath = `/static/${downloadId}.zip`;
        let dl = new RedditDownload(dlWebPath);

        dl.process = cproc.exec(`python -u riddle.py -o ../../public/static/${downloadId} -z --lzma ${subreddit}`,
            {cwd: './scripts/reddit-riddle', env: {PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: true}},
            (err, stdout) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`riddle.py: ${stdout}`);
                }
            });

        dl.process.on('exit', (code) => {
            if (code === 0)
                dl.status = 'finished';
            else
                dl.status = 'failed';
            setTimeout(async () => {
                await fsx.remove(dlFilePath);
                delete downloads[downloadId];
            }, 300000);     // delete the file after 5 minutes
        });

        dl.process.on('message', (msg) => {
            console.log(msg)
        });

        downloads[downloadId] = dl;

        return downloadId;
    }
}

router.use('/files', express.static('./tmp'));

router.get('/', (req, res, next) => {
    res.render('riddle');
});

router.post('/', (req, res) => {
    if (req.body.subreddit) {
        let id = startDownload(req.body.subreddit);
        let download = downloads[id];

        res.send({id: id, status: download.status, file: download.file});
    } else if (req.body.id) {
        let id = req.body.id;
        let download = downloads[id];

        if (download) {
            res.send({
                id: id,
                status: download.status,
                file: download.file
            });
        } else {
            res.send({error: 'Unknown download ID', id: id});
        }
    }
});

module.exports = router;
