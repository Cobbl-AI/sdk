# Changelog

All notable changes to the Cobbl SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-11-23

### Added

- Initial release of the Cobbl SDK
- `CobblAdminClient` class for admin operations (runPrompt)
- `CobblPublicClient` class for public operations (createFeedback, updateFeedback)
- Namespaced imports: `@cobbl-ai/sdk/admin` and `@cobbl-ai/sdk/public`
- `runPrompt()` method to execute prompts with variable substitution
- `createFeedback()` method to collect user feedback on prompt outputs
- `updateFeedback()` method to update existing feedback
- Full TypeScript support with comprehensive type definitions
- Custom `CobblError` class with specific error codes
- Support for both CommonJS and ES modules
- Comprehensive README with usage examples and best practices
- Basic usage examples in `examples/` directory

### Features

- 🚀 Simple, intuitive API
- 🔒 Type-safe with full TypeScript support
- 🎯 Framework agnostic (works with any JavaScript framework)
- 📦 Zero configuration required
- 🌐 Dual package (CommonJS + ESM)
- ⚡ Minimal bundle size with tree-shakeable exports

[0.1.0]: URL_TO_RELEASE
