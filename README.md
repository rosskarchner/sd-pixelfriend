# SD PixelFriend 🎮🎨

An MCP (Model Context Protocol) server that connects to your local SDNext (Stable Diffusion Next) instance to generate pixel art at various dimensions.

## Features

- 🎨 Generate retro-style pixel art using Stable Diffusion
- 🎮 Configurable bit styles: 8-bit, 16-bit, or 32-bit aesthetics
- 📐 Multiple dimension presets (tiny, small, medium, large, wide, tall)
- 🎯 Custom dimensions support
- 🔧 Configurable generation parameters (steps, CFG scale, seed)
- 🚀 Easy integration with Claude Desktop and other MCP clients

## Prerequisites

1. **SDNext**: You need a local instance of [SDNext](https://github.com/vladmandic/automatic) running
   - Download and install SDNext
   - Start the web UI with API enabled (it's enabled by default)
   - The default URL is `http://127.0.0.1:7860`

2. **Node.js**: Version 18 or higher

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd sd-pixelfriend
```

2. Install dependencies:
```bash
npm install
```

3. Make the script executable (optional):
```bash
chmod +x index.js
```

## Configuration

### Environment Variables

- `SDNEXT_URL`: The URL of your SDNext instance (default: `http://127.0.0.1:7860`)

You can set this in your shell or MCP client configuration:
```bash
export SDNEXT_URL=http://localhost:7860
```

## Usage

### Standalone Testing

You can test the server directly:
```bash
npm start
```

### Claude Desktop Integration

Add this to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sd-pixelfriend": {
      "command": "node",
      "args": ["/absolute/path/to/sd-pixelfriend/index.js"],
      "env": {
        "SDNEXT_URL": "http://127.0.0.1:7860"
      }
    }
  }
}
```

After updating the configuration, restart Claude Desktop.

## MCP Tool: generate_pixel_art

Generate pixel art images with various options.

### Parameters

- **prompt** (required): Description of the pixel art to generate
  - Example: "a dragon", "a castle", "a forest scene"

- **bit_style** (optional): Bit depth style for the pixel art aesthetic
  - Options: `8bit` (NES/Game Boy era), `16bit` (SNES/Genesis era), `32bit` (PlayStation/Saturn era)
  - Default: `8bit`

- **size** (optional): Preset dimension size
  - Options: `tiny` (64x64), `small` (128x128), `medium` (256x256), `large` (512x512), `wide` (512x256), `tall` (256x512), `custom`
  - Default: `medium`

- **width** (optional): Custom width in pixels (only for size='custom')

- **height** (optional): Custom height in pixels (only for size='custom')

- **negative_prompt** (optional): Things to avoid in the generation
  - Default: "blurry, blur, realistic, photorealistic, detailed, high resolution, smooth, anti-aliased"

- **steps** (optional): Number of sampling steps
  - Default: 20
  - Range: 1-150 (higher = better quality but slower)

- **cfg_scale** (optional): CFG scale for prompt adherence
  - Default: 7.0
  - Range: 1-30 (higher = more faithful to prompt)

- **seed** (optional): Random seed for reproducibility
  - Default: -1 (random)
  - Use a specific number to reproduce the same image

### Example Usage in Claude

Once configured, you can ask Claude:

```
Generate a pixel art of a medieval castle at medium size
```

```
Create a 16bit pixel art sprite of a wizard
```

```
Make a wide 32bit pixel art landscape of a sunset over mountains
```

```
Generate an 8bit pixel art robot with custom dimensions 320x320
```

```
Create a large 16bit pixel art character in SNES style
```

## How It Works

1. The MCP server receives a generation request with your prompt
2. It enhances the prompt with pixel art keywords (e.g., "pixel art", "8bit/16bit/32bit", "retro", "pixelated")
3. It adds negative prompts to avoid smooth/realistic rendering
4. It sends the request to your local SDNext API endpoint
5. SDNext generates the image using Stable Diffusion
6. The server returns the generated pixel art image to the MCP client

## Troubleshooting

### "Failed to connect to SDNext"

- Ensure SDNext is running and accessible
- Check the URL is correct (default: `http://127.0.0.1:7860`)
- Verify the API is enabled in SDNext settings
- Try accessing `http://127.0.0.1:7860/sdapi/v1/sd-models` in your browser

### "No images generated"

- Check SDNext logs for errors
- Ensure you have a Stable Diffusion model loaded in SDNext
- Try with simpler prompts first
- Verify SDNext is not out of memory

### Connection refused

- Make sure SDNext is actually running
- Check if another application is using port 7860
- Try restarting SDNext

## Tips for Better Pixel Art

1. **Use clear, simple prompts**: "a cat", "a tree", "a spaceship"
2. **Choose the right bit style**: 8bit for classic retro look, 16bit for more colors and detail, 32bit for smoother gradients while keeping the pixel art aesthetic
3. **Match size to bit style**: 8bit works great with tiny/small sizes (64x64, 128x128), while 16bit and 32bit shine at medium/large sizes
4. **Specify additional style keywords**: You can add era-specific terms like "Game Boy style" (8bit), "SNES style" (16bit), or "PS1 style" (32bit)
5. **Experiment with seeds**: Save seeds of images you like to generate similar variations
6. **Use appropriate models**: Some SD models work better for pixel art (look for pixel art or sprite-focused models)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Acknowledgments

- [SDNext](https://github.com/vladmandic/automatic) for the Stable Diffusion web UI
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- The Stable Diffusion community
