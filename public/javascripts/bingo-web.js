/* eslint-disable no-unused-vars, no-undef */

class BingoGraphqlHelper {

    /**
     * Sets the username for a user
     * @param username {String} - the username
     * @returns {Promise<boolean>}
     */
    static async setUsername(username) {
        username = username.replace(/^\s+|\s+$/g, '');
        let uname = username.replace(/[\n\t👑🌟]|^\s+|\s+$/gu, '');
        if (uname.length === username.length) {
            let response = await postGraphqlQuery(`
            mutation($username:String!) {
              bingo {
                setUsername(username: $username) {
                  id
                  username
                }
              }
            }`, {username: username}, '/graphql?g=' + getLobbyParam());
            if (response.status === 200) {
                return response.data.bingo.setUsername.username;
            } else {
                if (response.errors)
                    showError(response.errors[0].message);
                 else
                    showError(`Failed to submit username.`);

                console.error(response);
                return false;
            }
        } else {
            showError(`Your username contains illegal characters (${username.replace(uname, '')}).`);
        }
    }

    /**
     * Creates a lobby via the graphql endpoint
     * @returns {Promise<boolean>}
     */
    static async createLobby() {
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
     * Leaves a lobby via the graphql endpoint
     * @returns {Promise<void>}
     */
    static async leaveLobby() {
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
     * Kicks a player
     * @param pid
     * @returns {Promise<void>}
     */
    static async kickPlayer(pid) {
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
     * Loads information about the rounds winner and the round stats.
     * @returns {Promise<boolean>}
     */
    static async loadWinnerInfo() {
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
     * Loads the lobby wors in the words element via graphql.
     * @returns {Promise<void>}
     */
    static async loadLobbyWords() {
        let response = await postGraphqlQuery(`
        query($lobbyId:ID!){
          bingo {
            lobby(id:$lobbyId) {
              words {
                content
              }
            }
          }
        }`, {lobbyId: getLobbyParam()});

        if (response.status === 200) {
            let wordContainer = document.querySelector('#bingo-words');

            if (wordContainer)
                wordContainer.innerHTML = `<span class="bingoWord">
                ${response.data.bingo.lobby.words.map(x => x.content).join('</span><span class="bingoWord">')}</span>`;
        } else {
            showError('Failed to load words.');
        }
    }

    /**
     * Sets the settings of the lobby
     * @param words
     * @param gridSize
     * @returns {Promise<LobbyWrapper.words|*|properties.words|{default, type}|boolean>}
     */
    static async setLobbySettings(words, gridSize) {
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
            if (response.errors)
                showError(response.errors[0].message);
            else
                showError('Error when submitting lobby settings.');
        }
    }
}

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
 * Spawns a notification when the window is inactive (hidden).
 * @param body
 * @param title
 */
function spawnNotification(body, title) {
    if (Notification.permission !== 'denied' && document[getHiddenNames().hidden]) {
        let options = {
            body: body,
            icon: '/favicon.ico'
        };
        let n = new Notification(title, options);
    }
}

/**
 * Submits the value of the username-input to set the username.
 * @returns {Promise<Boolean>}
 */
async function submitUsername() {
    let unameInput = document.querySelector('#input-username');
    let username = unameInput.value;

    if (username.length > 1 && username.length <= 30) {
        return await BingoGraphqlHelper.setUsername(username);
    } else {
        showError('You need to provide a username (min. 2 characters, max. 30)!');
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
 * Joins a lobby or says to create one if none is found
 * @returns {Promise<void>}
 */
async function joinLobby() {
    if (getLobbyParam()) {
        if (await submitUsername())
            window.location.reload();
    } else {
        showError('No lobby found. Please create one.');
    }
}

/**
 * Creates a lobby and redirects to the lobby.
 * @returns {Promise<boolean>}
 */
async function createLobby() {
    if (await submitUsername())
        await BingoGraphqlHelper.createLobby();
}

/**
 * Lets the player leave the lobby
 * @returns {Promise<void>}
 */
async function leaveLobby() {
    await BingoGraphqlHelper.leaveLobby();
}

/**
 * Kicks a player by id.
 * @param pid
 * @returns {Promise<void>}
 */
async function kickPlayer(pid) {
    await BingoGraphqlHelper.kickPlayer(pid);
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
    message = message.replace(/\s+$/g, '');
    let command = /(\/\w+) ?(.*)?/g.exec(message);
    if (command && command.length >= 2) {
        switch (command[1]) {
            case '/help':
                reply(`
            <br><b>Commands: </b><br>
            /help - shows this help <br>
            /hideinfo - hides all info messages <br>
            /showinfo - shows all info messages <br>
            /ping - shows the current ping <br>
            /username {Username} - sets the username <br><br>
            Admin commands: <br>
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
            case '/username':
                if (command[2]) {
                    let uname = await BingoGraphqlHelper.setUsername(command[2]);
                    reply(`Your username is <b>${uname}</b> now.`);
                } else {
                    reply('You need to provide a username');
                }
                break;
            default:
                reply('Unknown command');
                break;
        }
        let chatContent = document.querySelector('#chat-content');
        chatContent.scrollTop = chatContent.scrollHeight;
    }
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

        if (/^\/\.*/g.test(message))
            await executeCommand(message);
        else
            socket.emit('message', message);
    }
}

/**
 * Starts a new round of bingo
 * @returns {Promise<boolean>}
 */
async function startRound() {
    let roundStart = document.querySelector('#button-round-start');
    let textinput = document.querySelector('#input-bingo-words');
    let words = getLobbyWords();
    if (words.length > 0) {
        roundStart.setAttribute('class', 'pending');
        let gridSize = document.querySelector('#input-grid-size').value || 3;
        let resultWords = await BingoGraphqlHelper.setLobbySettings(words, gridSize);
        if (resultWords) {
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
            roundStart.setAttribute('class', '');
        }
    } else {
        throw new Error('No words provided.');
    }
}

/**
 * Returns the words of the lobby word input.
 * @returns {string[]}
 */
function getLobbyWords() {
    let textinput = document.querySelector('#input-bingo-words');
    return textinput.value.replace(/[<>]/g, '').split('\n').filter((el) => {
        return (!!el && el.length > 0);     // remove empty strings and non-types from word array
    });
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

    socket.emit('fieldToggle', {row: row, column: column});
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
 * @returns {Promise<boolean>}
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
        return true;
    } else {
        console.error(response);
        showError('Failed to submit bingo');
    }
}

/**
 * Displays the winner of the game in a popup.
 * @param winner {Object} - the round object as returned by graphql
 */
function displayWinner(winner) {
    let name = winner.username;
    let winnerDiv = document.createElement('div');
    let greyoverDiv = document.createElement('div');
    winnerDiv.setAttribute('class', 'popup');
    winnerDiv.innerHTML = `
        <h1>${name} has won!</h1>
        <button id="button-lobbyreturn" onclick="window.location.reload()">Return to Lobby!</button>
    `;
    greyoverDiv.setAttribute('class', 'greyover');
    document.body.append(greyoverDiv);
    document.body.appendChild(winnerDiv);
    spawnNotification(`${name} has won!`, 'Bingo');
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
        showError(err ? err.message : 'Unknown error');
    }
}


/**
 * Adds a message to the chat
 * @param messageObject {Object} - the message object returned by graphql
 * @param [player] {Number} - the id of the player
 */
function addChatMessage(messageObject, player) {
    let msgSpan = document.createElement('span');
    msgSpan.setAttribute('class', 'chatMessage');
    msgSpan.setAttribute('msg-type', messageObject.type);
    msgSpan.setAttribute('msg-id', messageObject.id);

    if (messageObject.type === "USER")
        msgSpan.innerHTML = `
        <span class="chatUsername">${messageObject.author.username}:</span>
        <span class="chatMessageContent">${messageObject.htmlContent}</span>`;
     else
        msgSpan.innerHTML = `
        <span class="chatMessageContent ${messageObject.type}">${messageObject.htmlContent}</span>`;


    if (messageObject.type === 'USER' && messageObject.author && messageObject.author.id !== player)
        spawnNotification(messageObject.content, messageObject.author.username);

    let chatContent = document.querySelector('#chat-content');
    chatContent.appendChild(msgSpan);
    chatContent.scrollTop = chatContent.scrollHeight;       // auto-scroll to bottom
}

/**
 * Adds a player to the player view
 * @param player {Object} - player as returned by graphql
 * @param options {Object} - meta information
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
 * Returns the current player id
 * @returns {Promise<*>}
 */
async function getPlayerInfo() {
    let result = await postGraphqlQuery(`
    query ($lobbyId:ID!) {
      bingo {
        player {
          id
          username
        }
        lobby(id:$lobbyId) {
          id
          admin {
            id
          }
        }
      }
    }`, {lobbyId: getLobbyParam()});
    if (result.status === 200) {
        let bingoData = result.data.bingo;
        return {
            id: bingoData.player.id,
            username: bingoData.player.username,
            isAdmin: bingoData.lobby.admin.id === bingoData.player.id
        };
    } else {
        showError('Failed to fetch player Id');
        console.error(result);
    }
}

/**
 * Initializes all socket events
 * @param data
 */
function initSocketEvents(data) {
    let playerId = data.id;
    let indicator = document.querySelector('#status-indicator');
    indicator.setAttribute('status', 'error');

    socket.on('connect', () => {
        indicator.setAttribute('socket-status', 'connected');
    });

    socket.on('reconnect', () => {
        indicator.setAttribute('socket-status', 'connected');
    });

    socket.on('disconnect', () => {
        indicator.setAttribute('socket-status', 'disconnected');
        showError('Disconnected from socket!');
    });

    socket.on('reconnecting', () => {
        indicator.setAttribute('socket-status', 'reconnecting');
    });

    socket.on('error', (error) => {
        showError(`Socket Error: ${JSON.stringify(error)}`);
    });

    socket.on('message', (msg) => {
        addChatMessage(msg, playerId);
    });

    socket.on('statusChange', (status, winner) => {
        if (status === 'FINISHED') {
            if (document.querySelector('#container-bingo-round'))
                displayWinner(winner);
        } else {
            window.location.reload();
        }
    });

    socket.on('playerJoin', (playerObject) => {
        addPlayer(playerObject, data);
    });

    socket.on('playerLeave', (playerId) => {
        document.querySelector(`.playerEntryContainer[b-pid='${playerId}']`).remove();
    });

    socket.on('usernameChange', (playerObject) => {
        document.querySelector(`.playerEntryContainer[b-pid='${playerObject.id}'] .playerNameSpan`).innerText = playerObject.username;
    });

    socket.on('wordsChange', async () => {
        try {
            await BingoGraphqlHelper.loadLobbyWords();
        } catch (err) {
            showError('Failed to load new lobby words.');
        }
    });

    socket.on('fieldChange', (field) => {
        let wordPanel = document.querySelector(`.bingoWordPanel[b-row='${field.row}'][b-column='${field.column}']`);
        wordPanel.setAttribute('b-sub', field.submitted);
        wordPanel.setAttribute('class', 'bingoWordPanel');
        if (field.bingo)
            document.querySelector('#container-bingo-button').setAttribute('class', '');
        else
            document.querySelector('#container-bingo-button').setAttribute('class', 'hidden');
    });
}

/**
 * Initializes the lobby refresh with sockets or graphql
 */
function initRefresh() {
    getPlayerInfo().then((data) => {
        socket = new SimpleSocket(`/bingo/${getLobbyParam()}`, {playerId: data.id});
        initSocketEvents(data);
    });
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
            await statusWrap(async () => await BingoGraphqlHelper.setLobbySettings(getLobbyWords(), gridSize));
        }
    }
}, false);

window.onload = async () => {
    if ("Notification" in window)
        if (Notification.permission !== 'denied') {
            try {
                await Notification.requestPermission();
            } catch (err) {
                showError(err.message);
            }
        }
    let chatContent = document.querySelector('#chat-content');
    chatContent.scrollTop = chatContent.scrollHeight;
};

let socket = null;
