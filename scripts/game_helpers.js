//import { _callFunction, _pureFunction } from "helpers.js";

const zeroAddress = "0x0000000000000000000000000000000000000000";
let Data;
let contract;
let provider;
let account;
let signer;

window.ethereum.on("accountsChanged", function (accounts) {
  location.reload();
});

function setData() {
  fetch("/config.json")
    .then((res) => res.json())
    .then((data) => {
      Data = data;
    });
}

// Принимает 'window.ethereum'
// Возвращает account, contract и provider
async function connectWallet(ethereum, isPvC = true) {
  provider = new ethers.providers.Web3Provider(ethereum);
  await provider.send("eth_requestAccounts", []).then(async () => {
    // Проверяем, в нужной сети находится кошелёк, если нет, меняем сеть
    if (ethereum.chainId !== Data.BSC_TESTNET_CHAIN_ID) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: Data.BSC_TESTNET_CHAIN_ID,
            rpcUrls: [Data.BSC_TESTNET_RPC_URL],
            chainName: Data.BSC_TESTNET_CHAINNAME,
            nativeCurrency: {
              name: Data.BSC_TESTNET_NAME,
              symbol: Data.BSC_TESTNET_SYMBOL,
              decimals: Data.BSC_TESTNET_DECIMALS,
            },
            blockExplorerUrls: [Data.BSC_TESTNET_BLOCK_EXPLORER_URLS],
          },
        ],
      });
    }

    await provider.listAccounts().then((accounts) => {
      account = accounts[0];
      signer = provider.getSigner(account);
      contract = new ethers.Contract(
        isPvC ? Data.BSC_TESTNET_ADDRESS_PVC : Data.BSC_TESTNET_ADDRESS_PVP,
        isPvC ? Data.PVC_ABI : Data.PVP_ABI,
        signer
      );
    });
  });
  let gameData = Data;
  gameData["provider"] = provider;
  gameData["account"] = account;
  gameData["contract"] = contract;
  return gameData;
}

async function playbyBNB(_choice, _amount) {
  if (_choice < 0 || _choice > 2) {
    console.log("Choose rock scissors or paper");
    return {
      result: false,
      message: "Сделай правильный выбор между Камнем, Ножницами или Бумагой",
    };
  }

  if (_amount <= 0) {
    console.log("Your bet must be greater 1 finney");
    return {
      result: false,
      message: "Твоя ставка должна быть больше чем 1 finney",
    };
  }

  const amount = _convertFinneyToBigNumber(_amount);
  const maxBet = await _maxBetbyBNB(contract);
  if (maxBet < amount) {
    console.log("Your bet should be less than contract balance");
    return {
      result: false,
      message: "Твоя ставка не должна быть больше чем баланс контракта",
    };
  }

  // Играем
  const call = await _callFunction(contract, "playPvCbyBNB", amount, [_choice]);
  return {
    result: true,
    message: `Transaction tx: ${call.txReceipt.transactionHash}`,
  };
}

async function playbyToken(_choice, _tokenAddress, _amount) {
  if (_choice < 0 || _choice > 2) {
    console.log("Choose rock scissors or paper");
    return {
      result: false,
      message: "Choose rock scissors or paper",
    };
  }

  if (_amount <= 0) {
    console.log("Your bet must be greater 1 finney");
    return {
      result: false,
      message: "Your bet must be greater 1 finney",
    };
  }

  const amount = _convertFinneyToBigNumber(_amount);
  const maxBet = await _maxBetbyToken(contract, _tokenAddress);
  if (maxBet < amount) {
    console.log("Your bet should be less than contract balance");
    return {
      result: false,
      message: "Твоя ставка не должна быть больше чем баланс контракта",
    };
  }

  // Проверяем разрешение расходования для выбранного пользователем токена
  const erc20Contract = new ethers.Contract(
    _tokenAddress,
    Data.ERC20_ABI,
    signer
  );

  let allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
    account,
    Data.BSC_TESTNET_ADDRESS_PVC,
  ]);

  const balanceOf = await _pureFunction(erc20Contract, "balanceOf", [account]);

  // Проверяем разрешение расходования меньше указанной величины, меняем его
  if (balanceOf.txResponse.gt(allowanceAmount.txResponse)) {
    await _callFunction(erc20Contract, "approve", 0, [
      Data.BSC_TESTNET_ADDRESS_PVC,
      balanceOf.txResponse.mul(10),
    ]);
  }

  let counter = 0;
  while (
    balanceOf.txResponse.gt(allowanceAmount.txResponse) &&
    counter++ < 10
  ) {
    await _sleep(1000);
    allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
      account,
      Data.BSC_TESTNET_ADDRESS_PVC,
    ]);
  }

  // Играем
  const call = await _callFunction(contract, "playPvCbyToken", 0, [
    _choice,
    _tokenAddress,
    amount,
  ]);
  return {
    result: true,
    message: `Transaction tx: ${call.txReceipt.transactionHash}`,
  };
}

