/***************************************************
Вызываем call функцию контракта

Принимаем аргументы:
    contract - контракт из ethers.ethers.Contract
    funcName - название функции как в ABI
    value - плата в wei
    args - аргументы в формате array

Возвращаем значения:
    txResponse - ответ выполнения функции
    txReceipt - результат выполнения транзакции в блокчейне
***************************************************/
async function _callFunction(contract, funcName, value, args) {
  try {
    // Проверяем, существует ли функция с заданным именем
    if (!contract[funcName]) {
      console.error(`Contract does not have function ${funcName}`);
      return;
    }
    // Вызываем функцию с заданным именем, передавая указанное значение и аргументы
    let txResponse;
    if (value) {
      txResponse = !args
        ? await contract[funcName]({ value })
        : await contract[funcName](...args, { value });
    } else {
      txResponse = !args
        ? await contract[funcName]()
        : await contract[funcName](...args);
    }
    // Ждем, пока транзакция будет подтверждена и выводим результат
    const txReceipt = await txResponse.wait(1);
    return {
      txResponse: txResponse,
      txReceipt: txReceipt,
    };
  } catch (error) {
    console.log(error.message);
    return {
      error: `Произошла ошибка: ${error.message}`,
    };
  }
}

/***************************************************
  Вызываем pure функцию контракта
    
  Принимаем аргументы:
      contract - контракт из ethers.ethers.Contract
      funcName - название функции как в ABI
      args - аргументы в формате array
    
  Возвращаем значения:
      txResponse - результат выполнения выполнения функции
  ***************************************************/
async function _pureFunction(contract, funcName, args) {
  try {
    // Проверяем, существует ли функция с заданным именем
    if (!contract[funcName]) {
      console.error(`Contract does not have function ${funcName}`);
      return;
    }
    // Вызываем функцию с заданным именем, передавая аргументы
    const txResponse = !args
      ? await contract[funcName]()
      : await contract[funcName](...args);

    return {
      txResponse: txResponse,
    };
  } catch (error) {
    console.log(error.message);
    return {
      error: `Произошла ошибка: ${error.message}`,
    };
  }
}

// module.exports = { _callFunction, _pureFunction };
