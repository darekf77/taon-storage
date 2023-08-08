
export const keyValue = (classFun, memberName) => {
  // console.log('classname',classFun.name)
  const res = `firedev.localstorage.class.${classFun.name}.prop.${memberName}`
  return res;
}

export const keyDefaultValueAreadySet = (classFun, memberName) => {
  const res = keyValue(classFun, memberName) + 'defaultvalueisset';
  return res;
}


