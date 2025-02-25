window.startColorSelection = function () {
  let isDragging = false;
  let startX, startY, endX, endY;
  let selectionBox = document.createElement("div");

  selectionBox.style.position = "fixed";
  selectionBox.style.border = "2px dashed red";
  selectionBox.style.background = "rgba(255, 0, 0, 0.2)";
  selectionBox.style.pointerEvents = "none";
  selectionBox.style.zIndex = "9999";
  document.body.appendChild(selectionBox);

  document.addEventListener("mousedown", (event) => {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;

    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    endX = event.clientX;
    endY = event.clientY;

    selectionBox.style.left = `${Math.min(startX, endX)}px`;
    selectionBox.style.top = `${Math.min(startY, endY)}px`;
    selectionBox.style.width = `${Math.abs(endX - startX)}px`;
    selectionBox.style.height = `${Math.abs(endY - startY)}px`;
  });

  document.addEventListener("mouseup", (event) => {
    if (!isDragging) return;
    isDragging = false;
    document.body.removeChild(selectionBox);

    chrome.runtime.sendMessage({
      action: "captureScreen",
      area: { x1: startX, y1: startY, x2: endX, y2: endY },
    });
  });
};

window.extractColorsFromImage = function (imageSrc, x1, y1, x2, y2) {
  if (
    !imageSrc ||
    typeof imageSrc !== "string" ||
    !imageSrc.startsWith("data:image/png;base64")
  ) {
    console.error("❌ [ERROR] 올바르지 않은 이미지 데이터:", imageSrc);
    return;
  }

  let img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageSrc;

  img.onload = () => {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d", { willReadFrequently: true });

    let width = Math.abs(x2 - x1);
    let height = Math.abs(y2 - y1);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, -x1, -y1, img.width, img.height);

    let colors = new Set();
    for (let x = 0; x < width; x += 5) {
      for (let y = 0; y < height; y += 5) {
        let pixel = ctx.getImageData(x, y, 1, 1).data;
        let hexColor = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1]
          .toString(16)
          .padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
        colors.add(hexColor);
      }
    }

    chrome.runtime.sendMessage(
      {
        action: "saveExtractedColors",
        colors: Array.from(colors),
        image: canvas.toDataURL("image/png"),
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ [ERROR] popup.html 실행 실패:",
            chrome.runtime.lastError.message
          );
        } else if (response && response.success) {
          console.log("✅ popup.html 실행 성공");
        } else {
          console.error("❌ [ERROR] popup.html 실행 실패: 알 수 없는 오류");
        }
      }
    );
  };
};
