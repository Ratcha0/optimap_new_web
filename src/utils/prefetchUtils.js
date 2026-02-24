
export const prefetchRouteTiles = (path, zoomLevels = [16, 17, 18]) => {
    if (!path || path.length === 0 || !navigator.serviceWorker?.controller) return;

    const tiles = new Set();
    const mapUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    path.forEach(point => {
        zoomLevels.forEach(z => {
            const x = Math.floor((point[1] + 180) / 360 * Math.pow(2, z));
            const y = Math.floor((1 - Math.log(Math.tan(point[0] * Math.PI / 180) + 1 / Math.cos(point[0] * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
            
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const sub = ['a', 'b', 'c'][Math.abs(x + dx + y + dy) % 3];
                    const url = mapUrl
                        .replace('{s}', sub)
                        .replace('{z}', z)
                        .replace('{x}', x + dx)
                        .replace('{y}', y + dy)
                        .replace('{r}', '');
                    tiles.add(url);
                }
            }
        });
    });

   
    const tileList = Array.from(tiles).slice(0, 500);
    navigator.serviceWorker.controller.postMessage({
        type: 'PREFETCH_TILES',
        urls: tileList
    });
};
