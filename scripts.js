
const SIZES = {
    ios: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
    ipad: [20, 29, 40, 58, 76, 80, 152, 167],
    macos: [16, 32, 64, 128, 256, 512, 1024],
    android: [36, 48, 72, 96, 144, 192],
    watchos: [48, 55, 58, 87, 80, 88, 172, 196, 216, 234, 258, 1024]
};

const ANDROID_NAMES = {
    36: 'ldpi',
    48: 'mdpi',
    72: 'hdpi',
    96: 'xhdpi',
    144: 'xxhdpi',
    192: 'xxxhdpi'
};


function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    document.getElementById('themeIcon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeIcon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';


document.getElementById('customCheck').onchange = (e) => {
    document.getElementById('customSizes').disabled = !e.target.checked;
};

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

let img = null;
let imgX = 0, imgY = 0;
let scale = 1;
let isDragging = false;
let prevX = 0, prevY = 0;
let bgColor = "#ffffff";
let rotation = 0;  

const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("upload");
const generateBtn = document.getElementById("generate");
const downloadBtn = document.getElementById("download");

dropArea.onclick = () => fileInput.click();

["dragenter", "dragover"].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        dropArea.classList.add("dragover");
    });
});

["dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        dropArea.classList.remove("dragover");
    });
});

dropArea.addEventListener("drop", e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) loadImageFile(file);
});

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) loadImageFile(file);
};

function loadImageFile(file) {
    img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.width;
        const ih = img.height;

        const scaleX = cw / iw;
        const scaleY = ch / ih;
        scale = Math.max(scaleX, scaleY);

        imgX = (cw - iw * scale) / 2;
        imgY = (ch - ih * scale) / 2;

        document.getElementById("scaleSlider").value = scale;
        document.getElementById("scaleValue").innerText = scale.toFixed(2);

        drawEditor();
        generateBtn.disabled = false;
    };
}

function drawEditor() {
    const transparent = document.getElementById("transparentBg").checked;

    if (!transparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (img) {
        ctx.save();
        const centerX = imgX + (img.width * scale) / 2;
        const centerY = imgY + (img.height * scale) / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
    }
}

document.getElementById("bgColor").oninput = (e) => {
    bgColor = e.target.value;
    drawEditor();
};

document.getElementById("transparentBg").onchange = () => {
    drawEditor();
};

document.getElementById("scaleSlider").oninput = (e) => {
    scale = parseFloat(e.target.value);
    document.getElementById("scaleValue").innerText = scale.toFixed(2);
    drawEditor();
};
document.getElementById("rotationSlider").oninput = (e) => {
    rotation = parseInt(e.target.value);
    document.getElementById("rotationValue").innerText = rotation + "°";
    drawEditor();
};

canvas.onmousedown = (e) => {
    isDragging = true;
    prevX = e.offsetX;
    prevY = e.offsetY;
};

canvas.onmouseup = () => {
    isDragging = false;
};

canvas.onmousemove = (e) => {
    if (isDragging) {
        imgX += e.offsetX - prevX;
        imgY += e.offsetY - prevY;
        prevX = e.offsetX;
        prevY = e.offsetY;
        drawEditor();
    }
};

function generateSize(size) {
    return new Promise(resolve => {
        const c = document.createElement("canvas");
        const cx = c.getContext("2d");
        c.width = c.height = size;

        const transparent = document.getElementById("transparentBg").checked;

        if (!transparent) {
            cx.fillStyle = bgColor;
            cx.fillRect(0, 0, size, size);
        }

        // if (img) {
        //     cx.save();
        //     cx.translate(
        //         imgX * (size / canvas.width),
        //         imgY * (size / canvas.height)
        //     );
        //     cx.scale(
        //         scale * (size / canvas.width),
        //         scale * (size / canvas.height)
        //     );
        //     cx.drawImage(img, 0, 0);
        //     cx.restore();
        // }
        if (img) {
            const imgWidth = img.width;
            const imgHeight = img.height;
            const scaleFactor = size / canvas.width;
            const drawWidth  = imgWidth  * scale * scaleFactor;
            const drawHeight = imgHeight * scale * scaleFactor;
            const finalX = (imgX * scaleFactor);
            const finalY = (imgY * scaleFactor);
            cx.save();
            cx.translate(finalX + drawWidth / 2, finalY + drawHeight / 2);
            cx.rotate(rotation * Math.PI / 180);
            cx.drawImage(
                img,
                -drawWidth / 2,
                -drawHeight / 2,
                drawWidth,
                drawHeight
            );
            cx.restore();
        }

        c.toBlob(blob => resolve({ size, blob }));
        downloadBtn.disabled = false;
    });
}

let zip = new JSZip();
document.getElementById("generate").onclick = async () => {
    if (!img) return alert("⚠️ Please upload an image first!");

    const selected = [...document.querySelectorAll(".platform-check:checked")]
        .map(c => c.value.trim().toLowerCase());

    if (selected.length === 0) {
        return alert("⚠️ Please select at least one platform.");
    }
    zip = new JSZip();
    const output = document.getElementById("output");
    output.innerHTML = "<p style='color: var(--text-secondary); width: 100%; text-align: center;'>Generating icons...</p>";

    try {
        for (let platform of selected) {
            let sizes = [];
            
            if (platform === 'custom') {
                const customInput = document.getElementById('customSizes').value;
                sizes = customInput.split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n) && n > 0);
                
                if (sizes.length === 0) {
                    alert("⚠️ Please enter valid custom sizes (e.g., 16, 32, 48)");
                    continue;
                }
            } else {
                sizes = SIZES[platform];
            }

            if (!sizes || sizes.length === 0) continue;

            const folder = zip.folder(platform);

            for (let size of sizes) {
                const { blob } = await generateSize(size);

                const filename = platform === 'android' && ANDROID_NAMES[size]
                    ? `ic_launcher_${ANDROID_NAMES[size]}_${size}.png`
                    : `${size}.png`;

                folder.file(filename, blob);
            }
        }

        // Generate preview after all icons are created
        output.innerHTML = "";
        for (let platform of selected) {
            let sizes = platform === 'custom' 
                ? document.getElementById('customSizes').value.split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n) && n > 0)
                : SIZES[platform];

            for (let size of sizes.slice(0, 6)) {
                const { blob } = await generateSize(size);
                const url = URL.createObjectURL(blob);
                
                const container = document.createElement("div");
                container.className = "preview-item";
                
                const im = document.createElement("img");
                im.src = url;
                im.width = Math.min(64, size);
                im.height = Math.min(64, size);
                
                const label = document.createElement("div");
                label.className = "preview-label";
                const iconName = platform === 'android' && ANDROID_NAMES[size]
                    ? `${ANDROID_NAMES[size]}`
                    : `${size}px`;
                label.textContent = `${platform}\n${iconName}`;
                
                container.appendChild(im);
                container.appendChild(label);
                output.appendChild(container);
            }
        }
    } catch (err) {
        console.error("Error:", err);
        alert("❌ An error occurred. Please try again.");
    }
};

document.getElementById("download").onclick = async () => {
    const zipFile = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipFile);
    a.download = "app-icons.zip";
    a.click();
    alert("✅ Icons generated successfully!");
}