const btnConnectWallet = document.getElementById("btnConnectWallet");
const btnConnectWalletWrapper = document.getElementById(
  "btnConnectWallet-wrapper"
);
const handlers = document.getElementById("handlers");
const tokensOfCreateGameDropdown = document.getElementById(
  "tokensOfCreateGameDropdown"
);
const amountCreateGame = document.getElementById("amountCreateGame");
const secretCreateGame = document.getElementById("secretCreateGame");
const messageCreateGame = document.getElementById("messageCreateGame");
const CancelUnplayedGame = document.getElementById("CancelUnplayedGame");
const messageUnplayedGame = document.getElementById("messageUnplayedGame");
const CloseGame = document.getElementById("CloseGame");
const playedGamesDropdown = document.getElementById("playedGamesDropdown");
const secretCloseGame = document.getElementById("secretCloseGame");
const messageCloseGame = document.getElementById("messageCloseGame");
const PlayGame = document.getElementById("PlayGame");
const openedGamesDropdown = document.getElementById("openedGamesDropdown");
const optionsGame = document.getElementById("optionsGame");
const secretPlayGame = document.getElementById("secretPlayGame");
const messagePlayGame = document.getElementById("messagePlayGame");
const resultTable = document.getElementById("resultTable");
let gameData;

async function click_btnConnectWallet() {
  btnConnectWallet.innerHTML = "Инициализация подключения. Ожидайте...";

  // Проверяем подключен ли Метамаск к сайту
  if (typeof window.ethereum === "undefined") {
    console.log("Крипто кошелёк не обнаружен");
    btnConnectWallet.innerHTML = "Нажми меня, чтобы подключить кошель";
    return;
  }
  await setData();
  _setLoader("CreateGame");

  gameData = await connectWallet(window.ethereum, false);
  btnConnectWalletWrapper.style.display = "none";
  handlers.style.display = "block";
  callbackGamePvPisClosed(document.querySelector("#resultTable tbody"));

  _getUnplayedGame();
  _getPlayedGame();
  _getOpenGames();
  _startTimers();

  await getAvailableTokens(
    gameData.account,
    gameData.account,
    gameData.BSC_SCAN_API_KEY
  ).then((result) => {
    resultOfTokensData = result;
    const keys = Object.keys(resultOfTokensData);
    let option = document.createElement("option");
    option.text = "tBNB";
    option.value = zeroAddress;
    tokensOfCreateGameDropdown.add(option);

    for (let i = 0; i < keys.length; i++) {
      option = document.createElement("option");
      option.text = keys[i];
      option.value = resultOfTokensData[keys[i]].contractAddress;
      tokensOfCreateGameDropdown.add(option);
    }
  });
  messageCreateGame.textContent = "Сделайте ставку";
  _removeLoader("CreateGame");
}

async function _startTimers() {
  setInterval(() => _getUnplayedGame(), 60_000);
  setInterval(() => _getPlayedGame(), 60_000);
  setInterval(() => _getOpenGames(), 60_000);
}

async function _getOpenGames() {
  try {
    _setLoader("PlayGame");
    messagePlayGame.textContent = "Ищем открытые игры";
    openedGamesDropdown.innerHTML = "";
    let option = document.createElement("option");
    const gameBNB = await getFirstOpenGameByToken(zeroAddress);
    if (gameBNB) {
      option.text = `Игра на ${
        (await weiToFinney(gameBNB.balance)) / 1000
      } tBNB`;
      option.value = zeroAddress;
      openedGamesDropdown.add(option);
    }

    await getAvailableTokens(
      gameData.BSC_TESTNET_ADDRESS_PVP,
      gameData.BSC_TESTNET_ADDRESS_PVP,
      gameData.BSC_SCAN_API_KEY
    ).then(async (results) => {
      const keys = Object.keys(results);
      for (let i = 0; i < keys.length; i++) {
        const contractAddress = results[keys[i]].contractAddress;
        const gameERC20 = await getFirstOpenGameByToken(contractAddress);
        if (gameERC20) {
          option = document.createElement("option");
          option.text = `Игра на ${
            (await weiToFinney(gameERC20.balance)) / 1000
          } ${keys[i]}`;
          option.value = contractAddress;
          openedGamesDropdown.add(option);
        }
      }
    });
    if (openedGamesDropdown.length !== 0) {
      _removeLoader("PlayGame");
      messagePlayGame.textContent = "Открытые игры найдены";
    }
  } catch (error) {
    console.log(error);
  }
}

