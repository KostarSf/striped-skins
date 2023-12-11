export function getSafeSkinUrl(url: string | null) {
  if (!url) return null;

  if (url.startsWith("https://") || url.startsWith("http://")) {
    return "/skin-proxy?url=" + url;
  }

  return url;
}

export function getViewerCanvasWrapper() {
  return document.querySelector("#viewer-canvas") as HTMLDivElement | null;
}
