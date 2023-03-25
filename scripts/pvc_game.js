const btnConnectWallet = document.getElementById("btnConnectWallet");
let resultOfTokensData;

async function _playbyBNB(_choise) {
  setLoader("gameBNB");
  document.getElementById("messageGameBNB").textContent = "Игра началась!";
  const amount = document.getElementById("BNB_amount").value;

  await playbyBNB(_choise, amount)
    .then((result) => {
      document.getElementById("messageGameBNB").textContent = result.message;
    })
    .catch((error) => {
      console.error(error);
      document.getElementById("messageGameBNB").textContent =
        "Что-то пошло не поп плану. Попробуйте ещё раз";
    });
  document.getElementById("BNB_amount").value = 0;
  removeLoader("gameBNB");
}

async function _playbyToken(_choise) {
  setLoader("gameByToken");
  document.getElementById("messageGameByToken").textContent = "Игра началась!";
  const amount = document.getElementById("token_amount").value;
  const dropdown = document.getElementById("tokenDropdown").value;

  await playbyToken(_choise, dropdown, amount)
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
  removeLoader("gameByToken");
}

async function click_btnConnectWallet() {
  btnConnectWallet.innerHTML =
    "Инициализация подключения. Ожидайте...";

  // Проверяем подключен ли Метамаск к сайту
  if (typeof window.ethereum === "undefined") {
    console.log("Крипто кошелёк не обнаружен");
    btnConnectWallet.innerHTML =
      "Нажми меня, чтобы подключить кошель";
  } else {
    const gameData = await connectWallet(window.ethereum);
    document.getElementById("btnConnectWallet-wrapper").style.display = "none";
    document.getElementById("handlers").style.display = "block";
    callbackGameIsPlayed(document.querySelector("#resultTable tbody"));

    setLoader("gameByToken");
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
    removeLoader("gameByToken");
  }
}

async function setLoader(id) {
  const overlay = document.createElement("div");
  overlay.classList.add("loading-overlay");
  document.getElementById(id).appendChild(overlay);

  const loader = document.createElement("div");
  loader.classList.add("loader");
  document.getElementById(id).appendChild(loader);
  document.getElementById(id).style.pointerEvents = "none";
}

async function removeLoader(id) {
  const elem = document.getElementById(id);
  const overlay = elem.getElementsByClassName("loader")[0];
  overlay.remove();
  const loader = document.getElementsByClassName("loading-overlay")[0];
  loader.remove();
  elem.style.pointerEvents = "auto";
}

setData();