async function _getUnplayedGame() {
  try {
    const game = await getOpenGameByCreator();
    CancelUnplayedGame.style.display = game ? "block" : "none";
    CreateGame.style.display = game ? "none" : "block";
    if (!game) {
      messageUnplayedGame.textContent = "";
    }
  } catch (error) {}
}

async function _getPlayedGame() {
  try {
    getPlayedGame()
      .then(async (gamePvP) => {
        const _amount = await weiToFinney(gamePvP.balance);
        messageCloseGame.textContent = `У вас есть незакрытая игра на ${_amount} finney`;
        CloseGame.style.display = "block";
      })
      .catch(() => {
        CloseGame.style.display = "none";
      });
  } catch (error) {}
}

async function _createPvP(_choice) {
  _setLoader("CreateGame");
  messageCreateGame.textContent = "Создаем игру!";
  const amount = amountCreateGame.value;
  const dropdown = tokensOfCreateGameDropdown.value;
  const secret = secretCreateGame.value;

  await createGamePvP(_choice, secret, dropdown, amount)
    .then((result) => {
      messageCreateGame.textContent = result.message;
      alert(
        "Игра создана, можно создать только одну игру, ожидайте результата"
      );
      _getUnplayedGame();
    })
    .catch((error) => {
      console.log(error);
      messageCreateGame.textContent =
        "Что-то пошло не по плану. Попробуйте ещё раз";
    });
  _removeLoader("CreateGame");
  amountCreateGame.value = 0;
}

async function _cancelGame() {
  _setLoader("CancelUnplayedGame");
  const game = await getOpenGameByCreator();
  if (game) {
    const now = new Date().getTime();
    const timeGameOver = game.timeGameOver.toNumber() * 1000;
    if (timeGameOver > now) {
      messageUnplayedGame.textContent = `Игру можно завершить только после ${await _getTimestamp(
        timeGameOver
      )}`;
      _removeLoader("CancelUnplayedGame");
    } else {
      const result = await cancelUnplayedGame();
      if (result) {
        alert("Игра отменена, средства возвращены на ваш кошелёк");
      } else {
        messageUnplayedGame.textContent =
          "Что-то пошло не по плану. Попробуйте ещё раз";
      }
    }
  }
  await _getUnplayedGame();
  _removeLoader("CancelUnplayedGame");
}

async function _closePvP(_choice) {
  _setLoader("CloseGame");
  const secret = secretCloseGame.value;

  await closeGameAndGetMoney(_choice, secret)
    .then(async (result) => {
      alert("Игра закрыта, ожидайте результат");
      _getPlayedGame();
    })
    .catch(async (error) => {
      console.log(error);

      const game = await getOpenGameByCreator();
      const now = new Date().getTime();
      const timeGameOver = game.timeGameOver.toNumber() * 1000;
      if (timeGameOver > now) {
        messageCloseGame.textContent = `Игру можно завершить только после ${await _getTimestamp(
          timeGameOver
        )}`;
      } else {
        messageCloseGame.textContent =
          "Что-то пошло не по плану. Попробуйте ещё раз.";
      }
    });
  _removeLoader("CloseGame");
}

async function _playPvP(_choice) {
  _setLoader("PlayGame");
  const dropdown = openedGamesDropdown.value;
  await playFirstOpenGamePvP(_choice, dropdown)
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.log(error);
      alert(
        "Возможно, у вас недостаточный баланс для игры. Попробуйте ещё раз"
      );
    });
  _removeLoader("PlayGame");
  _getOpenGames();
  _getPlayedGame();
}

async function _setLoader(id) {
  const elem = document.getElementById(id);
  const overlays = elem.getElementsByClassName("loader");
  if (overlays.length == 0) {
    const overlay = document.createElement("div");
    overlay.classList.add("loading-overlay");
    elem.appendChild(overlay);
  }

  const loaders = elem.getElementsByClassName("loading-overlay");
  if (loaders.length == 0) {
    const loader = document.createElement("div");
    loader.classList.add("loader");
    elem.appendChild(loader);
  }
  elem.style.pointerEvents = "none";
}

async function _removeLoader(id) {
  const elem = document.getElementById(id);
  const overlays = elem.getElementsByClassName("loader");
  for (let i = overlays.length - 1; i >= 0; i--) {
    overlays[i].remove();
  }
  const loaders = elem.getElementsByClassName("loading-overlay");
  for (let i = loaders.length - 1; i >= 0; i--) {
    loaders[i].remove();
  }
  elem.style.pointerEvents = "auto";
}
