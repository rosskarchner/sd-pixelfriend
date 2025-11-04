# sd-pixelfriend

An MCP (Model Context Protocol) server that connects to a local [SD.Next](https://github.com/vladmandic/sdnext) instance to generate pixel art at various dimensions.

## Features

- 🎨 Generate pixel art using Stable Diffusion via SD.Next
- 📐 Multiple preset sizes (tiny, small, medium, large, icon, sprite, tile)
- 🔧 Custom dimensions support (16x16 to 1024x1024)
- ✨ Automatic prompt enhancement for pixel art style
- 🚀 Fast MCP tool integration for AI assistants

## Prerequisites

1. **Python 3.10 or higher**
2. **SD.Next running locally**
   - Install from: https://github.com/vladmandic/sdnext
   - Run the server (default: http://127.0.0.1:7860)
   - Ensure the API is accessible

## Installation

### Using uv (recommended)

```bash
# Install uv if you haven't already
pip install uv

# Install the package
uv pip install -e .
```

### Using pip

```bash
pip install -e .
```

## Usage

### Running the MCP Server

Start the server using the command line:

```bash
sd-pixelfriend
```

Or if you want to specify a custom SD.Next URL:

```bash
SDNEXT_URL=http://localhost:7860 sd-pixelfriend
```

### Using with MCP Clients

Configure your MCP client (like Claude Desktop or other MCP-compatible tools) to connect to this server.

Example configuration for Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sd-pixelfriend": {
      "command": "sd-pixelfriend"
    }
  }
}
```

Or with custom SD.Next URL:

```json
{
  "mcpServers": {
    "sd-pixelfriend": {
      "command": "sd-pixelfriend",
      "env": {
        "SDNEXT_URL": "http://localhost:7860"
      }
    }
  }
}
```

## Available Tools

### generate_pixel_art

Generate pixel art images using Stable Diffusion with optimized settings for pixel art style.

**Parameters:**

- `prompt` (required): Text description of the pixel art to generate
- `size` (optional): Preset size name - one of:
  - `tiny` (64x64)
  - `small` (128x128)
  - `medium` (256x256)
  - `large` (512x512)
  - `icon` (32x32)
  - `sprite` (48x48)
  - `tile` (16x16)
- `width` (optional): Custom width in pixels (16-1024), ignored if `size` is provided
- `height` (optional): Custom height in pixels (16-1024), ignored if `size` is provided
- `steps` (optional): Number of diffusion steps (1-150, default: 20)
- `negative_prompt` (optional): Things to avoid in the generated image (default: "blurry, smooth, realistic, photography, 3d")

**Example Usage:**

```
Generate a pixel art spaceship at small size
```

The tool automatically enhances prompts with pixel art keywords like "pixel art", "pixelated", "retro game art", etc.

## Development

### Project Structure

```
sd-pixelfriend/
├── src/
│   └── sd_pixelfriend/
│       ├── __init__.py
│       └── server.py
├── pyproject.toml
└── README.md
```

### Running from Source

```bash
# Install in development mode
pip install -e .

# Run the server
python -m sd_pixelfriend.server
```

## Troubleshooting

### Connection Error

If you get a connection error:
1. Ensure SD.Next is running: `http://127.0.0.1:7860` should be accessible
2. Check if the port is correct (default is 7860)
3. Set the correct URL: `SDNEXT_URL=http://your-host:port sd-pixelfriend`

### Image Generation Issues

- Increase `steps` parameter for better quality (trade-off: slower generation)
- Adjust the `negative_prompt` to avoid unwanted styles
- Try different preset sizes or custom dimensions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.