# Better Chatbot - Claude Code Configuration

## 🎯 Project Goals
Build a multi-provider chatbot interface with file attachment support and SharePoint/OneDrive integration via MCP.

## 🚫 CRITICAL RULES - DO NOT BREAK
1. **DO NOT CHANGE THE DATABASE STRUCTURE** - Keep existing SQLite schema intact
2. **INCREMENTAL CHANGES ONLY** - Small, testable modifications
3. **TEST BEFORE COMMIT** - Run existing tests before any database or core changes
4. **PRESERVE WORKING FEATURES** - Never break existing functionality

## 📁 Project Structure
```
better-chatbot/
├── backend/          # Node.js/Express API
│   ├── db/          # SQLite database (DO NOT MODIFY SCHEMA)
│   ├── routes/      # API endpoints
│   └── services/    # Business logic
├── frontend/        # React application
│   ├── src/
│   │   ├── components/
│   │   └── services/
└── shared/          # Shared types and utilities
```

## 🛠 Key Commands
```bash
# Installation
pnpm install          # Install all dependencies

# Development
pnpm dev             # Start both frontend and backend
pnpm dev:backend     # Backend only (port 3001)
pnpm dev:frontend    # Frontend only (port 5173)

# Testing
pnpm test            # Run all tests
pnpm test:backend    # Backend tests only
pnpm test:frontend   # Frontend tests only

# Database
pnpm db:status       # Check current database state
pnpm db:backup       # Backup before changes
```

## 🎯 Current Feature Implementation

### File Attachment Feature
**Goal**: Add file upload/attachment to chat conversations
**Approach**:
1. Frontend: Add file picker to chat input
2. Backend: Create `/api/upload` endpoint with multer
3. Storage: Local storage first, then cloud integration
4. Database: Add `attachments` table (separate from messages)
5. UI: Display attachments in message bubbles

### MCP SharePoint Integration
**Goal**: Access OneDrive/SharePoint files via MCP
**Approach**:
1. Install SharePoint MCP server
2. Configure authentication (OAuth2)
3. Add file browser component
4. Link selected files to messages

## ⚠️ Danger Zones - NEVER TOUCH
- `/backend/db/migrations/` - Existing migrations
- `/backend/db/schema.sql` - Core database schema
- Authentication flow - Working as-is
- Provider integrations - Already functional

## 📋 Implementation Checklist
- [ ] Create backup of current working state
- [ ] Add file upload UI component
- [ ] Implement backend upload endpoint
- [ ] Create attachments table (NEW table, don't modify existing)
- [ ] Test file upload independently
- [ ] Integrate MCP SharePoint
- [ ] Test SharePoint connection
- [ ] Link files to messages
- [ ] Full integration testing

## 🔒 Security Considerations
- Validate file types (whitelist approach)
- Limit file sizes (max 10MB initially)
- Scan for malware (later phase)
- Secure file storage location
- Proper access controls

## 📚 References
- MCP SharePoint: https://github.com/modelcontextprotocol/servers
- Multer docs: https://github.com/expressjs/multer
- SQLite best practices: Keep schema simple

## Import Additional Context
@backend/package.json
@frontend/package.json
@.env.example