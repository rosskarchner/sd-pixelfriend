#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration
const SDNEXT_URL = process.env.SDNEXT_URL || "http://127.0.0.1:7860";

// Pixel art dimension presets
const DIMENSION_PRESETS = {
  tiny: { width: 64, height: 64 },
  small: { width: 128, height: 128 },
  medium: { width: 256, height: 256 },
  large: { width: 512, height: 512 },
  wide: { width: 512, height: 256 },
  tall: { width: 256, height: 512 },
};

class SDPixelFriendServer {
  constructor() {
    this.server = new Server(
      {
        name: "sd-pixelfriend",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_pixel_art",
          description:
            "Generate pixel art using SDNext. Creates retro-style pixel art images at various dimensions and bit styles (8bit, 16bit, 32bit). " +
            "The prompt will be automatically enhanced with pixel art keywords for best results.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description:
                  "Description of the pixel art to generate (e.g., 'a dragon', 'a castle', 'a forest scene')",
              },
              bit_style: {
                type: "string",
                enum: ["8bit", "16bit", "32bit"],
                description:
                  "Bit depth style: 8bit (NES/Game Boy era), 16bit (SNES/Genesis era), 32bit (PlayStation/Saturn era)",
                default: "8bit",
              },
              size: {
                type: "string",
                enum: ["tiny", "small", "medium", "large", "wide", "tall", "custom"],
                description:
                  "Preset size: tiny (64x64), small (128x128), medium (256x256), large (512x512), " +
                  "wide (512x256), tall (256x512), or custom (requires width and height)",
                default: "medium",
              },
              width: {
                type: "number",
                description: "Custom width in pixels (only used if size is 'custom')",
              },
              height: {
                type: "number",
                description: "Custom height in pixels (only used if size is 'custom')",
              },
              negative_prompt: {
                type: "string",
                description:
                  "Things to avoid in the generation (default includes blur, realistic, detailed)",
                default:
                  "blurry, blur, realistic, photorealistic, detailed, high resolution, smooth, anti-aliased",
              },
              steps: {
                type: "number",
                description: "Number of sampling steps (default: 20)",
                default: 20,
              },
              cfg_scale: {
                type: "number",
                description: "CFG scale for prompt adherence (default: 7.0)",
                default: 7.0,
              },
              seed: {
                type: "number",
                description: "Random seed for reproducibility (default: -1 for random)",
                default: -1,
              },
            },
            required: ["prompt"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "generate_pixel_art") {
        return await this.handleGeneratePixelArt(request.params.arguments);
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async handleGeneratePixelArt(args) {
    const {
      prompt,
      bit_style = "8bit",
      size = "medium",
      width: customWidth,
      height: customHeight,
      negative_prompt = "blurry, blur, realistic, photorealistic, detailed, high resolution, smooth, anti-aliased",
      steps = 20,
      cfg_scale = 7.0,
      seed = -1,
    } = args;

    // Determine dimensions
    let width, height;
    if (size === "custom") {
      if (!customWidth || !customHeight) {
        throw new Error(
          "Custom size requires both width and height parameters"
        );
      }
      width = customWidth;
      height = customHeight;
    } else {
      const preset = DIMENSION_PRESETS[size];
      if (!preset) {
        throw new Error(
          `Invalid size preset: ${size}. Use tiny, small, medium, large, wide, tall, or custom`
        );
      }
      width = preset.width;
      height = preset.height;
    }

    // Enhance prompt for pixel art with appropriate bit style
    const enhancedPrompt = `pixel art, ${prompt}, ${bit_style}, retro, pixelated, low resolution`;

    // Prepare request for SDNext
    const payload = {
      prompt: enhancedPrompt,
      negative_prompt: negative_prompt,
      steps: steps,
      cfg_scale: cfg_scale,
      width: width,
      height: height,
      seed: seed,
      sampler_name: "Euler a",
      save_images: false,
    };

    try {
      // Call SDNext API
      const response = await fetch(`${SDNEXT_URL}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SDNext API error (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();

      if (!result.images || result.images.length === 0) {
        throw new Error("No images generated by SDNext");
      }

      // Get the first generated image (base64)
      const imageBase64 = result.images[0];
      const imageInfo = result.info ? JSON.parse(result.info) : {};

      return {
        content: [
          {
            type: "text",
            text: `Successfully generated ${width}x${height} pixel art (${bit_style} style)!\n\n` +
              `Prompt: ${prompt}\n` +
              `Bit Style: ${bit_style}\n` +
              `Enhanced prompt: ${enhancedPrompt}\n` +
              `Negative prompt: ${negative_prompt}\n` +
              `Steps: ${steps}\n` +
              `CFG Scale: ${cfg_scale}\n` +
              `Seed: ${imageInfo.seed || seed}\n\n` +
              `Image data is attached below.`,
          },
          {
            type: "image",
            data: imageBase64,
            mimeType: "image/png",
          },
        ],
      };
    } catch (error) {
      if (error.cause?.code === "ECONNREFUSED") {
        return {
          content: [
            {
              type: "text",
              text: `Failed to connect to SDNext at ${SDNEXT_URL}.\n\n` +
                `Please ensure:\n` +
                `1. SDNext is running\n` +
                `2. The API server is enabled\n` +
                `3. The URL is correct (set SDNEXT_URL environment variable if different)\n\n` +
                `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Error generating pixel art: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("SD PixelFriend MCP Server running on stdio");
    console.error(`Connecting to SDNext at: ${SDNEXT_URL}`);
  }
}

// Start the server
const server = new SDPixelFriendServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
