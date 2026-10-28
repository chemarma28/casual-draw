import { compile } from "./compile.js";

Prism.languages["cldlang"] = {
    "name": [
        /@\w[\w\d]*/
    ],
    "text": [
        /\([\w\d\ ]*\)/,
        /\[[\w\d\ ]*\]/
    ],
    "positive": [
        /(\|\|)?\+>/
    ],
    "negative": [
        /(\|\|)?->/
    ],
    "default": [
        /(\|\|)?>/
    ]
};

const editor = document.getElementById("editor");
const flask = new CodeFlask(editor, {
    language: "cldlang",
    lineNumbers: true,
    defaultTheme: false
});

flask.updateCode("@A1(1) > @A5(5) > @A2(2) +> A1;\n@A3(3) > @A4(4) > @A6(6) +> A3;\nA4 -> A2;");

const canvas = document.getElementById("canvas");

window.onresize = () => {
    setCanvasDimension();
    setCodeFlaskDimension();
    callToCompile();
}

window.addEventListener("load", eventWindowLoaded);

function setCodeFlaskDimension() {
    const container = document.getElementById("editor-container");
    const header = document.getElementById("editor-header");

    if (container != null) {
        const width = container.getBoundingClientRect().width;
        const height = container.getBoundingClientRect().height - (
            header ? header.getBoundingClientRect().height : 0
        );

        const flask = document.querySelector(".codeflask");
        flask.style.width = `${width}px`;
        flask.style.height = `${height}px`;
    }
}

function setCanvasDimension() {
    const canvasContainer = document.getElementById("canvas-container");
    const header = document.getElementById("canvas-header");

    if (canvasContainer != null) {
        const width = canvasContainer.getBoundingClientRect().width - 8;
        const height = canvasContainer.getBoundingClientRect().height - (
            header ? header.getBoundingClientRect().height : 0
        ) - 5;

        canvas.width = width;
        canvas.style.width = `${width}px`;

        canvas.height = height;
        canvas.style.height = `${height}px`;
    }
}

function eventWindowLoaded() {
    setCodeFlaskDimension();
    setCanvasDimension();
    callToCompile();
}

function callToCompile() {
    let code = flask.getCode();
    code += '\n';
    compile(code);
}

const compileButton = document.getElementById("compile-button");
compileButton.onclick = (e) => {
    callToCompile();
};

function exportCanvasAsPNG(id, fileName) {
    var canvasElement = document.getElementById(id);
    var MIME_TYPE = "image/png";
    var imgURL = canvasElement.toDataURL(MIME_TYPE);

    var dlLink = document.createElement('a');
    dlLink.download = fileName;
    dlLink.href = imgURL;
    dlLink.dataset.downloadurl = [MIME_TYPE, dlLink.download, dlLink.href].join(':');

    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
}

const exportButton = document.getElementById("export-button")
const exportButtonTooltip = document.getElementById("export-button-tooltip");

exportButton.onmouseover = (e) => {
    exportButtonTooltip.style.visibility = "visible";
    exportButtonTooltip.style.opacity = 0.8;
}

exportButton.onmouseout = (e) => {
    exportButtonTooltip.style.visibility = "hidden";
    exportButtonTooltip.style.opacity = 0;
}

exportButton.onclick = (e) => {
    const now = new Date();
    exportCanvasAsPNG("canvas", `causal-loop-${now.getDay()}-${now.getHours()}-${now.getSeconds()}`);
};