async function callbackGamePvCisPlayed(tableBody) {
  while (typeof contract === "undefined") {
    await _sleep(500);
  }
  await _sleep(500);
  const blockNumber = await provider.getBlockNumber();

  // Получаем последние 10 результатов для игрока
  contract
    .queryFilter("GamePvCisPlayed", blockNumber - 5000, blockNumber)
    .then((events) => {
      console.log(`Найдено ${events.length} событий`);
      events.slice(-10).forEach(async (event) => {
        const newRow = document.createElement("tr");

        const timestampCell = document.createElement("td");
        timestampCell.textContent = await _getBlockTimestamp(event.blockNumber);
        newRow.appendChild(timestampCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = `${await weiToFinney(
          event.args.amount
        )} finney`;
        newRow.appendChild(amountCell);

        const playerChoiceCell = document.createElement("td");
        playerChoiceCell.textContent = _convertBetToText(
          event.args.playerChoice
        );
        newRow.appendChild(playerChoiceCell);

        const contractChoiceCell = document.createElement("td");
        contractChoiceCell.textContent = _convertBetToText(
          event.args.contractChoice
        );
        newRow.appendChild(contractChoiceCell);

        const resultCell = document.createElement("td");
        resultCell.textContent = event.args.result.toString();
        newRow.appendChild(resultCell);

        tableBody.appendChild(newRow);
      });
    });

  // Подписываемся на событие GamePvCisPlayed для контракта
  contract.on(
    "GamePvCisPlayed",
    async (player, amount, playerChoice, contractChoice, result, event) => {
      if (player === account) {
        console.log(`Новый результат игры: ${result}`);

        const newRow = document.createElement("tr");

        const timestampCell = document.createElement("td");
        timestampCell.textContent = await _getBlockTimestamp(event.blockNumber);
        newRow.appendChild(timestampCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = `${await weiToFinney(amount)} finney`;
        newRow.appendChild(amountCell);

        const playerChoiceCell = document.createElement("td");
        playerChoiceCell.textContent = _convertBetToText(playerChoice);
        newRow.appendChild(playerChoiceCell);

        const contractChoiceCell = document.createElement("td");
        contractChoiceCell.textContent = _convertBetToText(contractChoice);
        newRow.appendChild(contractChoiceCell);

        const resultCell = document.createElement("td");
        resultCell.textContent = result.toString();
        newRow.appendChild(resultCell);

        tableBody.appendChild(newRow);
        if (tableBody.children.length > 10) {
          tableBody.removeChild(tableBody.firstChild);
        }

        alert(`YOU ${result.toString()}`);
      }
    }
  );
}

async function createGamePvP(_choice, _secret, _tokenAddress, _amount) {
  if (_choice < 0 || _choice > 2) {
    console.log("Choose rock scissors or paper");
    return {
      result: false,
      message: "Choose rock scissors or paper",
    };
  }

  const num_secret = parseInt(_secret);
  if (isNaN(num_secret)) {
    console.log("Your secret is not number");
    return {
      result: false,
      message: "Your secret is not number",
    };
  }

  const num_amount = parseInt(_amount);
  if (isNaN(num_amount)) {
    console.log("Your amount is not number");
    return {
      result: false,
      message: "Your amount is not number",
    };
  }

  if (num_amount <= 0) {
    console.log("Your bet must be greater 1 finney");
    return {
      result: false,
      message: "Your bet must be greater 1 finney",
    };
  }

  const amount = _convertFinneyToBigNumber(_amount);
  const hash = (
    await _pureFunction(contract, "createHashForGame", [_choice, _secret])
  ).txResponse;

  if (_tokenAddress !== zeroAddress) {
    // Проверяем разрешение расходования для выбранного пользователем токена
    const erc20Contract = new ethers.Contract(
      _tokenAddress,
      Data.ERC20_ABI,
      signer
    );

    let allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
      account,
      Data.BSC_TESTNET_ADDRESS_PVP,
    ]);

    const balanceOf = await _pureFunction(erc20Contract, "balanceOf", [
      account,
    ]);

    // Проверяем разрешение расходования меньше указанной величины, меняем его
    if (balanceOf.txResponse.gt(allowanceAmount.txResponse)) {
      await _callFunction(erc20Contract, "approve", 0, [
        Data.BSC_TESTNET_ADDRESS_PVP,
        balanceOf.txResponse.mul(10),
      ]);
    }

    let counter = 0;
    while (
      balanceOf.txResponse.gt(allowanceAmount.txResponse) &&
      counter++ < 10
    ) {
      await _sleep(1000);
      allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
        account,
        Data.BSC_TESTNET_ADDRESS_PVP,
      ]);
    }

    // Играем
    const call = await _callFunction(contract, "createGamePvPbyToken", 0, [
      _tokenAddress,
      amount,
      hash,
    ]);
    return {
      result: true,
      message: `Transaction tx: ${call.txReceipt.transactionHash}`,
    };
  } else {
    const call = await _callFunction(contract, "createGamePvPbyBNB", amount, [
      hash,
    ]);
    return {
      result: true,
      message: `Transaction tx: ${call.txReceipt.transactionHash}`,
    };
  }
}

