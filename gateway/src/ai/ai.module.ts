/**
 * AI Module
 * Módulo de inteligencia artificial que integra Gemini y MCP
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiController } from "./ai.controller";
import { GeminiService, McpClientService } from "./services";

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [GeminiService, McpClientService],
  exports: [GeminiService, McpClientService],
})
export class AiModule {}
