import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

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
  console.log("Tools available:", tools);
  
  // Try to call the tool to get file details
  try {
     const result = await client.callTool({
       name: "figma_get_file", 
       arguments: { url: "https://www.figma.com/design/1O3IhJ8yDJLtxY0aAwIcEZ/Lottieney?node-id=1-38&m=dev" }
     });
     console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e) {
     console.error("Tool call failed", e);
  }
  process.exit(0);
}
main().catch(console.error);
