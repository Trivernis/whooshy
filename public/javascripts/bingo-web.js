/* eslint-disable no-unused-vars, no-undef */
/**
 * Returns the value of the url-param 'g'
 * @returns {string}
 */
function getLobbyParam() {
    let matches = window.location.href.match(/\??&?g=(\d+)/);
    if (matches)
        return matches[1];
    else
        return '';

}

/**
 * REturns the value of the r url param
 * @returns {string}
 */
function getRoundParam() {
    let matches = window.location.href.match(/\??&?r=(\d+)/);
    if (matches)
        return matches[1];
    else
        return '';
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
 * Function that displays the ping in the console.
 * @returns {Promise<number>}
 */
async function ping() {
    let start = new Date().getTime();
    let response = await postGraphqlQuery(`
    query {
      time
    }`);
    console.log(`Ping: ${(new Date().getTime()) - start} ms`);
    return (new Date().getTime()) - start;
}

/**
 * TODO: real join logic
 */
async function joinLobby() {
    await submitUsername();
    window.location.reload();
}

/**
 * Creates a lobby and redirects to the lobby.
 * @returns {Promise<boolean>}
 */
async function createLobby() {
    let response = await postGraphqlQuery(`
    mutation {
      bingo {
        createLobby {
          id
        }
      }
    }
    `);
    if (response.status === 200 && response.data.bingo.createLobby) {
        insertParam('g', response.data.bingo.createLobby.id);
        return true;
    } else {
        showError('Failed to create Lobby. HTTP ERROR: ' + response.status);
        console.error(response);
        return false;
    }
}

/**
 * Lets the player leave the lobby
 * @returns {Promise<void>}
 */
async function leaveLobby() {
    let response = await postGraphqlQuery(`
    mutation($lobbyId:ID!){
      bingo {
        mutateLobby(id:$lobbyId) {
          leave
        }
      }
    }
    `, {lobbyId: getLobbyParam()});
    if (response.status === 200) {
        insertParam('g', '');
    } else {
        showError('Failed to leave lobby');
        console.error(response);
    }
}

/**
 * Kicks a player by id.
 * @param pid
 * @returns {Promise<void>}
 */
async function kickPlayer(pid) {
    let response = await postGraphqlQuery(`
    mutation ($lobbyId: ID!, $playerId:ID!) {
      bingo {
        mutateLobby(id: $lobbyId) {
          kickPlayer(pid: $playerId) {
            id
          }
        }
      }
    }
    `, {lobbyId: getLobbyParam(), playerId: pid});
    if (response.status === 200) {
        let kickId = response.data.bingo.mutateLobby.kickPlayer.id;
        document.querySelector(`.playerEntryContainer[b-pid='${kickId}'`).remove();
    } else {
        showError('Failed to kick player!');
        console.error(response);
    }
}

/**
 * Executes a command
 * @param message {String} - the message
 */
async function executeCommand(message) {
    function reply(content) {
        addChatMessage({content: content, htmlContent: content, type: 'INFO'});
    }
    let jsStyle = document.querySelector('#js-style');
    message = message.replace(/\s/g, '');
    switch(message) {
        case '/help':
            reply(`
            <b>Commands: </b><br>
            /help - shows this help <br>
            /hideinfo - hides all info messages <br>
            /showinfo - shows all info messages <br>
            /ping - shows the current ping <br>
            /abortround - aborts the current round <br>
            `);
            break;
        case '/hideinfo':
            jsStyle.innerHTML = '.chatMessage[msg-type="INFO"] {display: none}';
            break;
        case '/showinfo':
            jsStyle.innerHTML = '.chatMessage[msg-type="INFO"] {}';
            break;
        case '/ping':
            reply(`Ping: ${await ping()} ms`);
            break;
        case '/abortround':
            reply(await setRoundFinished());
            break;
        default:
            reply('Unknown command');
            break;
    }
    let chatContent = document.querySelector('#chat-content');
    chatContent.scrollTop = chatContent.scrollHeight;
}

/**
 * Sends a message to the chat
 * @returns {Promise<void>}
 */
async function sendChatMessage() {
    let messageInput = document.querySelector('#chat-input');
    if (messageInput.value && messageInput.value.length > 0) {
        let message = messageInput.value;
        messageInput.value = '';
        if (/^\/\.*/g.test(message)) {
            await executeCommand(message);
        } else {
            let response = await postGraphqlQuery(`
        mutation($lobbyId:ID!, $message:String!){
          bingo {
            mutateLobby(id:$lobbyId) {
              sendMessage(message:$message) {
                id
                htmlContent
                type
                author {
                  username
                }
              }
            }
          }
        }`, {message: message, lobbyId: getLobbyParam()});
            if (response.status === 200) {
                addChatMessage(response.data.bingo.mutateLobby.sendMessage);
            } else {
                messageInput.value = message;
                console.error(response);
                showError('Error when sending message.');
            }
        }
    }
}

/**
 * Sets the words for the lobby
 * @param words
 * @param gridSize
 * @returns {Promise<LobbyWrapper.words|*|properties.words|{default, type}|boolean>}
 */
async function setLobbySettings(words, gridSize) {
    gridSize = Number(gridSize);
    let response = await postGraphqlQuery(`
    mutation ($lobbyId: ID!, $words: [String!]!, $gridSize:Int!) {
      bingo {
        mutateLobby(id: $lobbyId) {
          setWords(words: $words) {
            words {
              content
            }
          }
          setGridSize(gridSize: $gridSize) {
            gridSize
          }
        }
      }
    }
    `, {lobbyId: getLobbyParam(), words: words, gridSize: gridSize});
    if (response.status === 200) {
        return response.data.bingo.mutateLobby.setWords.words;
    } else {
        console.error(response);
        showError('Error when setting lobby words.');
    }
}

/**
 * Starts a new round of bingo
 * @returns {Promise<boolean>}
 */
async function startRound() {
    let textinput = document.querySelector('#input-bingo-words');
    let words = getLobbyWords();
    let gridSize = document.querySelector('#input-grid-size').value || 3;
    let resultWords = await setLobbySettings(words, gridSize);
    textinput.value = resultWords.map(x => x.content).join('\n');
    let response = await postGraphqlQuery(`
    mutation($lobbyId:ID!){
      bingo {
        mutateLobby(id:$lobbyId) {
          startRound {
            id
          }
        }
      }
    }`, {lobbyId: getLobbyParam()});

    if (response.status === 200) {
        insertParam('r', response.data.bingo.mutateLobby.startRound.id);
    } else {
        console.error(response);
        showError('Error when starting round.');
    }
}

/**
 * Returns the words of the lobby word input.
 * @returns {string[]}
 */
function getLobbyWords() {
    let textinput = document.querySelector('#input-bingo-words');
    let words = textinput.value.replace(/[<>]/g, '').split('\n').filter((el) => {
        return (!!el && el.length > 0);     // remove empty strings and non-types from word array
    });
    return words;
}

/**
 * Submits the toggle of a bingo field
 * @param wordPanel
 * @returns {Promise<void>}
 */
async function submitFieldToggle(wordPanel) {
    let row = Number(wordPanel.getAttribute('b-row'));
    let column = Number(wordPanel.getAttribute('b-column'));
    let wordClass = wordPanel.getAttribute('class');
    wordPanel.setAttribute('class', wordClass + ' pending');
    let response = await postGraphqlQuery(`
    mutation($lobbyId:ID!, $row:Int!, $column:Int!){
      bingo {
        mutateLobby(id:$lobbyId) {
          toggleGridField(location:{row:$row, column:$column}) {
            submitted
            grid {
              bingo
            }
          }
        }
      }
    }`, {lobbyId: getLobbyParam(), row: row, column: column});
    wordPanel.setAttribute('class', wordClass);

    if (response.status === 200) {
        wordPanel.setAttribute('b-sub', response.data.bingo.mutateLobby.toggleGridField.submitted);
        if (response.data.bingo.mutateLobby.toggleGridField.grid.bingo)
            document.querySelector('#container-bingo-button').setAttribute('class', '');
        else
            document.querySelector('#container-bingo-button').setAttribute('class', 'hidden');
    } else {
        console.error(response);
        showError('Error when submitting field toggle');
    }
}

/**
 * Sets the round status to FINISHED
 * @returns {Promise<string>}
 */
async function setRoundFinished() {
    let response = await postGraphqlQuery(`
    mutation($lobbyId:ID!){
      bingo {
        mutateLobby(id:$lobbyId) {
          setRoundStatus(status:FINISHED) {
            status
          }
        }
      }
    }`, {lobbyId: getLobbyParam()});

    if (response.status === 200 && response.data.bingo.mutateLobby.setRoundStatus) {
        return 'Set round to finished';
    } else {
        console.error(response);
        showError('Failed to set round status');
    }
}

/**
 * Submits bingo
 * @returns {Promise<void>}
 */
async function submitBingo() {
    let response = await postGraphqlQuery(`
    mutation($lobbyId:ID!){
      bingo {
        mutateLobby(id:$lobbyId) {
          submitBingo {
            winner {
              id
              username
            }
            status
            start
            finish
          }
        }
      }
    }`, {lobbyId: getLobbyParam()});

    if (response.status === 200 && response.data.bingo.mutateLobby.submitBingo) {
        let round = response.data.bingo.mutateLobby.submitBingo;
        displayWinner(round);
    } else {
        console.error(response);
        showError('Failed to submit bingo');
    }
}

/**
 * Displays the winner of the game in a popup.
 * @param roundInfo {Object} - the round object as returned by graphql
 */
function displayWinner(roundInfo) {
    let name = roundInfo.winner.username;
    let winnerDiv = document.createElement('div');
    let greyoverDiv = document.createElement('div');
    winnerDiv.setAttribute('class', 'popup');
    winnerDiv.innerHTML = `
        <h1>${name} has won!</h1>
        <button id="button-lobbyreturn" onclick="window.location.reload()">Return to Lobby!</button>
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
    let errorContainer = document.querySelector('#error-message');
    let indicator = document.querySelector('#status-indicator');
    indicator.setAttribute('status', 'error');
    errorContainer.innerText = errorMessage;
    setTimeout(() => {
        errorContainer.innerText = '';
        indicator.setAttribute('status', 'idle');
    }, 5000);
}

/**
 * Wraps a function in a status report to display the status
 * @param func
 */
async function statusWrap(func) {
    let indicator = document.querySelector('#status-indicator');
    indicator.setAttribute('status', 'pending');
    try {
        await func();
        indicator.setAttribute('status', 'success');
        setTimeout(() => {
            indicator.setAttribute('status', 'idle');
        }, 1000);
    } catch (err) {
        showError(err? err.message : 'Unknown error');
    }
}

/**
 * Loads information about the rounds winner and the round stats.
 * @returns {Promise<void>}
 */
async function loadWinnerInfo() {
    let response = await postGraphqlQuery(`
    query($lobbyId:ID!) {
      bingo {
        lobby(id:$lobbyId) {
          currentRound {
            status
            winner {
              id
              username
            }
            start
            finish
          }
        }
      }
    }`, {lobbyId: getLobbyParam()});
    if (response.status === 200) {
        let roundInfo = response.data.bingo.lobby.currentRound;
        if (roundInfo.winner)
            displayWinner(roundInfo);
        else
            window.location.reload();
    } else {
        console.error(response);
        showError('Failed to get round information');
    }
}

/**
 * Adds a message to the chat
 * @param messageObject {Object} - the message object returned by graphql
 */
function addChatMessage(messageObject) {
    let msgSpan = document.createElement('span');
    msgSpan.setAttribute('class', 'chatMessage');
    msgSpan.setAttribute('msg-type', messageObject.type);
    msgSpan.setAttribute('msg-id', messageObject.id);
    if (messageObject.type === "USER") {
        msgSpan.innerHTML = `
        <span class="chatUsername">${messageObject.author.username}:</span>
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
 * Adds a player to the player view
 * @param player
 */
function addPlayer(player, options) {
    let playerContainer = document.createElement('div');
    playerContainer.setAttribute('class', 'playerEntryContainer');
    playerContainer.setAttribute('b-pid', player.id);

    if (options.isAdmin && player.id !== options.admin)
        playerContainer.innerHTML = `<button class="kickPlayerButton" onclick="kickPlayer(${player.id})">⨯</button>`;
    playerContainer.innerHTML += `<span class="playernameSpan">${player.username}</span>`;

    if (player.id === options.admin)
        playerContainer.innerHTML += "<span class='adminSpan'> 👑</span>";
    document.querySelector('#player-list').appendChild(playerContainer);
}

/**
 * Refreshes the bingo chat
 * @returns {Promise<void>}
 */
async function refreshChat() {
    try {
        let response = await postGraphqlQuery(`
        query($lobbyId:ID!){
          bingo {
            lobby(id:$lobbyId) {
              messages {
                id
                type
                htmlContent
                author {
                  username
                }
              }
            }
          }
        }`, {lobbyId: getLobbyParam()});
        if (response.status === 200) {
            let messages = response.data.bingo.lobby.messages;
            for (let message of messages)
                if (!document.querySelector(`.chatMessage[msg-id="${message.id}"]`))
                    addChatMessage(message);
        } else {
            showError('Failed to refresh messages');
            console.error(response);
        }
    } catch (err) {
        showError('Failed to refresh messages');
        console.error(err);
    }
    console.log('Refresh Chat');
}

/**
 * Refreshes the player list
 * @returns {Promise<void>}
 */
async function refreshPlayers() {
    try {
        let response = await postGraphqlQuery(`
        query ($lobbyId: ID!) {
          bingo {
            player {
              id
            }
            lobby(id: $lobbyId) {
              players {
                id
                username
                wins(lobbyId: $lobbyId)
              }
              admin {
                id
              }
            }
          }
        }
        `, {lobbyId: getLobbyParam()});
        if (response.status === 200) {
            let players = response.data.bingo.lobby.players;
            let adminId = response.data.bingo.lobby.admin.id;
            let isAdmin = response.data.bingo.player.id === adminId;
            for (let player of players)
                if (!document.querySelector(`.playerEntryContainer[b-pid="${player.id}"]`))
                    addPlayer(player, {admin: adminId, isAdmin: isAdmin});
        } else {
            showError('Failed to refresh players');
            console.error(response);
        }
    } catch (err) {
        showError('Failed to refresh players');
        console.error(err);
    }
}

/**
 * Removes players that are not existent in the player array
 * @param players {Array<Object>} - player id response of graphql
 */
function removeLeftPlayers(players) {
    for (let playerEntry of document.querySelectorAll('.playerEntryContainer'))
        if (!players.find(x => (x.id === playerEntry.getAttribute('b-pid'))))
            playerEntry.remove();
}

/**
 * Refreshes if a player-refresh is needed.
 * Removes players that are not in the lobby anyomre.
 * @param players
 */
function checkPlayerRefresh(players) {
    let playerRefresh = false;
    removeLeftPlayers(players);
    for (let player of players)
        if (!document.querySelector(`.playerEntryContainer[b-pid="${player.id}"]`))
            playerRefresh = true;
    if (playerRefresh)
        statusWrap(refreshPlayers);
}

/**
 * Checks if messages need to be refreshed and does it if it needs to.
 * @param messages
 */
function checkMessageRefresh(messages) {
    let messageRefresh = false;
    for (let message of messages)
        if (!document.querySelector(`.chatMessage[msg-id="${message.id}"]`))
            messageRefresh = true;
    if (messageRefresh)
        statusWrap(refreshChat);
}

/**
 * refreshes the lobby and calls itself with a timeout
 * @returns {Promise<void>}
 */
async function refreshLobby() {
    try {
        let response = await postGraphqlQuery(`
        query($lobbyId:ID!){
          bingo {
            lobby(id:$lobbyId) {
              players {
                id
              }
              messages {
                id
              }
              currentRound {
                id
              }
              words {
                content
              }
            }
          }
        }`, {lobbyId: getLobbyParam()});
        if (response.status === 200) {
            let {players, messages, currentRound} = response.data.bingo.lobby;
            checkPlayerRefresh(players);
            checkMessageRefresh(messages);
            let wordContainer = document.querySelector('#bingo-words');

            if (wordContainer)
                wordContainer.innerHTML = `<span class="bingoWord">
                ${response.data.bingo.lobby.words.map(x => x.content).join('</span><span class="bingoWord">')}</span>`;

            if (currentRound && currentRound.id && Number(currentRound.id) !== Number(getRoundParam()))
                insertParam('r', currentRound.id);

        } else {
            showError('Failed to refresh lobby');
            console.error(response);
        }
    } catch (err) {
        showError('Failed to refresh lobby');
        console.error(err);
    } finally {
        setTimeout(refreshLobby, 1000);
    }
}

/**
 * Checks the status of the lobby and the current round.
 * @returns {Promise<void>}
 */
async function refreshRound() {
    let roundOver = false;
    try {
        let response = await postGraphqlQuery(`
        query($lobbyId:ID!) {
          bingo {
            lobby(id:$lobbyId) {
              players {
                id
              }
              messages {
                id
              }
              currentRound {
                id
                status
              }
            }
          }
        }`, {lobbyId: getLobbyParam()});
        if (response.status === 200) {
            let {players, messages, currentRound} = response.data.bingo.lobby;

            checkPlayerRefresh(players);
            checkMessageRefresh(messages);
            if (!currentRound || currentRound.status === "FINISHED") {
                roundOver = true;
                await loadWinnerInfo();
            }
        } else {
            showError('Failed to refresh round');
            console.error(response);
        }
    } catch (err) {
        showError('Failed to refresh round');
        console.error(err);
    } finally {
        if (!roundOver)
            setTimeout(refreshRound, 1000);
    }
}

window.addEventListener("unhandledrejection", function (promiseRejectionEvent) {
    promiseRejectionEvent.promise.catch(err => console.log(err));
    showError('Connection problems...');
});

// prevent ctrl + s
window.addEventListener("keydown", async (e) => {
    if (e.which === 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        if (document.querySelector('#input-bingo-words')) {
            let gridSize = document.querySelector('#input-grid-size').value || 3;
            await statusWrap(async () => await setLobbySettings(getLobbyWords(), gridSize));
        }
    }
}, false);
