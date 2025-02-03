// 확장 프로그램의 백그라운드 동작 구현
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});