async function closeGameAndGetMoney(_choice, _secret) {
  if (_choice < 0 || _choice > 2) {
    console.log("Choose rock scissors or paper");
    return {
      result: false,
      message: "Choose rock scissors or paper",
    };
  }

  const call = await _callFunction(contract, "closeGameAndGetMoney", 0, [
    _choice,
    _secret,
  ]);
  return {
    result: true,
    message: `Transaction tx: ${call.txReceipt.transactionHash}`,
  };
}

async function playFirstOpenGamePvP(_choice, _tokenAddress) {
  if (_choice < 0 || _choice > 2) {
    console.log("Choose rock scissors or paper");
    return {
      result: false,
      message: "Choose rock scissors or paper",
    };
  }

  const gamePvP = await getFirstOpenGameByToken(_tokenAddress);
  if (_tokenAddress !== zeroAddress) {
    // Проверяем разрешение расходования для выбранного пользователем токена
    const erc20Contract = new ethers.Contract(
      _tokenAddress,
      Data.ERC20_ABI,
      signer
    );

    let allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
      account,
      Data.BSC_TESTNET_ADDRESS_PVP,
    ]);

    const balanceOf = await _pureFunction(erc20Contract, "balanceOf", [
      account,
    ]);

    // Проверяем разрешение расходования меньше указанной величины, меняем его
    if (balanceOf.txResponse.gt(allowanceAmount.txResponse)) {
      await _callFunction(erc20Contract, "approve", 0, [
        Data.BSC_TESTNET_ADDRESS_PVP,
        balanceOf.txResponse.mul(10),
      ]);
    }

    let counter = 0;
    while (
      balanceOf.txResponse.gt(allowanceAmount.txResponse) &&
      counter++ < 10
    ) {
      await _sleep(1000);
      allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
        account,
        Data.BSC_TESTNET_ADDRESS_PVP,
      ]);
    }

    // Играем
    const call = await _callFunction(contract, "playFirstOpenGamePvP", 0, [
      _choice,
      _tokenAddress,
    ]);
    return {
      result: true,
      message: `Transaction tx: ${call.txReceipt.transactionHash}`,
    };
  } else {
    const call = await _callFunction(
      contract,
      "playFirstOpenGamePvPbyBNB",
      gamePvP.balance,
      [_choice]
    );
    return {
      result: true,
      message: `Transaction tx: ${call.txReceipt.transactionHash}`,
    };
  }
}

async function cancelUnplayedGame() {
  const call = await _callFunction(contract, "cancelUnplayedGame", 0);
  return call.txReceipt;
}

