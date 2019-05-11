/**
 * Returns the value of the url-param 'game'
 * @returns {string}
 */
function getGameParam() {
    return window.location.href.match(/\?game=(\w+)/)[1];
}

/**
 * Toggles the visiblity of the player.container
 */
function togglePlayerContainer() {
    let playerContainer = document.querySelector('#players-container');
    if (playerContainer.getAttribute('class') === 'hidden')
        playerContainer.setAttribute('class', '');
    else
        playerContainer.setAttribute('class', 'hidden');
}

/**
 * Submits the bingo words to create a game
 * @returns {Promise<void>}
 */
async function submitBingoWords() {
    let textContent = document.querySelector('#bingo-textarea').value;
    let words = textContent.replace(/[<>]/g, '').split('\n');
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
        console.error(response)
    }
}

/**
 * Submits the value of the username-input to set the username.
 * @returns {Promise<void>}
 */
async function submitUsername() {
    let unameInput = document.querySelector('#username-input');
    let username = unameInput.value;
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
        console.error(response);
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
    } else  {
        if (response.status === 400)
            clearInterval(refrInterval);
        console.error(response);
    }
}

/**
 * Displays the winner of the game in a popup.
 * @param name {String} - the name of the winner
 */
function displayWinner(name) {
    let winnerDiv = document.createElement('div');
    let greyoverDiv = document.createElement('div');
    let winnerSpan = document.createElement('span');
    winnerDiv.setAttribute('class', 'popup');
    winnerDiv.setAttribute('style', 'cursor: pointer');
    greyoverDiv.setAttribute('class', 'greyover');
    winnerSpan.innerText = `${name} has won!`;
    winnerDiv.appendChild(winnerSpan);
    winnerDiv.onclick = () => {
        window.location.reload();
    };
    document.body.append(greyoverDiv);
    document.body.appendChild(winnerDiv);
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

window.onload = () => {
    if (window && !document.querySelector('#bingoform')) {
        refrInterval = setInterval(refresh, 1000);      // global variable to clear
    }
    let gridSizeElem = document.querySelector('#bingo-grid-size');
    document.querySelector('#bingo-grid-y').innerText = gridSizeElem.value;
    gridSizeElem.oninput = () => {
        document.querySelector('#bingo-grid-y').innerText = gridSizeElem.value;
    };
};
