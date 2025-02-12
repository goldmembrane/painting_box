// 확장 프로그램의 백그라운드 동작 구현
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pickColor",
    title: "색 추출 모드",
    contexts: ["all"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pickColor") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: confirmConsole,
    });
  }
});

function confirmConsole() {
  console.log("right click attached!");
}
