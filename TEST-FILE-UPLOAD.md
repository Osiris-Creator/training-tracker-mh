# Test File Upload Feature (Local)

## 1. Setup Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up and get your credentials:
   - Cloud Name
   - API Key
   - API Secret

## 2. Add to backend/.env
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 3. Start Backend
```bash
cd backend
npm start
```

## 4. Start Frontend
```bash
cd frontend
npm start
```

## 5. Test Upload
1. Go to http://localhost:3000/training-form
2. Fill in the training form
3. Click "Choose File" in Attachment section
4. Upload a test image (JPG/PNG) or document (PDF/DOC)
5. See preview before submit
6. Click Submit
7. Check Cloudinary dashboard to see uploaded file

## 6. Supported Files
- Images: .jpg, .jpeg, .png
- Documents: .pdf, .doc, .docx
- Max size: 5MB

## 7. Deploy to Production
After testing locally, deploy to Render:

1. Add environment variables in Render Dashboard:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY  
   - CLOUDINARY_API_SECRET

2. Run migration:
   ```bash
   DATABASE_URL=<render_postgres_url> node add-attachment-column.js
   ```

3. Commit and push to trigger auto-deploy
