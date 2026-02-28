import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import util from "util";

async function main() {
    const transport = new SSEClientTransport(new URL("http://127.0.0.1:3845/sse"));
    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    await client.connect(transport);

    const tools = await client.listTools();

    try {
        const result = await client.callTool({
            name: "figma_get_file_url",
            arguments: { url: "https://www.figma.com/design/1O3IhJ8yDJLtxY0aAwIcEZ/Lottieney?node-id=1-38&m=dev" }
        });
        console.log(util.inspect(result, { showHidden: false, depth: null, colors: false }));
    } catch (e) {
        try {
            const result2 = await client.callTool({
                name: "figma_get_file",
                arguments: { url: "https://www.figma.com/design/1O3IhJ8yDJLtxY0aAwIcEZ/Lottieney?node-id=1-38&m=dev" }
            });
            console.log(util.inspect(result2, { showHidden: false, depth: null, colors: false }));
        } catch (e2) {
            console.error("Tool call failed", e, e2, "Available tools:", tools);
        }
    }
    process.exit(0);
}
main().catch(console.error);
