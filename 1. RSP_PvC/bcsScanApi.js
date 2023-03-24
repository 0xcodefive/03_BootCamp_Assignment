// const { ethers } = require('ethers');
let tokensData = {};

// Функция для получения баланса токена для указанного адреса и контракта
async function _getTokenBalance(address, contractAddress, apy_key) {
  const tokenBalanceApiUrl = `https://api-testnet.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${apy_key}`;
  const response = await fetch(tokenBalanceApiUrl);
  const data = await response.json();
  if (data.status === "1") {
    return ethers.BigNumber.from(data.result);
  }
  return ethers.BigNumber.from("0");
}

// Функция для получения списка токенов для указанного адреса и их балансов на обоих адресах
async function _getTokensData(apiUrl, address1, address2, apy_key) {
  const response = await fetch(apiUrl);
  const data = await response.json();
  if (data.status === "1" && data.result) {
    for (const tx of data.result) {
      const { contractAddress, tokenSymbol } = tx;
      if (!tokensData.hasOwnProperty(contractAddress)) {
        tokensData[contractAddress] = {
          symbol: tokenSymbol,
        };
      }
      tokensData[contractAddress].balance1 = await _getTokenBalance(
        address1,
        contractAddress,
        apy_key
      );
      tokensData[contractAddress].balance2 = await _getTokenBalance(
        address2,
        contractAddress,
        apy_key
      );
    }
  } else {
    console.log("Ошибка при выполнении запроса к API:", data.message);
  }
}

async function getAvailableTokens(addressAccount, addressGame, apy_key) {
  const apiUrl = `https://api-testnet.bscscan.com/api?module=account&action=tokentx&address=${addressAccount}&startblock=0&endblock=999999999&sort=asc&apikey=${apy_key}`;
  let resultOfTokensData = {};
  await _getTokensData(apiUrl, addressAccount, addressGame, apy_key).then(
    () => {
      // const intersectTokens = Object.values(tokensData).filter((token) => {
      //   return token.balance1 >= 1e15 && token.balance2 >= 1e15;
      // });
      for (const key of Object.keys(tokensData)) {
        if (
          tokensData[key].balance1 < _convertFinneyToBigNumber(1) ||
          tokensData[key].balance2 < _convertFinneyToBigNumber(1)
        ) {
          continue;
        }

        resultOfTokensData[tokensData[key].symbol] = {
          contractAddress: key,
          balance: tokensData[key].balance1
            .sub(tokensData[key].balance2)
            .isNegative()
            ? tokensData[key].balance1
            : tokensData[key].balance2,
        };
      }
    }
  );
  return resultOfTokensData;
}
