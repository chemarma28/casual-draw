export function exportCanvasAsPNG(
    canvas: HTMLCanvasElement,
    fileName: string,
) {
    const imageUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");

    link.download = fileName;
    link.href = imageUrl;
    link.dataset.downloadurl = [
        "image/png",
        link.download,
        link.href,
    ].join(":");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