async function callbackGamePvPisClosed(tableBody) {
  while (typeof contract === "undefined") {
    await _sleep(500);
  }
  await _sleep(500);
  const blockNumber = await provider.getBlockNumber();

  // Получаем последние 10 сыгранных игр для игрока
  contract
    .queryFilter("GamePvPisPlayed", blockNumber - 5000, blockNumber)
    .then((events) => {
      const filtered = events.filter(
        (event) =>
          event.args.player_1 === account || event.args.player_2 === account
      );
      console.log(`Найдено ${filtered.length} событий`);
      filtered.slice(-10).forEach(async (event) => {
        const gamesPvP = (
          await _pureFunction(contract, "gamesPvP", [event.args.gameIndex])
        ).txResponse;
        if (gamesPvP.winner === zeroAddress) {
          return;
        }
        const newRow = document.createElement("tr");

        const timestampCell = document.createElement("td");
        timestampCell.textContent = await _getBlockTimestamp(event.blockNumber);
        newRow.appendChild(timestampCell);

        const tokenCell = document.createElement("td");
        if (gamesPvP.token === zeroAddress) {
          tokenCell.textContent = "tBNB";
        } else {
          const erc20Contract = new ethers.Contract(
            gamesPvP.token,
            Data.ERC20_ABI,
            signer
          );
          tokenCell.textContent = (
            await _pureFunction(erc20Contract, "symbol")
          ).txResponse;
        }
        newRow.appendChild(tokenCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = `${await weiToFinney(
          gamesPvP.balance
        )} finney`;
        newRow.appendChild(amountCell);

        const resultCell = document.createElement("td");
        const winner = gamesPvP.winner;
        resultCell.textContent =
          winner === Data.BSC_TESTNET_ADDRESS_PVP
            ? "Draw"
            : winner === account
            ? "Win"
            : "Fail";
        newRow.appendChild(resultCell);

        tableBody.appendChild(newRow);
      });
    });

  // Подписываемся на событие GamePvPisClosed для контракта
  contract.on("GamePvPisClosed", async (_winner, _token, _gameIndex, event) => {
    const gamesPvP = (await _pureFunction(contract, "gamesPvP", [_gameIndex]))
      .txResponse;
    if (gamesPvP.player_1 === account || gamesPvP.player_2 === account) {
      const newRow = document.createElement("tr");

      const timestampCell = document.createElement("td");
      timestampCell.textContent = await _getBlockTimestamp(event.blockNumber);
      newRow.appendChild(timestampCell);

      const tokenCell = document.createElement("td");
      if (gamesPvP.token === zeroAddress) {
        tokenCell.textContent = "tBNB";
      } else {
        const erc20Contract = new ethers.Contract(
          gamesPvP.token,
          Data.ERC20_ABI,
          signer
        );
        tokenCell.textContent = (
          await _pureFunction(erc20Contract, "symbol")
        ).txResponse;
      }
      newRow.appendChild(tokenCell);

      const amountCell = document.createElement("td");
      amountCell.textContent = `${await weiToFinney(gamesPvP.balance)} finney`;
      newRow.appendChild(amountCell);

      const resultCell = document.createElement("td");
      const winner = gamesPvP.winner;
      resultCell.textContent =
        winner === Data.BSC_TESTNET_ADDRESS_PVP
          ? "Draw"
          : winner === account
          ? "Win"
          : "Fail";
      newRow.appendChild(resultCell);

      tableBody.appendChild(newRow);
      if (tableBody.children.length > 10) {
        tableBody.removeChild(tableBody.firstChild);
      }

      if (resultCell.textContent !== "Draw") {
        alert(
          `YOU ${resultCell.textContent} ${amountCell.textContent} ${tokenCell.textContent}`
        );
      } else {
        alert(`Sorry, ${resultCell.textContent}`);
      }
    }
  });
}

async function getPlayedGame() {
  try {
    const getPlayedGame = (
      await _pureFunction(contract, "getPlayedGame", [account])
    ).txResponse;
    if (!getPlayedGame) {
      return undefined;
    }
    const gamePvP = (
      await _pureFunction(contract, "gamesPvP", [getPlayedGame[1]])
    ).txResponse;
    return gamePvP;
  } catch {
    return undefined;
  }
}

async function getFirstOpenGameByToken(_address) {
  try {
    const getGame = (
      await _pureFunction(contract, "getFirstOpenGameByToken", [_address])
    ).txResponse;
    if (!getGame[0]) {
      return undefined;
    }
    const gamePvP = (await _pureFunction(contract, "gamesPvP", [getGame[1]]))
      .txResponse;
    return gamePvP;
  } catch {
    return undefined;
  }
}

async function getOpenGameByCreator(_creator = undefined) {
  try {
    if (_creator === undefined) {
      _creator = account;
    }
    const getGame = (
      await _pureFunction(contract, "getOpenGameByCreator", [_creator])
    ).txResponse;
    if (!getGame[0]) {
      return undefined;
    }
    const gamePvP = (await _pureFunction(contract, "gamesPvP", [getGame[1]]))
      .txResponse;
    return gamePvP;
  } catch {
    return undefined;
  }
}

async function maxBetBNBbyFinney() {
  const maxBet = await _maxBetbyBNB(contract);
  return await weiToFinney(maxBet, "finney");
}

async function maxBetTokenbyFinney(_tokenAddress) {
  const maxBet = await _maxBetbyToken(contract, _tokenAddress);
  return await weiToFinney(maxBet, "finney");
}

async function weiToFinney(_amount) {
  return ethers.utils.formatUnits(_amount, "finney");
}

async function _maxBetbyBNB() {
  return await _pureFunction(contract, "maxBetPvCbyBNB");
}

async function _maxBetbyToken(_tokenAddress) {
  return await _pureFunction(contract, "maxBetPvCbyToken", [_tokenAddress]);
}

function _convertFinneyToBigNumber(value) {
  const valueInWei = ethers.utils.parseUnits(value.toString(), "finney");
  const bigNumber = ethers.BigNumber.from(valueInWei);
  return bigNumber;
}

function _convertBetToText(value) {
  return value.toString() === "0"
    ? "Камень"
    : value.toString() === "1"
    ? "Ножницы"
    : "Бумага";
}

async function _getBlockTimestamp(blockNumber) {
  const block = await provider.getBlock(blockNumber);
  return await _getTimestamp(block.timestamp * 1000);
}

async function _getTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const formattedDate =
    year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  return formattedDate;
}

async function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
