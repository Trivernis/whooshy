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

function insertParam(key, value) {
    key = encodeURI(key);
    value = encodeURI(value);

    let kvp = document.location.search.substr(1).split('&');

    let i = kvp.length;
    let x;
    while (i--) {
        x = kvp[i].split('=');

        if (x[0] === key) {
            x[1] = value;
            kvp[i] = x.join('=');
            break;
        }
    }

    if (i < 0) {
        kvp[kvp.length] = [key, value].join('=');
    }

    document.location.search = kvp.join('&');
}