async function submitBingoWords() {
    let textContent = document.querySelector('#bingo-textarea').value;
    let words = textContent.replace(/[<>]/g, '').split('\n');
    let size = document.querySelector('#bingo-grid-size').value;
    let dimY = document.querySelector('#bingo-grid-y').value;
    let response = await postLocData({
        bingoWords: words,
        size: size
    });

    let data = JSON.parse(response.data);
    let gameid = data.id;
    insertParam('game', gameid);
}

async function submitUsername() {
    let username = document.querySelector('#username-input').value;
    let response = await postLocData({
        username: username
    });

    console.log(response);
}

async function submitWord(word) {
    let response = await postLocData({
        bingoWord: word
    });
    console.log(response);

    let data = JSON.parse(response.data);
    for (let row of data.fieldGrid) {
        for (let field of row) {
            document.querySelector(`.bingo-word-panel[b-word="${field.word}"]`)
                .setAttribute('b-sub', field.submitted);
        }
    }
    if (data.bingo) {
        document.querySelector('#bingo-button').setAttribute('class', '');
    }
}

async function submitBingo() {
    let response = await postLocData({
        bingo: true
    });
    let data = JSON.parse(response.data);
    if (data.bingos.length > 0) {
        displayWinner(data.users[data.bingos[0]].username);
        clearInterval(refrInterval)
    }
    console.log(response);
}

async function refresh() {
    let response = await postLocData({});
    if (response.status === 400)
        clearInterval(refrInterval);
    let data = JSON.parse(response.data);
    if (data.bingos.length > 0) {
        displayWinner(data.users[data.bingos[0]].username);
        clearInterval(refrInterval)
    }
    console.log(response);
}

function displayWinner(name) {
    let winnerDiv = document.createElement('div');
    let greyoverDiv = document.createElement('div');
    let winnerSpan = document.createElement('span');
    winnerDiv.setAttribute('class', 'popup');
    greyoverDiv.setAttribute('class', 'greyover');
    winnerSpan.innerText = `${name} has won!`;
    winnerDiv.appendChild(winnerSpan);
    document.body.append(greyoverDiv);
    document.body.appendChild(winnerDiv);
}

window.onload = () => {
    if (window && !document.querySelector('#bingoform')) {
        refrInterval = setInterval(refresh, 1000);
    }
    let gridSizeElem = document.querySelector('#bingo-grid-size');
    document.querySelector('#bingo-grid-y').innerText = gridSizeElem.value;
    gridSizeElem.oninput = () => {
        document.querySelector('#bingo-grid-y').innerText = gridSizeElem.value;
    };
};