document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["capturedImage", "extractedColors"], (data) => {
    let imageContainer = document.getElementById("capturedImageContainer");
    let colorContainer = document.getElementById("colorList");

    if (data.capturedImage) {
      let img = new Image();
      img.src = data.capturedImage;
      img.style.width = "100%";
      img.style.border = "1px solid #ddd";
      imageContainer.appendChild(img);
    } else {
      imageContainer.innerText = "캡처된 이미지 없음";
    }

    if (data.extractedColors && data.extractedColors.length > 0) {
      data.extractedColors.forEach((color) => {
        let colorBox = document.createElement("div");
        colorBox.classList.add("color-box");
        colorBox.style.backgroundColor = color;
        colorBox.innerText = color;
        colorContainer.appendChild(colorBox);
      });
    } else {
      colorContainer.innerText = "추출된 색상 없음";
    }
  });
});
