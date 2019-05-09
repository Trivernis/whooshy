function postLocData(postBody) {
    let request = new XMLHttpRequest();
    return new Promise((res, rej) => {

        request.onload = () => {
            res({
                status: request.status,
                data: request.responseText
            });
        };

        request.onerror = () => {
            rej(request.error);
        };

        request.open('POST', '#', true);
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify(postBody));
    });
}

async function startSubredditDownload(subredditName) {
    let data = await postLocData({
        subreddit: subredditName
    });
    return JSON.parse(data.data);
}

async function getDownloadStatus(downloadId) {
    let data = await postLocData({
        id: downloadId
    });
    return JSON.parse(data.data);
}

async function refreshDownloadInfo(downloadId) {
    let response = await getDownloadStatus(downloadId);

    let dlDiv = document.querySelector(`.download-container[dl-id='${downloadId}']`);
    dlDiv.querySelector('.downloadStatus').innerText = response.status;
    let subredditName = dlDiv.getAttribute('subreddit-name');

    if (response.status === 'pending') {
        setTimeout(() => refreshDownloadInfo(downloadId), 1000)
    } else {
        let dlLink = document.createElement('a');
        dlLink.setAttribute('href', response.file);
        dlLink.setAttribute('filename', `${subredditName}`);
        for (let cNode of dlDiv.childNodes)
            dlLink.appendChild(cNode);
        dlDiv.appendChild(dlLink);
        setTimeout(() => {
            dlDiv.remove();
        }, 30000);
    }
}

async function submitDownload() {
    let subredditName = document.querySelector('#subreddit-input').value;
    let response = await startSubredditDownload(subredditName);

    let dlDiv = document.createElement('div');
    dlDiv.setAttribute('class', 'download-container');
    dlDiv.setAttribute('dl-id', response.id);
    dlDiv.setAttribute('subreddit-name', subredditName);
    document.querySelector('#download-list').prepend(dlDiv);

    let subnameSpan = document.createElement('span');
    subnameSpan.innerText = subredditName;
    subnameSpan.setAttribute('class', 'subredditName');
    dlDiv.appendChild(subnameSpan);

    let dlStatusSpan = document.createElement('span');
    dlStatusSpan.innerText = response.status;
    dlStatusSpan.setAttribute('class', 'downloadStatus');
    dlDiv.appendChild(dlStatusSpan);

    await refreshDownloadInfo(response.id);
}
