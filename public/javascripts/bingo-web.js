/**
 * Returns the value of the url-param 'game'
 * @returns {string}
 */
function getGameParam() {
    let matches = window.location.href.match(/\?game=(\w+)/);
    if (matches)
        return matches[1];
    else
        return '';
}

/**
 * Submits the bingo words to create a game
 * @returns {Promise<void>}
 */
async function submitBingoWords() {
    let textContent = document.querySelector('#bingo-textarea').value;
    let words = textContent.replace(/[<>]/g, '').split('\n').filter((el) => {
        return (!!el && el.length > 0) // remove empty strings and non-types from word array
    });
    if (words.length === 0) {
        showError('You need to provide at least one word!');
    } else {
        let size = document.querySelector('#bingo-grid-size').value;

        let response = await postGraphqlQuery(`
        mutation($words:[String!]!, $size:Int!) {
          bingo {
            createGame(input: {
              words: $words,
              size: $size
            }) {
              id
            }
          }
        }`, {
            words: words,
            size: Number(size)
        }, `/graphql?game=${getGameParam()}`);
        if (response.status === 200) {
            let gameid = response.data.bingo.createGame.id;
            insertParam('game', gameid);
        } else {
            showError(`Failed to create game. HTTP Error: ${response.status}`);
            console.error(response)
        }
    }
}

/**
 * Gets the followup bingoSession and redirects to it
 * @returns {Promise<void>}
 */
async function createFollowup() {
    let response = await postGraphqlQuery(`
    mutation {
      bingo {
        createFollowupGame {
          id
        }
      }
    }`,null,`/graphql?game=${getGameParam()}`);
    if (response.status === 200 && response.data.bingo.createFollowupGame) {
        let gameid = response.data.bingo.createFollowupGame.id;
        insertParam('game', gameid);
    } else {
        showError(`Failed to create follow up game. HTTP Error: ${response.status}`);
        console.error(response);
    }
}

/**
 * Submits the value of the username-input to set the username.
 * @returns {Promise<void>}
 */
async function submitUsername() {
    let unameInput = document.querySelector('#username-input');
    let username = unameInput.value.replace(/^\s+|\s+$/g, '');
    if (username.length > 1 && username !== 'anonymous') {
        let response = await postGraphqlQuery(`
    mutation($username:String!) {
      bingo {
        setUsername(input: {username: $username}) {
          id
          username
        }
      }
    }`, {
            username: username
        },`/graphql?game=${getGameParam()}`);
        if (response.status === 200) {
            unameInput.value = '';
            unameInput.placeholder = response.data.username;
            document.querySelector('#username-form').remove();
            document.querySelector('.greyover').remove();
        } else {
            showError(`Failed to submit username. HTTP Error: ${response.status}`);
            console.error(response);
        }
    } else {
        showError('You need to provide a username (minimum 2 characters)!');
    }
}

/**
 * toggles a word (toggle occures on response)
 * @param word {String} - the base64 encoded bingo word
 * @returns {Promise<void>}
 */
async function submitWord(word) {
    let response = await postGraphqlQuery(`
    mutation($word:String!) {
      bingo {
        toggleWord(input: {base64Word: $word}) {
          bingo
          fieldGrid {
            submitted
            base64Word
          }
        }
      }
    }`, {
        word: word
    },`/graphql?game=${getGameParam()}`);

    if (response.status === 200 && response.data.bingo.toggleWord) {
        let fieldGrid = response.data.bingo.toggleWord.fieldGrid;
        for (let row of fieldGrid) {
            for (let field of row) {
                document.querySelectorAll(`.bingo-word-panel[b-word="${field.base64Word}"]`).forEach(x => {
                    x.setAttribute('b-sub', field.submitted);
                });
            }
        }
        if (response.data.bingo.toggleWord.bingo) {
            document.querySelector('#bingo-button').setAttribute('class', '');
        } else {
            document.querySelector('#bingo-button').setAttribute('class', 'hidden');
        }
    } else {
        showError(`Failed to submit word. HTTP Error: ${response.status}`);
        console.error(response);
    }
}

/**
 * Submits a bingo (Bingo button is pressed).
 * The game is won if the backend validated it.
 * @returns {Promise<void>}
 */
