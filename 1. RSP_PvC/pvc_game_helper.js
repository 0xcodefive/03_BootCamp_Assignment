//import { _callFunction, _pureFunction } from "helpers.js";

let Data;
let provider;
let account;
let contract;

function setData() {
  fetch("/config.json")
    .then((res) => res.json())
    .then((data) => {
      Data = data;
    });
}

// Принимает 'window.ethereum'
// Возвращает account, contract и provider
async function connectWallet(ethereum) {
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
      const signer = provider.getSigner(account);
      contract = new ethers.Contract(
        Data.BSC_TESTNET_ADDRESS_PVC,
        Data.PVC_ABI,
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
    provider
  );
  const allowanceAmount = await _pureFunction(erc20Contract, "allowance", [
    account,
    Data.BSC_TESTNET_ADDRESS_PVP,
  ]);

  // Проверяем разрешение расходования меньше указанной величины, меняем его
  if (allowanceAmount < amount) {
    await _callFunction(erc20Contract, "approve", 0, [
      Data.BSC_TESTNET_ADDRESS_PVP,
      amount,
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

async function callbackGameIsPlayed(tableBody) {
  while (typeof contract === "undefined") {
    await _sleep(500);
  }
  await _sleep(500);
  const blockNumber = await provider.getBlockNumber();

  // Получаем последние 10 результатов для игрока
  contract
    .queryFilter("GamePvCisPlayed", blockNumber - 2000, blockNumber)
    .then((events) => {
      console.log(`Найдено ${events.length} событий`);
      events.slice(-10).forEach(async (event) => {
        const newRow = document.createElement("tr");

        const timestampCell = document.createElement("td");
        timestampCell.textContent = await _getBlockTimestamp(event.blockNumber);
        newRow.appendChild(timestampCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = `${ethers.utils.formatUnits(
          event.args.amount,
          "finney"
        )} finney`;
        newRow.appendChild(amountCell);

        const playerChoiceCell = document.createElement("td");
        playerChoiceCell.textContent = _convertBetToText(event.args.playerChoice);
        newRow.appendChild(playerChoiceCell);

        const contractChoiceCell = document.createElement("td");
        contractChoiceCell.textContent = _convertBetToText(event.args.contractChoice);
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
        amountCell.textContent = `${ethers.utils.formatUnits(
          amount,
          "finney"
        )} finney`;
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
      }
    }
  );
}

async function maxBetBNBbyFinney() {
  const maxBet = await _maxBetbyBNB(contract);
  return ethers.utils.formatUnits(maxBet, "finney");
}

async function maxBetTokenbyFinney(_tokenAddress) {
  const maxBet = await _maxBetbyToken(contract, _tokenAddress);
  return ethers.utils.formatUnits(maxBet, "finney");
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
  return value.toString() === "0" ? "Камень" : value.toString() === "1" ? "Ножницы" : "Бумага";
}

async function _getBlockTimestamp(blockNumber) {
  const block = await provider.getBlock(blockNumber);
  const date = new Date(block.timestamp * 1000);
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const formattedDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  return formattedDate;
  }

async function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
