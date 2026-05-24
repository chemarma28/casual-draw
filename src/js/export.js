export function exportCanvasAsPNG(canvas, dist) {
    const imgURL = canvas.toDataURL("image/png");

    const link = document.createElement('a');

    link.download = dist;
    link.href = imgURL;
    link.dataset.downloadurl = [MIME_TYPE, link.download, link.href].join(':');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}