async function submitBingo() {
    let response = await postGraphqlQuery(`
    mutation {
      bingo {
        submitBingo {
          id
          bingos
          players {
            id
            username
          }
        }
      }
    }`,null,`/graphql?game=${getGameParam()}`);
    if (response.status === 200 && response.data.bingo.submitBingo) {
        let bingoSession = response.data.bingo.submitBingo;
        if (bingoSession.bingos.length > 0) {
            displayWinner(bingoSession.players.find(x => x.id === bingoSession.bingos[0]).username);
            clearInterval(refrInterval)
        }
    } else {
        showError(`Failed to submit Bingo. HTTP Error: ${response.status}`);
        console.error(response);
    }
}

/**
 * Refreshes the information (by requesting information about the current game).
 * Is used to see if one player has scored a bingo and which players are in the game.
 * @returns {Promise<void>}
 */
async function refresh() {
    let response = await postGraphqlQuery(`
    query {
      bingo {
        gameInfo {
          id
          bingos
          players {
            username
            id
          }
          getMessages {
            id
            username
            type
            htmlContent
          }
        }
      }
    }`, null, `/graphql?game=${getGameParam()}`);
    if (response.status === 200 && response.data.bingo.gameInfo) {
        let bingoSession = response.data.bingo.gameInfo;

        if (bingoSession.bingos.length > 0) {
            displayWinner(bingoSession.players.find(x => x.id === bingoSession.bingos[0]).username);
            clearInterval(refrInterval)
        } else {
            for (let player of bingoSession.players) {
                let foundPlayerDiv = document.querySelector(`.player-container[b-pid='${player.id}'`);
                if (!foundPlayerDiv) {
                    let playerDiv = document.createElement('div');
                    playerDiv.setAttribute('class', 'player-container');
                    playerDiv.setAttribute('b-pid', player.id);
                    playerDiv.innerHTML = `<span class="player-name-span">${player.username}</span>`;
                    document.querySelector('#players-container').appendChild(playerDiv);
                } else {
                    let playerNameSpan = foundPlayerDiv.querySelector('.player-name-span');
                    if (playerNameSpan.innerText !== player.username) {
                        playerNameSpan.innerText = player.username;
                    }
                }
            }
        }
        for (let chatMessage of bingoSession.getMessages) {
            if (!document.querySelector(`.chatMessage[msg-id='${chatMessage.id}'`))
                addChatMessage(chatMessage);
        }
    } else  {
        if (response.status === 400)
            clearInterval(refrInterval);
        console.error(response);
        showError('No session found. Are cookies allowed?');
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
    if (contCont)
        contCont.appendChild(errorDiv);
    else
        alert(errorMessage);
    setTimeout(() => {
        errorDiv.remove();
    }, 10000);
}

async function sendChatMessage() {
    let messageInput = document.querySelector('#chat-input');
    if (messageInput.value && messageInput.value.length > 0) {
        let message = messageInput.value;
        let response = await postGraphqlQuery(`
        mutation($message: String!) {
          bingo {
            sendChatMessage(input: { message: $message }) {
              id
              htmlContent
              username
              type
            }
          }
        }`,{message: message}, `/graphql?game=${getGameParam()}`);
        if (response.status === 200) {
            addChatMessage(response.data.bingo.sendChatMessage);
            messageInput.value = '';
        } else {
            console.error(response);
            showError('Error when sending message.');
        }
    }
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
 * Toggles the displayChat class on the content container to switch between chat-view and grid view
 */
function toggleChatView() {
    let contentContainer = document.querySelector('#content-container');
    if (contentContainer.getAttribute('class') === 'displayChat')
        contentContainer.setAttribute('class', '');
    else
        contentContainer.setAttribute('class', 'displayChat')
}

window.addEventListener("unhandledrejection", function(promiseRejectionEvent) {
    promiseRejectionEvent.promise.catch(err => console.log(err));
    showError('Connection problems... Is the server down?');
});

window.onload = () => {
    if (document.querySelector('#chat-container'))
        refresh();
    if (window && !document.querySelector('#bingoform')) {
        refrInterval = setInterval(refresh, 1000);      // global variable to clear
    }
    let gridSizeElem = document.querySelector('#bingo-grid-size');
    document.querySelector('#bingo-grid-y').innerText = gridSizeElem.value;
    gridSizeElem.oninput = () => {
        document.querySelector('#bingo-grid-y').innerText = gridSizeElem.value;
        document.querySelector('#word-count').innerText = `Please provide at least ${gridSizeElem.value**2} phrases:`;
    };
};
