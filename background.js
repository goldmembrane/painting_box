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
    chrome.tabs.captureVisibleTab(
      tab.windowId,
      { format: "png" },
      (imageSrc) => {
        if (chrome.runtime.lastError) {
          console.error("캡처 오류:", chrome.runtime.lastError.message);
          return;
        }

        // 🔹 웹페이지(content script)에서 `pickColorFromImage` 실행
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: pickColorMode, // 웹페이지에서 실행될 함수
          args: [imageSrc], // 캡처한 이미지 전달
        });
      }
    );
  }
});

function pickColorMode(imageSrc) {
  document.body.style.pointerEvents = "none";
  function rgbaToHex(r, g, b, a) {
    let hexCode = (value) => value.toString(16).padStart(2, "0");
    let alpha = a < 1 ? hexCode(Math.round(a * 255)) : "";
    return `#${hexCode(r)}${hexCode(g)}${hexCode(b)}${alpha}`.toUpperCase();
  }
  let img = new Image();
  img.src = imageSrc;

  img.onload = () => {
    // 🔹 캔버스를 생성하고, 캡처한 이미지를 그림
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    document.addEventListener(
      "click",
      (event) => {
        let x = event.clientX;
        let y = event.clientY;

        let pixel = ctx.getImageData(x, y, 1, 1).data;
        let hexColor = rgbaToHex(pixel[0], pixel[1], pixel[2], pixel[3] / 255);

        console.log("선택한 색상:", hexColor);

        chrome.runtime.sendMessage({
          action: "openPopupWithColor",
          color: hexColor,
        });

        document.body.style.pointerEvents = "auto";
      },
      { once: true }
    ); // 한 번만 실행되도록 설정
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openPopupWithColor") {
    chrome.storage.local.set({ pickedColor: message.color }, () => {
      console.log("색상이 저장되었습니다:", message.color);

      chrome.windows.getCurrent((currentWindow) => {
        let windowWidth = currentWindow.width || 1920;
        let windowHeight = currentWindow.height || 1080;

        chrome.windows.create({
          url: "popup.html",
          type: "popup",
          width: 350,
          height: windowHeight,
          top: 0,
          left: windowWidth - 350,
        });
      });
    });
  }
});
