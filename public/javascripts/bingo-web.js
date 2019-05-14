/* eslint-disable no-unused-vars, no-undef */
/**
 * Returns the value of the url-param 'game'
 * @returns {string}
 */
function getGameParam() {
    let matches = window.location.href.match(/\?game=(\w+)/);
    if (matches) {
        return matches[1];
    } else {
        return '';
    }
}

/**
 * Submits the value of the username-input to set the username.
 * @returns {Promise<Boolean>}
 */
async function submitUsername() {
    let unameInput = document.querySelector('#input-username');
    let username = unameInput.value.replace(/^\s+|\s+$/g, '');

    if (username.length > 1) {
        let response = await postGraphqlQuery(`
        mutation($username:String!) {
          bingo {
            setUsername(username: $username) {
              id
              username
            }
          }
        }`, {username: username});
        if (response.status === 200) {
            return true;
        } else {
            showError(`Failed to submit username. HTTP Error: ${response.status}`);
            console.error(response);
            return false;
        }
    } else {
        showError('You need to provide a username (minimum 2 characters)!');
        return false;
    }
}

/**
 * Displays the winner of the game in a popup.
 * @param name {String} - the name of the winner
 */
function displayWinner(name) {
    let winnerDiv = document.createElement('div');
    let greyoverDiv = document.createElement('div');
    winnerDiv.setAttribute('class', 'popup');
    winnerDiv.innerHTML = `
        <h1>${name} has won!</h1>
        <button id="btn-again" onclick="createFollowup()">Again!</button>
        <button id="btn-leave" onclick="window.location.reload()">Leave</button>
    `;
    greyoverDiv.setAttribute('class', 'greyover');
    //winnerDiv.onclick = () => {
    //    window.location.reload();
    //};
    document.body.append(greyoverDiv);
    document.body.appendChild(winnerDiv);
}

/**
 * Shows an error Message.
 * @param errorMessage
 */
function showError(errorMessage) {
    let errorDiv = document.createElement('div');
    errorDiv.setAttribute('class', 'errorDiv');
    errorDiv.innerHTML = `<span>${errorMessage}</span>`;
    let contCont = document.querySelector('#content-container');
    if (contCont) {
        contCont.appendChild(errorDiv);
    } else {
        alert(errorMessage);
    }
    setTimeout(() => {
        errorDiv.remove();
    }, 10000);
}

/**
 * Adds a message to the chat
 * @param messageObject {Object} - the message object returned by graphql
 */
function addChatMessage(messageObject) {
    let msgSpan = document.createElement('span');
    msgSpan.setAttribute('class', 'chatMessage');
    msgSpan.setAttribute('msg-id', messageObject.id);
    if (messageObject.type === "USER") {
        msgSpan.innerHTML = `
        <span class="chatUsername">${messageObject.username}:</span>
        <span class="chatMessageContent">${messageObject.htmlContent}</span>`;
    } else {
        msgSpan.innerHTML = `
        <span class="chatMessageContent ${messageObject.type}">${messageObject.htmlContent}</span>`;
    }

    let chatContent = document.querySelector('#chat-content');
    chatContent.appendChild(msgSpan);
    chatContent.scrollTop = chatContent.scrollHeight;       // auto-scroll to bottom
}


window.addEventListener("unhandledrejection", function (promiseRejectionEvent) {
    promiseRejectionEvent.promise.catch(err => console.log(err));
    showError('Connection problems... Is the server down?');
});

window.onload = () => {
};
