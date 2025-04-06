window.startColorSelection = function () {
  let isDragging = true;
  let startX, startY;
  let selectionBox = null;

  // // ✅ 기존 마우스 이벤트 방지
  // document.body.style.pointerEvents = "none";
  // document.addEventListener("mousedown", onMouseDown, true);
  // document.addEventListener("mousemove", onMouseMove, true);
  // document.addEventListener("mouseup", onMouseUp, true);
  // document.addEventListener("click", preventDefault, true);
  // document.addEventListener("contextmenu", preventDefault, true);
  // document.addEventListener("wheel", preventDefault, { passive: false });

  // // ✅ 커서 스타일 변경
  // document.body.style.cursor = "crosshair";

  // ✅ 전체 화면 덮는 오버레이 생성
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.cursor = "crosshair"; // ✅ 커서 지정
  overlay.style.zIndex = "9998";
  overlay.style.backgroundColor = "rgba(0,0,0,0)"; // 완전 투명
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", onMouseDown, true);
  overlay.addEventListener("mousemove", onMouseMove, true);
  overlay.addEventListener("mouseup", onMouseUp, true);

  function onMouseDown(event) {
    if (!isDragging) return;

    event.preventDefault();
    startX = event.clientX;
    startY = event.clientY;

    // ✅ 선택 영역 박스 생성
    if (!selectionBox) {
      selectionBox = document.createElement("div");
      selectionBox.style.position = "absolute";
      selectionBox.style.pointerEvents = "none"; // ✅ 선택 영역 내에서도 이벤트 차단
      selectionBox.style.border = "1px dashed gray";
      selectionBox.style.zIndex = "9999";
      document.body.appendChild(selectionBox);
    }

    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
  }

  function onMouseMove(event) {
    if (!isDragging || !selectionBox) return;

    event.preventDefault();

    let width = event.clientX - startX;
    let height = event.clientY - startY;

    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${Math.min(startX, event.clientX)}px`;
    selectionBox.style.top = `${Math.min(startY, event.clientY)}px`;
  }

  function onMouseUp(event) {
    if (!isDragging) return;

    event.preventDefault();

    let endX = event.clientX;
    let endY = event.clientY;

    console.log(`🎯 선택된 영역: (${startX}, ${startY}) → (${endX}, ${endY})`);

    // ✅ 마우스 이벤트 원상 복구
    stopSelectionMode();

    // ✅ 선택된 영역을 전달
    chrome.runtime.sendMessage({
      action: "captureScreen",
      area: { x1: startX, y1: startY, x2: endX, y2: endY },
    });

    // ✅ 선택 박스 제거
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }

    if (overlay) {
      overlay.remove();
    }
  }

  function stopSelectionMode() {
    document.body.style.pointerEvents = "auto";
    document.body.style.cursor = "default";

    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mouseup", onMouseUp, true);
    document.removeEventListener("click", preventDefault, true);
    document.removeEventListener("contextmenu", preventDefault, true);
    document.removeEventListener("wheel", preventDefault, { passive: false });
  }

  function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
  }
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
