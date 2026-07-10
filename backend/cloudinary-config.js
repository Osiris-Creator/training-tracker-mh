const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine resource type based on file type
    const isImage = file.mimetype.startsWith('image/');

    return {
      folder: 'training-attachments',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      resource_type: isImage ? 'image' : 'raw', // Use 'raw' for non-images
      access_mode: 'public',
      type: 'upload' // Ensure it's set to 'upload' not 'private'
    };
  }
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };
