const btnConnectWallet = document.getElementById("btnConnectWallet");
let resultOfTokensData;

async function _playbyBNB(_choice) {
  _setLoader("gameBNB");
  document.getElementById("messageGameBNB").textContent = "Игра началась!";
  const amount = document.getElementById("BNB_amount").value;

  await playbyBNB(_choice, amount)
    .then((result) => {
      document.getElementById("messageGameBNB").textContent = result.message;
    })
    .catch((error) => {
      console.error(error);
      document.getElementById("messageGameBNB").textContent =
        "Что-то пошло не поп плану. Попробуйте ещё раз";
    });
  document.getElementById("BNB_amount").value = 0;
  _removeLoader("gameBNB");
}

async function _playbyToken(_choice) {
  _setLoader("gameByToken");
  document.getElementById("messageGameByToken").textContent = "Игра началась!";
  const amount = document.getElementById("token_amount").value;
  const dropdown = document.getElementById("tokenDropdown").value;

  await playbyToken(_choice, dropdown, amount)
    .then((result) => {
      document.getElementById("messageGameByToken").textContent =
        result.message;
    })
    .catch((error) => {
      console.error(error);
      document.getElementById("messageGameByToken").textContent =
        "Что-то пошло не поп плану. Попробуйте ещё раз";
    });
  document.getElementById("token_amount").value = 0;
  _removeLoader("gameByToken");
}

async function click_btnConnectWallet() {
  btnConnectWallet.innerHTML = "Инициализация подключения. Ожидайте...";

  // Проверяем подключен ли Метамаск к сайту
  if (typeof window.ethereum === "undefined") {
    console.log("Крипто кошелёк не обнаружен");
    btnConnectWallet.innerHTML = "Нажми меня, чтобы подключить кошель";
    return;
  }
  await setData();

  const gameData = await connectWallet(window.ethereum);
  document.getElementById("btnConnectWallet-wrapper").style.display = "none";
  document.getElementById("handlers").style.display = "block";
  callbackGamePvCisPlayed(document.querySelector("#resultTable tbody"));

  _setLoader("gameByToken");
  await getAvailableTokens(
    gameData.account,
    gameData.BSC_TESTNET_ADDRESS_PVC,
    gameData.BSC_SCAN_API_KEY
  ).then((result) => {
    document.getElementById("messageGameByToken").textContent =
      "Токены не найдены";
    resultOfTokensData = result;
    const keys = Object.keys(resultOfTokensData);
    let dropdown = document.getElementById("tokenDropdown");
    for (let i = 0; i < keys.length; i++) {
      let option = document.createElement("option");
      option.text = keys[i];
      option.value = resultOfTokensData[keys[i]].contractAddress;
      dropdown.add(option);
      document.getElementById("messageGameByToken").textContent =
        "Сделайте ставку";
    }
  });

  document.getElementById("messageGameBNB").textContent = "Сделайте ставку";
  _removeLoader("gameByToken");
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
