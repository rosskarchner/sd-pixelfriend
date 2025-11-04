"""MCP server for generating pixel art using sdnext."""

import asyncio
import base64
import io
import logging
import os
from typing import Optional

import requests
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool, ImageContent
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default sdnext URL
DEFAULT_SDNEXT_URL = "http://127.0.0.1:7860"

# Common pixel art dimensions (width x height)
PIXEL_ART_PRESETS = {
    "tiny": (64, 64),
    "small": (128, 128),
    "medium": (256, 256),
    "large": (512, 512),
    "icon": (32, 32),
    "sprite": (48, 48),
    "tile": (16, 16),
}


class PixelFriendServer:
    """MCP server for pixel art generation."""

    def __init__(self, sdnext_url: str = DEFAULT_SDNEXT_URL):
        """Initialize the server.
        
        Args:
            sdnext_url: URL of the sdnext instance
        """
        self.sdnext_url = sdnext_url
        self.server = Server("sd-pixelfriend")
        self._setup_handlers()

    def _setup_handlers(self):
        """Set up MCP request handlers."""

        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            """List available tools."""
            return [
                Tool(
                    name="generate_pixel_art",
                    description=(
                        "Generate pixel art using Stable Diffusion. "
                        "Creates images optimized for pixel art style at various dimensions. "
                        f"Available preset sizes: {', '.join(PIXEL_ART_PRESETS.keys())}. "
                        "You can also specify custom width and height."
                    ),
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "Text description of the pixel art to generate",
                            },
                            "size": {
                                "type": "string",
                                "description": (
                                    f"Preset size name ({', '.join(PIXEL_ART_PRESETS.keys())}). "
                                    "If provided, width and height are ignored."
                                ),
                                "enum": list(PIXEL_ART_PRESETS.keys()),
                            },
                            "width": {
                                "type": "integer",
                                "description": "Custom width in pixels (ignored if size is provided)",
                                "default": 256,
                                "minimum": 16,
                                "maximum": 1024,
                            },
                            "height": {
                                "type": "integer",
                                "description": "Custom height in pixels (ignored if size is provided)",
                                "default": 256,
                                "minimum": 16,
                                "maximum": 1024,
                            },
                            "steps": {
                                "type": "integer",
                                "description": "Number of diffusion steps (higher = better quality but slower)",
                                "default": 20,
                                "minimum": 1,
                                "maximum": 150,
                            },
                            "negative_prompt": {
                                "type": "string",
                                "description": "Things to avoid in the generated image",
                                "default": "blurry, smooth, realistic, photography, 3d",
                            },
                        },
                        "required": ["prompt"],
                    },
                )
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict) -> list[TextContent | ImageContent]:
            """Handle tool calls."""
            if name != "generate_pixel_art":
                raise ValueError(f"Unknown tool: {name}")

            return await self._generate_pixel_art(arguments)

    async def _generate_pixel_art(self, args: dict) -> list[TextContent | ImageContent]:
        """Generate pixel art using sdnext.
        
        Args:
            args: Tool arguments containing prompt, size/dimensions, etc.
            
        Returns:
            List of content items (text and image)
        """
        prompt = args["prompt"]
        
        # Determine dimensions
        if "size" in args and args["size"]:
            width, height = PIXEL_ART_PRESETS[args["size"]]
            size_desc = f"{args['size']} ({width}x{height})"
        else:
            width = args.get("width", 256)
            height = args.get("height", 256)
            size_desc = f"{width}x{height}"
        
        steps = args.get("steps", 20)
        negative_prompt = args.get(
            "negative_prompt",
            "blurry, smooth, realistic, photography, 3d"
        )
        
        # Enhance prompt for pixel art style
        enhanced_prompt = (
            f"pixel art, {prompt}, "
            "pixelated, retro game art, 8-bit style, sharp pixels, "
            "crisp edges, limited color palette"
        )
        
        logger.info(
            f"Generating pixel art: {prompt} at {size_desc}, steps={steps}"
        )
        
        try:
            # Call sdnext API
            response = await asyncio.to_thread(
                self._call_sdnext_api,
                enhanced_prompt,
                negative_prompt,
                width,
                height,
                steps,
            )
            
            # Extract base64 image
            if "images" not in response or not response["images"]:
                raise ValueError("No images returned from sdnext")
            
            image_b64 = response["images"][0]
            
            # Decode and re-encode to ensure proper format
            image_data = base64.b64decode(image_b64)
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to PNG if not already
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            final_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            return [
                TextContent(
                    type="text",
                    text=f"Generated pixel art: '{prompt}' at {size_desc}",
                ),
                ImageContent(
                    type="image",
                    data=final_b64,
                    mimeType="image/png",
                ),
            ]
            
        except requests.exceptions.ConnectionError:
            error_msg = (
                f"Failed to connect to sdnext at {self.sdnext_url}. "
                "Please ensure sdnext is running."
            )
            logger.error(error_msg)
            return [TextContent(type="text", text=f"Error: {error_msg}")]
            
        except Exception as e:
            error_msg = f"Error generating pixel art: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return [TextContent(type="text", text=f"Error: {error_msg}")]

    def _call_sdnext_api(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        steps: int,
    ) -> dict:
        """Call the sdnext txt2img API.
        
        Args:
            prompt: Enhanced prompt
            negative_prompt: Things to avoid
            width: Image width
            height: Image height
            steps: Number of diffusion steps
            
        Returns:
            API response dictionary
        """
        url = f"{self.sdnext_url}/sdapi/v1/txt2img"
        
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": steps,
            "width": width,
            "height": height,
            "sampler_name": "Euler a",  # Good for pixel art
            "cfg_scale": 7.0,
        }
        
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        return response.json()

    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options(),
            )


def main():
    """Main entry point."""
    # Allow customizing sdnext URL via environment variable
    sdnext_url = os.getenv("SDNEXT_URL", DEFAULT_SDNEXT_URL)
    
    server = PixelFriendServer(sdnext_url)
    asyncio.run(server.run())


if __name__ == "__main__":
    main()
