import { StripedViewer } from "@striped-skins/viewer";

window.StripedViewer = StripedViewer;

if (typeof window.onStripedLoaded === 'function') {
  window.onStripedLoaded()
}
