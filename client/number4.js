/* 1-> "0001" */
export function number4(i) {
  const s = "0000" + i;
  return s.substr(Math.min(4, s.length - 4));
}
