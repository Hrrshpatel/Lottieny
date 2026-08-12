import md5 from 'md5';

export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const WATERMARK_SIGNATURE = new Set([
    // Lottielab Watermark Signatures
    "c5bc8fdda61830d96be4874ab959f66a",
    "5a43f5f674f0bad3c21f9e5c95fee0b0",
    "14fa378de772d8a7b1686bbd0b6edf37",
    "824f111936c41309fbac6b6644d57ab2",
    "280f03995e8ae643601a7f2e5b1ef2db",
    "2efd55e252cb5d4866158358694fd960",
    "d47f6331994c1d5c39c69ef962dc682c",
    "7a0f068fbfab214b01071377668c0696",
    "a7c8cd59ce47970d88166f2c7e4d6662",
    "40419e40669a4daf863598ddfd141cef",
    "bd7e9e19bc6c42e9dd128c01178a05d6",
    "8335c59e9d830fe77a1119bc6ff978a2",
    "57c3651bf0dfe8e1035cddee72138954",
    "2de4dcedf18eacdc24c602b76b0747d0",
    "b3b173abf944df4a7ef8e8271f690576",
    "581dc1b0ab8b35246ae99605d0199db4",
    "cd5a33e1591ec00e9e45e9544c89ef4c",
    "167ede7a1bf7e3b8401fd19ae334b2f9",
    "0ed3d5f0427e7331dd451d7477d219a6",
    "e006ff964315836518cae396a13a9b12",
    "679f6411be05919ab16aa1ef433d5594",
    "d33d94e1ccecbfb105f6055bbda8b581",
    // Jitter Watermark Signatures
    "fe99ab48db28cfff54a9c9bb4f31e119",
    "bc9aaf2ce4e62b085d41bcd96bf7353c",
    "aba0a5d781e1879ad8daa97ff0d60bc9",
    "2d1d34ca0364381b0ebb0fdf4ea9a403",
    "95e496ea09c2c4be5b24cc0ecb72a950",
    "d455cd4482bf6b143039b55c2ae58972",
    "781322cb4331a1ec1fe3dad12645b113",
    "49a77f5b24cb6e52ad79e69c7b241d70",
    "cb7fc2511dc4c4657cfdbf52f4deb6c6",
    "1594a4f65244877499c37967ae2319a4",
    "f9398ecaf6ebb435125986cb3269082e",
    "6cd0c95221fad00bab7792d58f44f329",
    "c0c518170a18ab09ed8e141ce1dc22ee",
    "2c0bb96497453575b6278523eb7b4d4d",
    "eeb7f20d0dc7b3f8c9bd1eab6345dfcb",
    "e1b57617f6b58f5d882a3682f20341cc",
    "caffe3b243965623a64a00ed4724a1e8",
    "456889588e05897c422df564cf17cdf5",
    "8a9e5a970aefbd9bee36ab53b27e381a"
]);

function isWatermarkLayer(layer) {
    const paths = [];

    function scan(obj) {
        if (!obj) return;

        if (Array.isArray(obj)) {
            obj.forEach(scan);
            return;
        }

        if (typeof obj !== "object") return;

        if (obj.ty === "sh" && obj.ks && obj.ks.k) {
            const str = JSON.stringify(obj.ks.k).slice(0, 500);
            const hash = md5(str);
            paths.push(hash);
        }

        Object.values(obj).forEach(scan);
    }

    scan(layer);

    if (!paths.length) return false;

    let match = 0;
    for (const p of paths) {
        if (WATERMARK_SIGNATURE.has(p)) match++;
    }

    return (match / paths.length) > 0.6;
}

export const processLottie = (originalJson) => {
    try {
        const json = JSON.parse(originalJson);
        const result = {
            watermarksRemoved: 0,
            optimizationReduction: 0,
            success: true,
            error: null,
            data: null,
            pathsRemoved: 0,
        };

        const removedAssetIds = new Set();

        function stripWatermarks(node) {
            if (!node) return;

            // If node is an array, we iterate backwards and remove matches
            if (Array.isArray(node)) {
                for (let i = node.length - 1; i >= 0; i--) {
                    if (isWatermarkLayer(node[i])) {
                        if (node[i].id) {
                            removedAssetIds.add(node[i].id);
                        }
                        result.watermarksRemoved++;
                        result.pathsRemoved++;
                        node.splice(i, 1);
                    } else {
                        stripWatermarks(node[i]);
                    }
                }
            } else if (typeof node === 'object') {
                ['layers', 'it', 'assets'].forEach(arrKey => {
                    if (Array.isArray(node[arrKey])) {
                        for (let i = node[arrKey].length - 1; i >= 0; i--) {
                            if (isWatermarkLayer(node[arrKey][i])) {
                                if (node[arrKey][i].id) {
                                    removedAssetIds.add(node[arrKey][i].id);
                                }
                                result.watermarksRemoved++;
                                result.pathsRemoved++;
                                node[arrKey].splice(i, 1);
                            } else {
                                stripWatermarks(node[arrKey][i]);
                            }
                        }
                    }
                });

                Object.values(node).forEach(child => {
                    if (child !== node['layers'] && child !== node['it'] && child !== node['assets'] && typeof child === 'object') {
                        stripWatermarks(child);
                    }
                });
            }
        }

        // Traverse starting from root to strip watermarks hierarchically 
        stripWatermarks(json);

        // Cleanup dangling asset & layer references caused by removing watermark assets
        if (removedAssetIds.size > 0) {
            let changed = true;
            while (changed) {
                changed = false;

                // Check assets array for any asset referencing a removed asset
                if (Array.isArray(json.assets)) {
                    for (let i = json.assets.length - 1; i >= 0; i--) {
                        const asset = json.assets[i];
                        const referencesRemoved = asset.layers?.some(l => l.refId && removedAssetIds.has(l.refId));
                        if (referencesRemoved) {
                            removedAssetIds.add(asset.id);
                            json.assets.splice(i, 1);
                            changed = true;
                        }
                    }
                }

                // Check layers array for any layer referencing a removed asset
                const checkLayers = (layerArr) => {
                    if (!Array.isArray(layerArr)) return;
                    for (let i = layerArr.length - 1; i >= 0; i--) {
                        const layer = layerArr[i];
                        if (layer.refId && removedAssetIds.has(layer.refId)) {
                            layerArr.splice(i, 1);
                            changed = true;
                        } else if (layer.layers) {
                            checkLayers(layer.layers);
                        }
                    }
                };

                checkLayers(json.layers);
                if (Array.isArray(json.assets)) {
                    json.assets.forEach(a => checkLayers(a.layers));
                }
            }
        }

        // Optimization: traverse surviving JSON and shrink decimals deterministically
        const processNode = (node) => {
            if (!node) return node;
            if (Array.isArray(node)) {
                return node.map(processNode);
            } else if (typeof node === 'object') {
                const newNode = {};
                for (const [key, value] of Object.entries(node)) {
                    newNode[key] = processNode(value);
                }
                return newNode;
            } else if (typeof node === 'number') {
                return Number(node.toFixed(3));
            }
            return node;
        };

        result.data = processNode(json);

        return result;
    } catch (err) {
        return { success: false, error: err.message };
    }
};
