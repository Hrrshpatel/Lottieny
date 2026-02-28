import sys

target = "src/App.jsx"
with open(target, "r") as f:
    c = f.read()

old_dl = """  const handleDownload = () => {
    if (!cleanedData) return;
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanedData));
    const baseName = originalFile?.name ? originalFile.name.replace('.json', '') : 'animation';
    a.download = `Clean_${baseName}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  };"""

new_dl = """  const handleDownload = () => {
    if (!cleanedData) return;
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanedData));
    a.download = `Clean_${originalFile?.name || 'animation.json'}`;
    document.body.appendChild(a); a.click(); a.remove();
  };"""

c = c.replace(old_dl, new_dl)

with open(target, "w") as f:
    f.write(c)
print("Done")
