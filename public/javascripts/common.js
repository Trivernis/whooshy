function postData(url, postBody) {
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

        request.open('POST', url, true);
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify(postBody));
    });
}

async function postLocData(postBody) {
    return await postData('#', postBody);
}

async function postGraphqlQuery(query, variables, url) {
    let body = {
        query: query,
        variables: variables
    };
    let response = await postData(url || '/graphql', body);
    let resData = JSON.parse(response.data);

    if (response.status === 200) {
        return {
            status: response.status,
            data: resData.data,
        };
    } else {
        return {
            status: response.status,
            data: resData.data,
            errors: resData.errors,
            requestBody: body
        };
    }
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
