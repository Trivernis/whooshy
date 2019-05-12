/* eslint-disable no-unused-vars, no-undef */

/**
 * HTTP POST to an url with a post body
 * @param url {String} - the url to post to
 * @param postBody {JSON|Object} - the json-object to post
 * @returns {Promise<any>}
 */
function postData(url, postBody) {
    let request = new XMLHttpRequest();
    return new Promise((resolve, reject) => {

        request.onload = () => {
            resolve({
                status: request.status,
                data: request.responseText
            });
        };

        request.onerror = () => {
            reject(request.error);
        };

        request.open('POST', url, true);
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify(postBody));
    });
}

/**
 * HTTP POST to the current url
 * @param postBody {JSON|Object} - the json-object to post
 * @returns {Promise<any>}
 */
async function postLocData(postBody) {
    return await postData('#', postBody);
}

/**
 * HTTP POST to a graphql url endpoint (default '/graphql')
 * @param query {String} - the graphql query to post
 * @param [variables] {JSON} - optional variables used in the graphql query
 * @param [url] {String} - optional alternative graphql endpoint
 * @returns {Promise<{data: *, status: *}|{data: *, requestBody: {variables: *, query: *}, errors: *, status: *}>}
 */
async function postGraphqlQuery(query, variables, url) {
    let body = {
        query: query,
        variables: variables
    };
    let response = await postData(url || '/graphql', body);
    let resData = JSON.parse(response.data);

    if (response.status === 200)
        return {
            status: response.status,
            data: resData.data,
        };
    else
        return {
            status: response.status,
            data: resData.data,
            errors: resData.errors,
            requestBody: body
        };

}

/**
 * Inserts an url parameter
 * @param key {String} - the key of the url parameter
 * @param value {String} - the value of the url parameter
 */
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
    if (i < 0)
        kvp[kvp.length] = [key, value].join('=');
    document.location.search = kvp.join('&');
}
