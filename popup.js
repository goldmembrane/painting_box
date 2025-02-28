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
      let sortedColors = clusterColors(data.extractedColors, 5); // ✅ 5개의 색상 그룹으로 클러스터링

      sortedColors.forEach((group, index) => {
        let groupContainer = document.createElement("div");
        groupContainer.classList.add("color-group");

        // ✅ 그룹 대표 색상 계산 (평균 색상)
        let representativeColor = calculateAverageColor(group);

        // ✅ 그룹 제목 및 펼치기 버튼 추가
        let header = document.createElement("div");
        header.classList.add("group-header");

        let colorPreview = document.createElement("div");
        colorPreview.classList.add("color-preview");
        colorPreview.style.backgroundColor = representativeColor;

        let title = document.createElement("span");
        title.innerText = `그룹 ${index + 1}`;

        let toggleButton = document.createElement("button");
        toggleButton.innerText = "펼치기";
        toggleButton.classList.add("toggle-button");
        toggleButton.onclick = () => {
          if (colorListContainer.style.display === "none") {
            colorListContainer.style.display = "flex";
            toggleButton.innerText = "접기";
          } else {
            colorListContainer.style.display = "none";
            toggleButton.innerText = "펼치기";
          }
        };

        header.appendChild(colorPreview);
        header.appendChild(title);
        header.appendChild(toggleButton);
        groupContainer.appendChild(header);

        // ✅ 색상 리스트 컨테이너 (기본적으로 숨김)
        let colorListContainer = document.createElement("div");
        colorListContainer.classList.add("color-list-container");
        colorListContainer.style.display = "none";

        group.forEach((color) => {
          let colorBoxContainer = document.createElement("div");
          colorBoxContainer.classList.add("color-box-container");

          let colorBox = document.createElement("div");
          colorBox.classList.add("color-box");
          colorBox.style.backgroundColor = color;

          let rgb = hexToRgb(color);
          let rgbText = `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

          let textBox = document.createElement("div");
          textBox.classList.add("color-text");
          textBox.innerText = `${color}\n${rgbText}`;

          colorBoxContainer.appendChild(colorBox);
          colorBoxContainer.appendChild(textBox);
          colorListContainer.appendChild(colorBoxContainer);
        });

        groupContainer.appendChild(colorListContainer);
        colorContainer.appendChild(groupContainer);
      });
    } else {
      colorContainer.innerText = "추출된 색상 없음";
    }
  });
});

// ✅ 그룹의 대표 색상(평균값) 계산
function calculateAverageColor(colorGroup) {
  let rgbColors = colorGroup.map(hexToRgb);
  let avgColor = rgbColors.reduce(
    (acc, val) => acc.map((v, i) => v + val[i]),
    [0, 0, 0]
  );
  avgColor = avgColor.map((v) => Math.round(v / colorGroup.length));
  return rgbToHex(avgColor);
}

function clusterColors(colors, numClusters) {
  let rgbColors = colors.map(hexToRgb);

  // ✅ K-Means 클러스터링 적용
  let clusters = kMeans(rgbColors, numClusters);

  // ✅ 클러스터별 정렬
  return clusters.map((cluster) => cluster.map(rgbToHex));
}

// ✅ HEX → RGB 변환
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  let bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// ✅ RGB → HEX 변환
function rgbToHex(rgb) {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ✅ K-Means 클러스터링 알고리즘
function kMeans(data, k) {
  let centroids = data.slice(0, k); // 초기 중심점 선택
  let prevCentroids = [];
  let clusters = new Array(k).fill().map(() => []);

  while (!arraysEqual(centroids, prevCentroids)) {
    clusters = new Array(k).fill().map(() => []);

    // ✅ 각 데이터 포인트를 가장 가까운 중심점에 할당
    data.forEach((point) => {
      let distances = centroids.map((centroid) =>
        euclideanDistance(point, centroid)
      );
      let clusterIndex = distances.indexOf(Math.min(...distances));
      clusters[clusterIndex].push(point);
    });

    prevCentroids = centroids;
    centroids = clusters.map((cluster) => calculateCentroid(cluster));
  }

  return clusters;
}

// ✅ 유클리드 거리 계산
function euclideanDistance(p1, p2) {
  return Math.sqrt(
    p1.reduce((sum, value, index) => sum + (value - p2[index]) ** 2, 0)
  );
}

// ✅ 클러스터 중심 계산
function calculateCentroid(cluster) {
  if (cluster.length === 0) return [0, 0, 0];
  let sum = cluster.reduce((acc, val) => acc.map((v, i) => v + val[i]));
  return sum.map((v) => Math.round(v / cluster.length));
}

// ✅ 두 배열이 같은지 비교
function arraysEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
