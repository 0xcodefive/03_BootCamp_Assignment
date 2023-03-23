const tokensData = {};
let BSC_SCAN_API_KEY;

function _setData() {
  fetch("/config.json")
    .then((res) => res.json())
    .then((data) => {
      DaBSC_SCAN_API_KEYta = data.BSC_SCAN_API_KEY;
    });
}

// Функция для получения баланса токена для указанного адреса и контракта
async function _getTokenBalance(address, contractAddress) {
  const tokenBalanceApiUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${BSC_SCAN_API_KEY}`;
  const response = await fetch(tokenBalanceApiUrl);
  const data = await response.json();
  if (data.status === "1") {
    return Number(data.result);
  }
  return 0;
}

// Функция для получения списка токенов для указанного адреса и их балансов на обоих адресах
async function _getTokensData(apiUrl) {
  const response = await fetch(apiUrl);
  const data = await response.json();
  if (data.status === "1" && data.result) {
    for (const tx of data.result) {
      const { contractAddress, tokenSymbol } = tx;
      if (!tokensData.hasOwnProperty(contractAddress)) {
        tokensData[contractAddress] = {
          symbol: tokenSymbol,
          balance1: 0,
          balance2: 0,
        };
      }
      tokensData[contractAddress].balance1 += await _getTokenBalance(
        address1,
        contractAddress
      );
      tokensData[contractAddress].balance2 += await _getTokenBalance(
        address2,
        contractAddress
      );
    }
  } else {
    console.log("Ошибка при выполнении запроса к API:", data.message);
  }
}

async function getAvailableTokens(address1, address2) {
  _setData();
  const apiUrl1 = `https://api-testnet.bscscan.com//api?module=account&action=tokentx&address=${address1}&startblock=0&endblock=999999999&sort=asc&apikey=${BSC_SCAN_API_KEY}`;
  const apiUrl2 = `https://api-testnet.bscscan.com//api?module=account&action=tokentx&address=${address2}&startblock=0&endblock=999999999&sort=asc&apikey=${BSC_SCAN_API_KEY}`;
  // Запрашиваем данные для обоих адресов
  Promise.all([_getTokensData(apiUrl1), _getTokensData(apiUrl2)]).then(() => {
    const intersectTokens = Object.values(tokensData).filter((token) => {
      return token.balance1 >= 1e15 && token.balance2 >= 1e15;
    });

    let resultOfTokensData = {};

    //   console.log(
    //     "Токены, присутствующие на обоих адресах и у которых баланс больше или равен 1 finney:"
    //   );
    for (const token of intersectTokens) {
      resultOfTokensData[token.symbol].balance = Math.min(
        token.balance1,
        token.balance2
      );
      resultOfTokensData[token.symbol].contractAddress = token.contractAddress;

      // console.log(
      //   `${token.symbol} (${token.contractAddress}): ${Math.min(
      //     token.balance1,
      //     token.balance2
      //   )} ${token.symbol}`
      // );
    }
  });
}
