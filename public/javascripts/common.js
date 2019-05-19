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
        let start = new Date().getTime();
        request.onload = () => {
            resolve({
                status: request.status,
                data: request.responseText,
                ping: (new Date().getTime() - start)
            });
        };

        request.onerror = () => {
            reject(request.error);
        };

        request.open('POST', url, true);
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        try {
            request.send(JSON.stringify(postBody));
        } catch (err) {
            return err;
        }
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

/**
 * Executes the provided function if the key-event is an ENTER-key
 * @param event {Event} - the generated key event
 * @param func {function} - the function to execute on enter
 */
function submitOnEnter(event, func) {
    if (event.which === 13)
        func();
}

/**
 * Wrapper around a function to use the status indicator
 * @param func {function} - the function to execute
 * @param indicatorSelector {String} - a selector for the status indicator
 * @returns {Promise<void>}
 */
async function indicateStatus(func, indicatorSelector) {
    let statusIndicator = document.querySelector(indicatorSelector);
    statusIndicator.setAttribute('status', 'pending');
    try {
        let result = await func();
        if (result)
            statusIndicator.setAttribute('status', 'success');
        else
            statusIndicator.setAttribute('status', 'error');
    } catch (err) {
        console.error(err);
        statusIndicator.setAttribute('status', 'error');
    }
}

/**
 * posts to accept cookies.
 * @returns {Promise<void>}
 */
async function acceptCookies() {
    await postGraphqlQuery(`
    mutation {
        acceptCookies
    }`);
    document.querySelector('#cookie-container').remove();
}

/**
 * Gets the names for the windows hidden and visibility change events and properties
 * @returns {{hidden: string, visibilityChange: string}}
 */
function getHiddenNames() {
    let hidden, visibilityChange;
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }
    return {
        hidden: hidden,
        visibilityChange: visibilityChange
    };
}
