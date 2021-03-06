/* eslint-disable no-unused-vars, no-undef */

/**
 * start the download of a subreddit
 * @param subredditName {String} - the name of the subreddit to download
 * @returns {Promise<any>}
 */
async function startSubredditDownload(subredditName) {
    let data = await postLocData({
        subreddit: subredditName
    });
    return JSON.parse(data.data);
}

/**
 * Get the status of a download
 * @param downloadId {String} - the id of the download to get the status for
 * @returns {Promise<any>}
 */
async function getDownloadStatus(downloadId) {
    let data = await postLocData({
        id: downloadId
    });
    return JSON.parse(data.data);
}

/**
 * refreshes information about a specific download
 * @param downloadId {String} - the id of the download
 * @returns {Promise<void>}
 */
async function refreshDownloadInfo(downloadId) {
    let response = await getDownloadStatus(downloadId);

    let dlDiv = document.querySelector(`.download-container[dl-id='${downloadId}']`);
    dlDiv.querySelector('.downloadStatus').innerText = response.status;
    let subredditName = dlDiv.getAttribute('subreddit-name');

    if (response.status === 'pending') {
        setTimeout(() => refreshDownloadInfo(downloadId), 1000);
    } else {
        let dlLink = document.createElement('a');
        dlLink.setAttribute('href', response.file);
        dlLink.setAttribute('download', `${subredditName}`);
        dlLink.innerHTML = dlDiv.innerHTML;
        dlDiv.innerHTML = '';
        dlDiv.appendChild(dlLink);
        setTimeout(() => {
            dlDiv.remove();
        }, 300000);
    }
}

/**
 * Submit a subreddit to download (called by button)
 * @returns {Promise<void>}
 */
async function submitDownload() {
    let subredditName = document.querySelector('#subreddit-input').value;
    let response = await startSubredditDownload(subredditName);

    let dlDiv = document.createElement('div');
    dlDiv.setAttribute('class', 'download-container');
    dlDiv.setAttribute('dl-id', response.id);
    dlDiv.setAttribute('subreddit-name', subredditName);
    document.querySelector('#download-list').prepend(dlDiv);

    let subnameSpan = document.createElement('span');
    subnameSpan.innerText = 'r/'+subredditName;
    subnameSpan.setAttribute('class', 'subredditName tableRow');
    dlDiv.appendChild(subnameSpan);

    let dlStatusSpan = document.createElement('span');
    dlStatusSpan.innerText = response.status;
    dlStatusSpan.setAttribute('class', 'downloadStatus tableRow');
    dlDiv.appendChild(dlStatusSpan);

    await refreshDownloadInfo(response.id);
}
