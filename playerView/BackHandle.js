/**
 * Created by aolc on 2018/5/22.
 */

let backFunctionKeys = [];
let backFunctionsMap = new Map();

function removeIndex(array, index) {
  let newArray = [];
  for (let i = 0; i < array.length; i++) {
    if (i !== index) {
      newArray.push(array[i]);
    }
  }
  return newArray;
}

function removeKey(array, key) {
  let newArray = [];
  for (let i = 0; i < array.length; i++) {
    if (array[i] !== key) {
      newArray.push(array[i]);
    }
  }
  return newArray;
}

const handleBack = () => {
  if (backFunctionKeys.length > 0) {
    let functionKey = backFunctionKeys[backFunctionKeys.length - 1];
    backFunctionKeys = removeIndex(backFunctionKeys, backFunctionKeys.length - 1);
    let functionA = backFunctionsMap.get(functionKey);
    backFunctionsMap.delete(functionKey);
    functionA && functionA();
    return false;
  }
  return true;
};

const addBackFunction = (key, functionA) => {
  backFunctionsMap.set(key, functionA);
  backFunctionKeys.push(key);
};

const removeBackFunction = key => {
  backFunctionKeys = removeKey(backFunctionKeys, key);
  backFunctionsMap.delete(key);
};

export default {
  handleBack,
  addBackFunction,
  removeBackFunction,
};
