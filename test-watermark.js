import fs from 'fs';
import md5 from 'md5';

const WATERMARK_SIGNATURE = new Set([
  "05d9c225b1c01e2ea0227c309f79d9ad",
  "07c40c2ee8917bd9069caa224a12aaf9",
  "129470b66530f380cd5b40d458f9e323",
  "2e909613f21a95eb2104ff51865ed6f7",
  "3803cd97ee915fd8526065ea7630bb00",
  "52625e97df31e910499fb0301e9191d6",
  "5304838a6ef558af9e2d284f1dca1fd6",
  "691542265067105381fae3d61dc9cdb3",
  "70c6ff294a5cb344e3f0f355ef55633d",
  "7d522cd0393621a1e027def0b4dde444",
  "8a55640f8147964a28f563e52158b8d5",
  "8f9506976d24a9c307c911a7dad4ff40",
  "94174f804c0cd4845d243a8c216513d4",
  "a01b689404860fb30a9011f6e386e113",
  "a062facd05f8c4a26b95784329d8038b",
  "a6c6d3c6d38df3dadf6433b2b6f4448f",
  "ab6bbb6672163dccd2e53e7d8da91708",
  "b9833fcec09914d20178f5635ba53349",
  "bf0c0048edc91f6079646bd7960c691b",
  "d0a7c7204d917c2a734013a73a4bd349",
  "e07f88b5c03294dff873626accb4d1fd",
  "fa1ff2474438e782b4c2a319a177a143",
  // Including the hashes generated locally
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
  "d33d94e1ccecbfb105f6055bbda8b581"
]);

const json = JSON.parse(fs.readFileSync('/Users/harsh.patel1/Downloads/Water mark.json', 'utf8'));

export const processLottie = (originalJson) => {
  try {
    const json = typeof originalJson === 'string' ? JSON.parse(originalJson) : originalJson;
    const result = {
      watermarksRemoved: 0,
      pathsRemoved: 0
    };

    function isWatermarkLayer(layer) {
      if (!layer || typeof layer !=='object') return false;
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

      // If this specific parent node contains >= 60% watermark paths
      return (match / paths.length) > 0.6;
    }

    // A layer might be nested inside other arrays/objects depending on the file structure.
    // So we traverse all objects that have a "ty" and an "it" (items array) or "layers" (child layers)
    function stripWatermarks(node) {
      if (!node) return;
      
      // If node is an array, map over it
      if (Array.isArray(node)) {
         for (let i = node.length - 1; i >= 0; i--) {
            if (isWatermarkLayer(node[i])) {
               result.watermarksRemoved++;
               node.splice(i, 1);
            } else {
               stripWatermarks(node[i]);
            }
         }
      } else if (typeof node === 'object') {
          // If the object itself has an array of child layers or shapes, filter those.
          // In Lottie, nested elements are typically under 'layers' or 'it' (items inside shapes) or 'assets'
          ['layers', 'it', 'assets'].forEach(arrKey => {
             if (Array.isArray(node[arrKey])) {
                 for (let i = node[arrKey].length - 1; i >= 0; i--) {
                    if (isWatermarkLayer(node[arrKey][i])) {
                       result.watermarksRemoved++;
                       node[arrKey].splice(i, 1);
                    } else {
                       stripWatermarks(node[arrKey][i]);
                    }
                 }
             }
          });
          
          // recursively check other properties too just in case
          Object.values(node).forEach(child => {
             if (child !== node['layers'] && child !== node['it'] && child !== node['assets']) {
                stripWatermarks(child);
             }
          });
      }
    }

    // Traverse starting from root
    stripWatermarks(json);

    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const processed = processLottie(json);
console.log(processed);
