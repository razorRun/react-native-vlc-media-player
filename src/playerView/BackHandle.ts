/**
 * Created by aolc on 2018/5/22.
 */

type BackFunction = () => void;

let backFunctionKeys: string[] = [];
const backFunctionsMap = new Map<string, BackFunction>();

const handleBack = (): boolean => {
  if (backFunctionKeys.length > 0) {
    const functionKey = backFunctionKeys[backFunctionKeys.length - 1]!;
    backFunctionKeys = backFunctionKeys.slice(0, -1);
    const backFunction = backFunctionsMap.get(functionKey);
    backFunctionsMap.delete(functionKey);
    backFunction?.();
    return false;
  }
  return true;
};

const addBackFunction = (key: string, backFunction: BackFunction): void => {
  backFunctionsMap.set(key, backFunction);
  backFunctionKeys.push(key);
};

const removeBackFunction = (key: string): void => {
  backFunctionKeys = backFunctionKeys.filter((item) => item !== key);
  backFunctionsMap.delete(key);
};

export default {
  handleBack,
  addBackFunction,
  removeBackFunction,
};
