# @cobbl-ai/sdk

The official TypeScript/JavaScript SDK for [Cobbl](https://cobbl.ai) - a feedback-driven PromptOps platform for LLM applications.

[![npm version](https://img.shields.io/npm/v/@cobble-ai/sdk)](https://www.npmjs.com/package/@cobbl-ai/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Simple API** - Run prompts and collect feedback with just a few lines of code
- 🔒 **Type-safe** - Full TypeScript support with comprehensive type definitions
- 🎯 **Framework agnostic** - Works with Node.js, Next.js, Express, and any JavaScript framework
- 📦 **Zero config** - Works out of the box with sensible defaults
- 🌐 **Cross-platform** - Supports both CommonJS and ES modules
- ⚡ **Optimized** - Minimal bundle size, tree-shakeable exports
- 🎯 **Namespaced exports** - Separate admin and public clients for different use cases

## Installation

```bash
# npm
npm install @cobbl-ai/sdk

# yarn
yarn add @cobbl-ai/sdk

# pnpm
pnpm add @cobbl-ai/sdk
```

## Quick Start

```typescript
// Admin operations (server-side)
import { CobblAdminClient } from '@cobbl-ai/sdk/admin'

const adminClient = new CobblAdminClient({
  apiKey: process.env.COBBL_API_KEY,
})

// Run a prompt
const result = await adminClient.runPrompt('sales_summary', {
  topic: 'Q4 Results',
  tone: 'friendly',
  audience: 'investors',
})

console.log(result.output) // AI-generated response
console.log(result.runId) // Save this to link feedback later

// Public operations (client-facing, no auth required)
import { CobblPublicClient } from '@cobbl-ai/sdk/public'

const publicClient = new CobblPublicClient()

// Create user feedback
await publicClient.createFeedback({
  runId: result.runId,
  helpful: 'not_helpful',
  userFeedback: 'The response was too formal and lengthy',
})
```

## Namespaced Imports

The SDK provides separate entry points for admin and public operations:

```typescript
// Admin client - for server-side operations
import { CobblAdminClient } from '@cobbl-ai/sdk/admin'

// Public client - for client-facing feedback operations
import { CobblPublicClient } from '@cobbl-ai/sdk/public'

// Or import both from main entry
import { CobblAdminClient, CobblPublicClient } from '@cobbl-ai/sdk'
```

## Configuration

### Initializing the Clients

```typescript
import { CobblAdminClient } from '@cobbl-ai/sdk/admin'
import { CobblPublicClient } from '@cobbl-ai/sdk/public'

// Production (uses default URL: https://api.cobbl.ai)
const adminClient = new CobblAdminClient({
  apiKey: 'your-api-key',
})

// Public client (no auth required)
const publicClient = new CobblPublicClient()

// Custom URL (e.g., local development)
const devAdminClient = new CobblAdminClient({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:5001/your-project-id/us-central1/externalApi',
})

const devPublicClient = new CobblPublicClient({
  baseUrl: 'http://localhost:5001/your-project-id/us-central1/externalApi',
})
```

### Configuration Options

**CobblAdminClient:**

| Option    | Type   | Required | Default                | Description          |
| --------- | ------ | -------- | ---------------------- | -------------------- |
| `apiKey`  | string | Yes      | -                      | Your Cobbl API key   |
| `baseUrl` | string | No       | `https://api.cobbl.ai` | Base URL for the API |

**CobblPublicClient:**

| Option    | Type   | Required | Default                | Description                                       |
| --------- | ------ | -------- | ---------------------- | ------------------------------------------------- |
| `baseUrl` | string | No       | `https://api.cobbl.ai` | Base URL for the API (no authentication required) |

### Environment Variables

We recommend storing your API key in environment variables:

```bash
# .env
COBBL_API_KEY=your_api_key_here
```

Then load it in your application:

```typescript
const adminClient = new CobblAdminClient({
  apiKey: process.env.COBBL_API_KEY,
})
```

## API Reference

### CobblAdminClient

#### `runPrompt(promptSlug, input)`

Execute a prompt with the given input variables.

**Parameters:**

- `promptSlug` (string): The unique slug identifier for the prompt
- `input` (PromptInput): Input variables to populate the prompt template

**Returns:** `Promise<RunPromptResponse>`

**Response:**

```typescript
{
  runId: string // Unique ID for this run - use for feedback
  output: string // AI-generated response
  tokenUsage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  renderedPrompt: string // The prompt sent to the LLM
  promptVersion: {
    // Metadata about the prompt version used
    id: string
    versionNumber: number
    template: string
    variables: Array<{
      key: string
      type: string
      required: boolean
    }>
    provider: 'openai' | 'anthropic' | 'google'
    model: string
    // ... more fields
  }
}
```

**Example:**

```typescript
const result = await adminClient.runPrompt('customer_email', {
  customerName: 'John Doe',
  issue: 'login_problem',
  urgency: 'high',
})

console.log(result.output)
// => "Dear John Doe, We understand you're experiencing login issues..."
```

### CobblPublicClient

The public client is designed for end-user feedback submission and **does not require authentication**. This makes it safe to use in client-side applications like React, Vue, or vanilla JavaScript.

#### `createFeedback(feedback)`

Create user feedback for a prompt run.

**Parameters:**

- `feedback` (CreateFeedbackRequest):
  - `runId` (string): The run ID from a previous `runPrompt` call
  - `helpful` ('helpful' | 'not_helpful'): Whether the output was helpful (optional)
  - `userFeedback` (string): Detailed feedback message (optional)

At least one of `helpful` or `userFeedback` is required.

**Returns:** `Promise<CreateFeedbackResponse>`

**Response:**

```typescript
{
  id: string // Unique ID for the feedback item
  message: string // Success message
}
```

**Example:**

```typescript
await publicClient.createFeedback({
  runId: result.runId,
  helpful: 'not_helpful',
  userFeedback: 'The tone was too casual for a professional email',
})
```

#### `updateFeedback(id, update)`

Update existing feedback with additional data.

**Parameters:**

- `id` (string): The feedback ID from `createFeedback`
- `update` (UpdateFeedbackRequest):
  - `helpful` ('helpful' | 'not_helpful'): Whether the output was helpful (optional)
  - `userFeedback` (string): Detailed feedback message (optional)

**Returns:** `Promise<UpdateFeedbackResponse>`

**Example:**

```typescript
// First create feedback with just a rating
const { id } = await publicClient.createFeedback({
  runId: result.runId,
  helpful: 'not_helpful',
})

// Later update with detailed feedback
await publicClient.updateFeedback(id, {
  userFeedback: 'The response was too verbose and missed key points.',
})
```

## Advanced Usage

### Error Handling

The SDK throws `CobblError` for all error cases. You can catch and handle these errors:

```typescript
import { CobblAdminClient, CobblError } from '@cobbl-ai/sdk/admin'

try {
  const result = await adminClient.runPrompt('my-prompt', { topic: 'test' })
} catch (error) {
  if (error instanceof CobblError) {
    console.error(`Error [${error.code}]: ${error.message}`)

    // Handle specific error types
    switch (error.code) {
      case 'UNAUTHORIZED':
        console.error('Invalid API key')
        break
      case 'FORBIDDEN':
        console.error('Prompt is disabled or forbidden')
        break
      case 'NOT_FOUND':
        console.error('Prompt not found')
        break
      case 'ARCHIVED':
        console.error('Prompt has been archived')
        break
      case 'INVALID_REQUEST':
        console.error('Invalid request:', error.details)
        break
      case 'RATE_LIMIT_EXCEEDED':
        console.error('Rate limit exceeded, try again later')
        break
      default:
        console.error('Unexpected error:', error)
    }
  } else {
    console.error('Unknown error:', error)
  }
}
```

**Error Codes:**

- `INVALID_CONFIG` - Invalid SDK configuration
- `INVALID_REQUEST` - Malformed request (e.g., missing required fields)
- `UNAUTHORIZED` - Invalid or missing API key
- `FORBIDDEN` - Prompt is disabled or access is forbidden
- `NOT_FOUND` - Resource not found (e.g., prompt doesn't exist)
- `ARCHIVED` - Prompt has been archived and is no longer available
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVER_ERROR` - Server-side error
- `NETWORK_ERROR` - Network connectivity issue
- `API_ERROR` - Other API errors

### TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type {
  PromptInput,
  RunPromptResponse,
  CreateFeedbackRequest,
  TokenUsage,
} from '@cobbl-ai/sdk'

// Type-safe prompt inputs
const input: PromptInput = {
  topic: 'AI Safety',
  tone: 'professional',
}

// Type-safe response handling
const result: RunPromptResponse = await adminClient.runPrompt(
  'blog_post',
  input
)

// Access token usage
const tokens: TokenUsage = result.tokenUsage
console.log(`Used ${tokens.totalTokens} tokens`)
```

### Framework Examples

#### Express.js

```typescript
import express from 'express'
import { CobblAdminClient } from '@cobbl-ai/sdk/admin'
import { CobblPublicClient } from '@cobbl-ai/sdk/public'

const app = express()
const adminClient = new CobblAdminClient({
  apiKey: process.env.COBBL_API_KEY,
})
const publicClient = new CobblPublicClient({
  apiKey: process.env.COBBL_API_KEY,
})

app.post('/api/generate', async (req, res) => {
  try {
    const result = await adminClient.runPrompt('content_generator', req.body)
    res.json({
      output: result.output,
      runId: result.runId,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate content' })
  }
})

app.post('/api/feedback', async (req, res) => {
  try {
    await publicClient.createFeedback(req.body)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feedback' })
  }
})
```

#### Next.js API Routes

```typescript
// app/api/generate/route.ts
import { CobblAdminClient } from '@cobbl-ai/sdk/admin'
import { NextResponse } from 'next/server'

const adminClient = new CobblAdminClient({
  apiKey: process.env.COBBL_API_KEY!,
})

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const result = await adminClient.runPrompt('summarizer', {
      text: body.text,
      length: 'short',
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
```

#### React (Client-Side via API)

```typescript
'use client'

import { useState } from 'react'

export default function FeedbackForm({ runId }: { runId: string }) {
  const [feedback, setFeedback] = useState('')
  const [helpful, setHelpful] = useState<'helpful' | 'not_helpful'>('helpful')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Call your API route that uses the SDK
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId,
        helpful,
        userFeedback: feedback
      })
    })

    setFeedback('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          <input
            type="radio"
            value="helpful"
            checked={helpful === 'helpful'}
            onChange={(e) => setHelpful(e.target.value as 'helpful')}
          />
          Helpful
        </label>
        <label>
          <input
            type="radio"
            value="not_helpful"
            checked={helpful === 'not_helpful'}
            onChange={(e) => setHelpful(e.target.value as 'not_helpful')}
          />
          Not Helpful
        </label>
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Tell us what could be improved..."
      />

      <button type="submit">Submit Feedback</button>
    </form>
  )
}
```

## Best Practices

### 1. Store Run IDs for Feedback

Always save the `runId` returned from `runPrompt()` so users can provide feedback later:

```typescript
// Store in database with your application data
const result = await adminClient.runPrompt('recommendation', { userId: '123' })

await db.recommendations.create({
  userId: '123',
  content: result.output,
  promptRunId: result.runId, // ← Save this!
})
```

### 2. Handle Errors Gracefully

Always wrap SDK calls in try-catch blocks and provide fallback behavior:

```typescript
try {
  const result = await adminClient.runPrompt('greeting', { name: userName })
  return result.output
} catch (error) {
  // Log for debugging
  console.error('Prompt failed:', error)

  // Return fallback content
  return `Hello, ${userName}!`
}
```

### 3. Use Environment-Specific API Keys

Use different API keys for development, staging, and production:

```typescript
const adminClient = new CobblAdminClient({
  apiKey: process.env.COBBL_API_KEY,
})
```

### 4. Implement Rate Limiting

Add rate limiting on your application side to avoid hitting API limits:

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

app.use('/api/generate', limiter)
```

## Development

### Building from Source

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm build

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### Project Structure

```
sdk/
├── src/
│   ├── admin.ts        # Admin API client
│   ├── public.ts       # Public API client
│   ├── errors.ts       # Error classes
│   ├── types.ts        # Type definitions
│   └── index.ts        # Public exports
├── dist/               # Compiled output (created by build)
│   ├── index.js        # CommonJS bundle (main)
│   ├── index.mjs       # ES modules bundle (main)
│   ├── admin.js        # CommonJS bundle (admin)
│   ├── admin.mjs       # ES modules bundle (admin)
│   ├── public.js       # CommonJS bundle (public)
│   ├── public.mjs      # ES modules bundle (public)
│   └── *.d.ts          # TypeScript declarations
├── tsup.config.ts      # Build configuration
├── package.json
└── README.md
```

### Build System

This SDK uses [tsup](https://tsup.egoist.dev/) for building, which provides:

- **Zero config bundling** - Works out of the box
- **Dual package support** - Generates both CJS and ESM
- **Type bundling** - Inlines all type dependencies
- **Tree-shaking** - Removes unused code
- **Source maps** - For debugging

### Publishing to npm

Before publishing, make sure to:

1. Update the version in `package.json`
2. Update `CHANGELOG.md`
3. Build and test the package

```bash
# Test the package locally
pnpm pack
# This creates @cobbl-ai-sdk-0.1.0.tgz that you can test

# Publish to npm (requires npm login)
pnpm publish --access public

# Or publish with tag (for beta/alpha releases)
pnpm publish --tag beta --access public
```

## Support

- 📧 Email: support@cobbl.ai
- 🐛 Issues: [GitHub Issues](https://github.com/cobbl-ai/sdk/issues)
- 📚 Documentation: [docs.cobbl.ai](https://docs.cobbl.ai)

## License

MIT © Cobbl
