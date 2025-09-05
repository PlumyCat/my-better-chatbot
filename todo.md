# Better Chatbot - TODO

## 🎯 Current Sprint

### File Attachment Feature
- [ ] **Backend Implementation**
  - [ ] Create `/api/upload` endpoint with multer
  - [ ] Set up local file storage directory
  - [ ] Add file validation (types, size limits)
  - [ ] Create attachments table in database
  - [ ] Add attachment association to messages

- [ ] **Frontend Implementation**  
  - [ ] Add file picker to chat input component
  - [ ] Display file attachments in messages
  - [ ] Add upload progress indicator
  - [ ] Handle upload errors gracefully
  - [ ] Preview attachments (images, PDFs)

- [ ] **Testing**
  - [ ] Test file upload endpoint
  - [ ] Test file size limits
  - [ ] Test file type validation
  - [ ] Integration tests with chat flow

### MCP SharePoint/OneDrive Integration
- [ ] **Setup**
  - [ ] Install SharePoint MCP server
  - [ ] Configure OAuth2 authentication
  - [ ] Set up environment variables

- [ ] **Implementation**
  - [ ] Add file browser component
  - [ ] Connect to SharePoint API
  - [ ] Link SharePoint files to messages
  - [ ] Handle authentication flow

- [ ] **Testing**
  - [ ] Test SharePoint connection
  - [ ] Test file retrieval
  - [ ] Test permission handling

## 🔧 Technical Debt
- [ ] Add comprehensive error handling
- [ ] Improve TypeScript types in shared module
- [ ] Add logging system
- [ ] Performance optimization for large conversations

## 🚀 Future Features
- [ ] File preview improvements (Office docs, PDFs)
- [ ] Drag-and-drop file upload
- [ ] Multiple file selection
- [ ] File compression for storage
- [ ] Cloud storage migration (S3/Azure)
- [ ] File sharing between users
- [ ] File version history

## 🐛 Known Issues
- [ ] Large file uploads may timeout
- [ ] SharePoint auth token refresh needed
- [ ] File cleanup job needed for orphaned uploads

## 📝 Documentation
- [ ] API documentation for upload endpoint
- [ ] SharePoint setup guide
- [ ] File storage architecture decision

## ✅ Completed
- ✅ Project structure setup
- ✅ Basic chat functionality
- ✅ Multi-provider support
- ✅ Authentication system